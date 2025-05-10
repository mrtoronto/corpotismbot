from flask import Flask, render_template, jsonify, request, session, redirect, url_for, flash
import json
import os
import httpx
from functools import wraps
from config import SECRET_KEY, ADMIN_PASSWORD
from prompts import get_autism_chat_assistant_prompt, get_content_generation_prompt, get_field_specific_prompt

app = Flask(__name__)
app.secret_key = SECRET_KEY

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def load_knowledge_base():
    with open('knowledge_base.json', 'r') as f:
        return json.load(f)

def find_relevant_entries(message, knowledge_base):
    # Extract keywords from message and find matching entries
    keywords = [word for word in message.lower().split() 
               if len(word) > 3 and word not in ['what', 'when', 'where', 'why', 'how', 'can', 'will', 'should']]
    
    return [entry for entry in knowledge_base 
            if any(keyword in entry['title'].lower() for keyword in keywords)][:3]

def prepare_context(entries):
    context = []
    for entry in entries:
        metadata = entry.get('metadata', {})
        context_entry = f"""
Topic: {entry['title']}
{f"Importance: {metadata.get('importance', 'N/A')}" if entry['category'] == 'TOPIC' else f"Relation to Parent: {metadata.get('relation_to_parent', 'N/A')}"}
Challenges:
{chr(10).join(f"- {c}" for c in metadata.get('challenges', []))}
Strategies:
{chr(10).join(f"- {s}" for s in metadata.get('strategies', []))}
Examples:
{chr(10).join(f"- {e}" for e in metadata.get('examples', []))}
Action Steps:
{chr(10).join(f"- {a}" for a in metadata.get('action_steps', []))}
        """.strip()
        context.append(context_entry)
    return "\n\n".join(context)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/knowledge')
def knowledge():
    return render_template('knowledge.html')

@app.route('/todo')
def todo():
    return render_template('todo.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == ADMIN_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            flash('Invalid password')
            return redirect(url_for('login'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('index'))

@app.route('/api/knowledge', methods=['GET', 'POST', 'PUT'])
def get_knowledge():
    try:
        if request.method == 'GET':
            kb_data = load_knowledge_base()
            return jsonify(kb_data)
        elif request.method in ['POST', 'PUT']:
            # Only allow logged in users to modify the knowledge base
            if not session.get('logged_in'):
                return jsonify({"error": "Unauthorized"}), 401
            
            data = request.json
            with open('knowledge_base.json', 'w') as f:
                json.dump(data, f, indent=2)
            return jsonify({"message": "Knowledge base updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.json
        message = data.get('message')
        api_key = data.get('api_key')
        
        if not message or not api_key:
            return jsonify({"error": "Missing message or API key"}), 400

        # Find relevant knowledge base entries
        kb_data = load_knowledge_base()
        relevant_entries = find_relevant_entries(message, kb_data)
        context = prepare_context(relevant_entries)

        # Prepare the chat completion request
        with httpx.Client() as client:
            response = client.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'gpt-4o-mini',
                    'messages': [
                        {
                            'role': 'system',
                            'content': get_autism_chat_assistant_prompt(context)
                        },
                        {'role': 'user', 'content': message}
                    ]
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                return jsonify({"error": "Failed to get response from OpenAI"}), 500
                
            response_data = response.json()
            return jsonify(response_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/knowledge/edit/<topic_id>')
@login_required
def edit_knowledge_item(topic_id):
    try:
        kb_data = load_knowledge_base()
        topic = next((t for t in kb_data if t['id'] == topic_id), None)
        if not topic:
            flash('Topic not found')
            return redirect(url_for('knowledge'))
        return render_template('edit_knowledge.html', topic=topic)
    except Exception as e:
        flash('Error loading topic')
        return redirect(url_for('knowledge'))

@app.route('/api/generate', methods=['POST'])
@login_required
def generate_content():
    try:
        data = request.json
        field = data.get('field')  # Which field to generate (title, importance, challenges, etc.)
        context = data.get('context', {})  # Current topic data for context
        api_key = data.get('api_key')
        user_instructions = data.get('user_instructions', '')  # Optional user instructions

        if not field or not api_key:
            return jsonify({"error": "Missing required fields"}), 400

        # Get current value of the field
        current_value = context.get(field, "") if isinstance(context, dict) else ""
        if isinstance(current_value, list):
            current_value = "\n".join([f"- {item}" for item in current_value])

        # Generate the enhanced prompt with current value, context, and user instructions
        prompt = get_field_specific_prompt(field, current_value, context, user_instructions)

        # Call OpenAI API
        with httpx.Client() as client:
            response = client.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'gpt-4o-mini',
                    'messages': [
                        {'role': 'system', 'content': get_content_generation_prompt()},
                        {'role': 'user', 'content': prompt}
                    ]
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                return jsonify({"error": "Failed to get response from OpenAI"}), 500
                
            response_data = response.json()
            generated_content = response_data['choices'][0]['message']['content']

            # For list fields, split the content into an array
            if field in ['challenges', 'strategies', 'examples', 'action_steps']:
                # Split on newlines and clean up any bullet points or numbers
                content_array = [line.strip().lstrip('•-*1234567890. ') 
                               for line in generated_content.split('\n')
                               if line.strip() and not line.strip().startswith('#')]
                return jsonify({
                    "current": context.get(field, []),
                    "generated": content_array,
                    "is_list": True
                })
            else:
                return jsonify({
                    "current": context.get(field, ""),
                    "generated": generated_content.strip(),
                    "is_list": False
                })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/topic/<topic_id>')
def view_topic(topic_id):
    try:
        kb_data = load_knowledge_base()
        topic = next((t for t in kb_data if t['id'] == topic_id), None)
        if not topic:
            flash('Topic not found')
            return redirect(url_for('knowledge'))
            
        # Ensure metadata exists
        if 'metadata' not in topic:
            topic['metadata'] = {}
            
        # Get parent topic if it exists
        parent = next((t for t in kb_data if t['id'] == topic.get('parent_id')), None)
        
        # Get child topics
        children = [t for t in kb_data if t.get('parent_id') == topic_id]
        
        # Ensure each child has metadata
        for child in children:
            if 'metadata' not in child:
                child['metadata'] = {}
        
        return render_template('topic.html', topic=topic, parent=parent, children=children)
    except Exception as e:
        flash('Error loading topic')
        return redirect(url_for('knowledge'))

if __name__ == '__main__':
    app.run(debug=True, port=5001) 