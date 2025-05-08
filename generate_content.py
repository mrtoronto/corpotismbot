import json
import os
import time
from typing import Dict, List, Optional
from llm_utils import (
    get_llm_response, 
    get_parser_and_instructions,
    generate_topic_prompt,
    generate_subtopic_prompt
)

KNOWLEDGE_BASE_FILE = "knowledge_base.json"

def load_knowledge_base() -> List[Dict]:
    """Load the knowledge base from file."""
    with open(KNOWLEDGE_BASE_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_knowledge_base(knowledge_base: List[Dict]):
    """Save the knowledge base to file."""
    with open(KNOWLEDGE_BASE_FILE, 'w', encoding='utf-8') as f:
        json.dump(knowledge_base, f, indent=2)

def find_node_by_id(knowledge_base: List[Dict], node_id: str) -> Optional[Dict]:
    """Find a node in the knowledge base by its ID."""
    for node in knowledge_base:
        if node["id"] == node_id:
            return node
    return None

def format_content(content_model: Dict) -> str:
    """Format the structured content into a readable string."""
    if "importance" in content_model:  # Topic content
        challenges = "".join([f"- {challenge}\n" for challenge in content_model['challenges']])
        strategies = "".join([f"- {strategy}\n" for strategy in content_model['strategies']])
        examples = "".join([f"- {example}\n" for example in content_model['examples']])
        action_steps = "".join([f"- {step}\n" for step in content_model['action_steps']])
        
        return f"""Importance:
{content_model['importance']}

Key Challenges:
{challenges}
Strategies:
{strategies}
Examples:
{examples}
Action Steps:
{action_steps}"""
    else:  # Subtopic content
        challenges = "".join([f"- {challenge}\n" for challenge in content_model['challenges']])
        strategies = "".join([f"- {strategy}\n" for strategy in content_model['strategies']])
        examples = "".join([f"- {example}\n" for example in content_model['examples']])
        action_steps = "".join([f"- {step}\n" for step in content_model['action_steps']])
        
        return f"""Relation to Parent Topic:
{content_model['relation_to_parent']}

Key Challenges:
{challenges}
Strategies:
{strategies}
Examples:
{examples}
Action Steps:
{action_steps}"""

def main():
    print("Loading knowledge base...")
    knowledge_base = load_knowledge_base()
    
    # First, process all main topics
    print("\nProcessing main topics...")
    topics = [node for node in knowledge_base if node["category"] == "TOPIC"]
    for topic in topics:
        if topic["body"]:
            print(f"Skipping topic '{topic['title']}' - already has content")
            continue
            
        print(f"\nGenerating content for topic: {topic['title']}")
        try:
            parser, format_instructions = get_parser_and_instructions(is_topic=True)
            prompt = generate_topic_prompt(topic['title'], format_instructions)
            response = get_llm_response(prompt)
            
            parsed_content = parser.parse(response)
            formatted_content = format_content(parsed_content.dict())
            
            topic["body"] = formatted_content
            topic["metadata"] = parsed_content.dict()  # Store structured data for future use
            
            save_knowledge_base(knowledge_base)
            print(f"Content generated and saved for '{topic['title']}'")
            time.sleep(1)  # Rate limiting
        except Exception as e:
            print(f"Error generating content for '{topic['title']}': {e}")
    
    # Then, process all subtopics
    print("\nProcessing subtopics...")
    subtopics = [node for node in knowledge_base if node["category"] == "SUBTOPIC"]
    for subtopic in subtopics:
        if subtopic["body"]:
            print(f"Skipping subtopic '{subtopic['title']}' - already has content")
            continue
            
        parent_topic = find_node_by_id(knowledge_base, subtopic["parent_id"])
        if not parent_topic:
            print(f"Warning: Could not find parent topic for '{subtopic['title']}'")
            continue
            
        print(f"\nGenerating content for subtopic: {subtopic['title']} (under {parent_topic['title']})")
        try:
            parser, format_instructions = get_parser_and_instructions(is_topic=False)
            prompt = generate_subtopic_prompt(subtopic['title'], parent_topic['title'], format_instructions)
            response = get_llm_response(prompt)
            
            parsed_content = parser.parse(response)
            formatted_content = format_content(parsed_content.dict())
            
            subtopic["body"] = formatted_content
            subtopic["metadata"] = parsed_content.dict()  # Store structured data for future use
            
            save_knowledge_base(knowledge_base)
            print(f"Content generated and saved for '{subtopic['title']}'")
            time.sleep(1)  # Rate limiting
        except Exception as e:
            print(f"Error generating content for '{subtopic['title']}': {e}")
    
    print("\nContent generation complete!")

if __name__ == "__main__":
    main() 