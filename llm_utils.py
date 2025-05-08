import os
import requests
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from langchain.output_parsers import PydanticOutputParser

# Ensure API key is set
from local_settings import OPENAI_API_KEY_GPT4

class TopicContent(BaseModel):
    importance: str = Field(description="Why this topic is important for autistic individuals in corporate settings")
    challenges: List[str] = Field(description="Key challenges autistic individuals might face in this area")
    strategies: List[str] = Field(description="Specific strategies and solutions")
    examples: List[str] = Field(description="Clear examples and scenarios")
    action_steps: List[str] = Field(description="Actionable steps for improvement")
    
    @field_validator("challenges", "strategies", "examples", "action_steps")
    @classmethod
    def list_must_not_be_empty(cls, v):
        if not v:
            raise ValueError("List cannot be empty")
        return v

class SubtopicContent(BaseModel):
    relation_to_parent: str = Field(description="How this specific aspect relates to the broader parent topic")
    challenges: List[str] = Field(description="Particular challenges autistic individuals might face with this subtopic")
    strategies: List[str] = Field(description="Specific strategies and techniques for mastering this aspect")
    examples: List[str] = Field(description="Real-world examples and scenarios")
    action_steps: List[str] = Field(description="Step-by-step guidance for improvement")
    
    @field_validator("challenges", "strategies", "examples", "action_steps")
    @classmethod
    def list_must_not_be_empty(cls, v):
        if not v:
            raise ValueError("List cannot be empty")
        return v

def _llm(messages, model_name='gpt-4o-mini', temp=0):
    """Make an LLM API call"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {OPENAI_API_KEY_GPT4}'
    }
    
    data = {
        'model': model_name,
        'messages': messages,
        'max_tokens': 8000,
        'top_p': 1,
        'temperature': temp
    }
    
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        return response.json()['choices'][0]['message']['content']
    else:
        print(f'LLM Error: {response.status_code} - {response.json()}')
        return None

def generate_topic_prompt(topic_title: str, format_instructions: str) -> str:
    """Generate a prompt for a main topic."""
    return f"""Generate structured information about the topic.

{format_instructions}

Topic: {topic_title}

Focus on:
1. The importance of this topic for autistic individuals in corporate settings
2. Key challenges autistic individuals might face in this area
3. Specific strategies and solutions
4. Clear examples and scenarios
5. Actionable steps for improvement

Ensure each section is detailed and specific to the needs of autistic individuals in corporate environments."""

def generate_subtopic_prompt(subtopic_title: str, parent_title: str, format_instructions: str) -> str:
    """Generate a prompt for a subtopic."""
    return f"""Generate structured information about the subtopic within its parent topic.

{format_instructions}

Parent Topic: {parent_title}
Subtopic: {subtopic_title}

Focus on:
1. How this specific aspect relates to the parent topic
2. Particular challenges autistic individuals might face
3. Specific strategies and techniques
4. Real-world examples and scenarios
5. Step-by-step guidance

Ensure each section is detailed and specific to the needs of autistic individuals in corporate environments."""

def get_parser_and_instructions(is_topic: bool) -> tuple[PydanticOutputParser, str]:
    """Get the appropriate parser and format instructions based on content type."""
    parser = PydanticOutputParser(
        pydantic_object=TopicContent if is_topic else SubtopicContent
    )
    return parser, parser.get_format_instructions()

def get_llm_response(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Get a response from the LLM using the REST API.
    
    Args:
        prompt (str): The main prompt to send to the LLM
        system_prompt (Optional[str]): Optional system prompt to set context
        
    Returns:
        str: The LLM's response
    """
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    response = _llm(messages, model_name='gpt-4o-mini', temp=0.7)
    if response is None:
        raise Exception("Failed to get LLM response")
    return response 