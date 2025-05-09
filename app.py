from flask import Flask, render_template, jsonify, request
import json
import os
import httpx

app = Flask(__name__)

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

@app.route('/api/knowledge')
def get_knowledge():
    try:
        kb_data = load_knowledge_base()
        return jsonify(kb_data)
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
                            'content': f'You are a helpful assistant with knowledge about autism in corporate settings. Use this context to inform your responses:\n\n{context}'
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

if __name__ == '__main__':
    app.run(debug=True, port=5001) 