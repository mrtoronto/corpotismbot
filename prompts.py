import json

def get_autism_chat_assistant_prompt(context: str = "") -> str:
    """
    Returns the system prompt for the autism-focused chat assistant.
    
    Args:
        context (str): Additional context from the knowledge base to inform responses
        
    Returns:
        str: The formatted system prompt
    """
    return f'You are a helpful assistant with knowledge about autism in corporate settings. Use this context to inform your responses:\n\n{context}'

def get_content_generation_prompt() -> str:
    """
    Returns the system prompt for the content generation assistant.
    
    Returns:
        str: The system prompt
    """
    return '''You are a helpful assistant specializing in autism in corporate settings. Your task is to generate concise, focused content that maintains consistent length and structure with existing content.

Key guidelines:
- Keep responses brief and to the point
- Match the length of the current content
- Maintain consistent formatting
- For lists, provide exactly the same number of items as the current content
- If no current content exists, provide 3-4 items for lists'''

def get_field_specific_prompt(field: str, current_value: str, context: dict, user_instructions: str = "") -> str:
    """
    Returns a field-specific prompt with current value and context.
    
    Args:
        field (str): The field to generate content for
        current_value (str): The current value of the field, if any
        context (dict): The full topic/subtopic context
        user_instructions (str): Optional user-provided instructions for the generation
        
    Returns:
        str: The formatted prompt
    """
    base_prompts = {
        'title': {
            'instruction': "Generate a clear and concise title for a topic about autism in corporate settings.",
            'format': "Single line, 3-7 words"
        },
        'importance': {
            'instruction': "Generate a brief explanation of why this topic is important for understanding autism in corporate settings.",
            'format': "Single concise sentence"
        },
        'relation_to_parent': {
            'instruction': "Generate a brief explanation of how this subtopic relates to its parent topic in the context of autism in corporate settings.",
            'format': "Single concise sentence"
        },
        'challenges': {
            'instruction': "Generate key challenges related to this topic in corporate settings.",
            'format': "Bullet points, match number of current items"
        },
        'strategies': {
            'instruction': "Generate effective strategies to address this topic in corporate settings.",
            'format': "Bullet points, match number of current items"
        },
        'examples': {
            'instruction': "Generate concrete examples related to this topic in corporate settings.",
            'format': "Bullet points, match number of current items"
        },
        'action_steps': {
            'instruction': "Generate actionable steps to implement regarding this topic in corporate settings.",
            'format': "Bullet points, match number of current items"
        }
    }

    prompt = f"""Field to generate: {field}

Current value:
{current_value if current_value else 'None'}

Topic context:
{json.dumps(context, indent=2)}

Instruction:
{base_prompts[field]['instruction']}

Required format:
{base_prompts[field]['format']}"""

    if user_instructions:
        prompt += f"\n\nAdditional instructions from user:\n{user_instructions}"

    prompt += "\n\nGenerate new content that maintains similar length and structure to the current value (if one exists)."

    return prompt

def get_field_specific_prompts() -> dict:
    """
    Returns a dictionary of base prompts for content generation.
    This is kept for backwards compatibility but get_field_specific_prompt() 
    is preferred for new code.
    
    Returns:
        dict: Mapping of field names to their corresponding prompts
    """
    return {
        'title': "Generate a clear and concise title for a topic about autism in corporate settings.",
        'importance': "Generate a brief explanation of why this topic is important for understanding autism in corporate settings.",
        'relation_to_parent': "Generate a brief explanation of how this subtopic relates to its parent topic in the context of autism in corporate settings.",
        'challenges': "Generate 3-5 key challenges related to this topic in corporate settings.",
        'strategies': "Generate 3-5 effective strategies to address this topic in corporate settings.",
        'examples': "Generate 3-5 concrete examples related to this topic in corporate settings.",
        'action_steps': "Generate 3-5 actionable steps to implement regarding this topic in corporate settings."
    } 