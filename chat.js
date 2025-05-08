class Chat {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key');
        this.knowledgeBase = null;
        this.conversationHistory = [];
        this.initializeElements();
        this.attachEventListeners();
        this.loadKnowledgeBase();
        this.updateUIState();
    }

    async loadKnowledgeBase() {
        try {
            const response = await fetch('knowledge_base.json');
            if (!response.ok) {
                throw new Error('Failed to load knowledge base');
            }
            this.knowledgeBase = await response.json();
        } catch (error) {
            console.error('Error loading knowledge base:', error);
            this.addMessageToChat('error', 'Failed to load knowledge base. Some features may be limited.');
        }
    }

    initializeElements() {
        this.apiKeyInput = document.getElementById('api-key-input');
        this.apiKeyStatus = document.getElementById('api-key-status');
        this.saveApiKeyBtn = document.getElementById('save-api-key');
        this.chatInput = document.getElementById('chat-input');
        this.sendMessageBtn = document.getElementById('send-message');
        this.sendText = document.getElementById('send-text');
        this.sendSpinner = document.getElementById('send-spinner');
        this.chatMessages = document.getElementById('chat-messages');
        this.welcomeMessage = document.getElementById('welcome-message');
        
        // Set initial API key if exists
        if (this.apiKey) {
            this.apiKeyInput.value = '********';
            this.apiKeyStatus.textContent = 'API key saved';
            this.apiKeyStatus.className = 'text-sm mt-2 text-green-500';
        }
    }

    attachEventListeners() {
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    updateUIState() {
        const hasApiKey = Boolean(this.apiKey);
        this.chatInput.disabled = !hasApiKey;
        this.sendMessageBtn.disabled = !hasApiKey;
        
        if (hasApiKey) {
            this.welcomeMessage.textContent = "Ask me anything about the topics in the knowledge base!";
        }
    }

    saveApiKey() {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
            this.apiKeyStatus.textContent = 'Please enter an API key';
            this.apiKeyStatus.className = 'text-sm mt-2 text-red-500';
            return;
        }

        localStorage.setItem('openai_api_key', key);
        this.apiKey = key;
        this.apiKeyInput.value = '********';
        this.apiKeyStatus.textContent = 'API key saved';
        this.apiKeyStatus.className = 'text-sm mt-2 text-green-500';
        this.updateUIState();
    }

    setLoading(isLoading) {
        this.chatInput.disabled = isLoading;
        this.sendMessageBtn.disabled = isLoading;
        
        if (isLoading) {
            this.sendText.classList.add('hidden');
            this.sendSpinner.classList.remove('hidden');
            this.chatInput.classList.add('bg-gray-100');
        } else {
            this.sendText.classList.remove('hidden');
            this.sendSpinner.classList.add('hidden');
            this.chatInput.classList.remove('bg-gray-100');
        }
    }

    async sendMessage() {
        if (!this.apiKey || !this.knowledgeBase) return;

        const message = this.chatInput.value.trim();
        if (!message) return;

        // Clear input
        this.chatInput.value = '';

        // Add user message to conversation history and chat
        this.conversationHistory.push({ role: 'user', content: message });
        this.addMessageToChat('user', message);

        // Set loading state
        this.setLoading(true);

        try {
            // Find relevant knowledge base entries
            const relevantEntries = this.findRelevantEntries(message);
            
            // Prepare context from relevant entries
            const context = this.prepareContext(relevantEntries);

            // Get response from GPT-4
            const response = await this.getGPTResponse(message, context);

            // Add assistant response to conversation history and chat
            this.conversationHistory.push({ role: 'assistant', content: response });
            this.addMessageToChat('assistant', response);

            // Keep only the last 10 messages
            if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-10);
            }
        } catch (error) {
            console.error('Error:', error);
            this.addMessageToChat('error', 'Sorry, there was an error processing your message. Please try again.');
        } finally {
            // Remove loading state
            this.setLoading(false);
            this.chatInput.focus();
        }
    }

    findRelevantEntries(message) {
        if (!this.knowledgeBase) return [];

        // Extract keywords from message and find matching entries
        const keywords = message.toLowerCase().split(' ')
            .filter(word => word.length > 3)  // Filter out short words
            .filter(word => !['what', 'when', 'where', 'why', 'how', 'can', 'will', 'should'].includes(word));

        return this.knowledgeBase
            .filter(entry => {
                const title = entry.title.toLowerCase();
                return keywords.some(keyword => title.includes(keyword));
            })
            .slice(0, 3);  // Get up to 3 most relevant entries
    }

    prepareContext(entries) {
        return entries.map(entry => {
            const metadata = entry.metadata || {};
            return `
Topic: ${entry.title}
${entry.category === 'TOPIC' ? `Importance: ${metadata.importance || 'N/A'}` : `Relation to Parent: ${metadata.relation_to_parent || 'N/A'}`}
Challenges:
${(metadata.challenges || []).map(c => `- ${c}`).join('\n')}
Strategies:
${(metadata.strategies || []).map(s => `- ${s}`).join('\n')}
Examples:
${(metadata.examples || []).map(e => `- ${e}`).join('\n')}
Action Steps:
${(metadata.action_steps || []).map(a => `- ${a}`).join('\n')}
            `.trim();
        }).join('\n\n');
    }

    async getGPTResponse(message, context) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a friendly, casual AI assistant who helps autistic individuals navigate corporate environments. Your personality traits:

- You're conversational and sometimes witty, but always respectful
- You vary your response length based on the complexity of the question
- You prefer natural dialogue over bullet points
- You're concise when possible, but detailed when necessary
- You occasionally use light humor when appropriate
- You acknowledge uncertainty when it exists

When using the knowledge base context below, weave the information naturally into your responses rather than just listing facts. Treat this like a friendly chat rather than a formal consultation.

If you don't find relevant information in the context, it's okay to say so and provide general advice based on the topic.

Knowledge Base Context:
${context}`
                    },
                    // Include conversation history
                    ...this.conversationHistory
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from OpenAI API');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `p-4 rounded-lg ${
            role === 'user' ? 'bg-blue-100 ml-8' :
            role === 'assistant' ? 'bg-gray-100 mr-8' :
            'bg-red-100 mx-8'
        }`;
        
        const textContent = document.createElement('p');
        textContent.className = 'text-gray-800 whitespace-pre-wrap';
        textContent.textContent = content;
        
        messageDiv.appendChild(textContent);
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize chat when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new Chat();
}); 