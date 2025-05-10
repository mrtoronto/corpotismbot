class Chat {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key');
        this.conversationHistory = [];
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.messageCount = 0;  // Track number of messages for average calculation
        this.initializeElements();
        this.attachEventListeners();
        this.updateUIState();
    }

    initializeElements() {
        this.apiKeyInput = document.getElementById('api-key-input');
        this.apiKeyStatus = document.getElementById('api-key-status');
        this.saveApiKeyBtn = document.getElementById('save-api-key');
        this.apiKeySection = document.getElementById('api-key-section');
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
            this.apiKeySection.style.display = 'none';
        } else {
            this.apiKeySection.style.display = '';
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
            if (this.apiKeySection) this.apiKeySection.style.display = 'none';
        } else {
            if (this.apiKeySection) this.apiKeySection.style.display = '';
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
        if (this.apiKeySection) this.apiKeySection.style.display = 'none';
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
        if (!this.apiKey) return;

        const message = this.chatInput.value.trim();
        if (!message) return;

        // Clear input
        this.chatInput.value = '';

        // Add user message to chat
        this.addMessageToChat('user', message);

        // Set loading state
        this.setLoading(true);

        try {
            // Send message to server
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    api_key: this.apiKey
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response from server');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Extract the actual message content from the response
            const messageContent = data.choices?.[0]?.message?.content || 'No response content found';

            // Add assistant response to chat
            this.addMessageToChat('assistant', messageContent, {
                input: data.usage?.prompt_tokens || 0,
                output: data.usage?.completion_tokens || 0
            });

            // Update token counts
            if (data.usage) {
                this.totalInputTokens += data.usage.prompt_tokens || 0;
                this.totalOutputTokens += data.usage.completion_tokens || 0;
                this.messageCount++;
                this.updateTotalTokens();
            }

        } catch (error) {
            console.error('Error in sendMessage:', error);
            this.addMessageToChat('error', 'Sorry, there was an error processing your message. Please try again.');
        } finally {
            // Remove loading state
            this.setLoading(false);
            this.chatInput.focus();
        }
    }

    addMessageToChat(role, content, tokens = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'mb-4';
        
        const messageContent = role === 'error' 
            ? `<div class="bg-red-50 text-red-700 p-3 rounded-lg">${content}</div>`
            : `<div class="flex items-start">
                <div class="flex-shrink-0">
                    ${role === 'user' 
                        ? '<div class="bg-blue-500 text-white p-2 rounded-full">You</div>' 
                        : '<img src="/static/favicon.png" alt="AI" class="w-10 h-10 rounded-full border border-gray-200" />'}
                </div>
                <div class="ml-3 p-3 rounded-lg shadow-sm ${role === 'assistant' ? 'bg-blue-50' : 'bg-white'}">
                    ${this.formatMessage(content)}
                </div>
               </div>`;

        messageDiv.innerHTML = messageContent;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        if (tokens) {
            this.updateTotalTokens();
        }
    }

    formatMessage(message) {
        return message.replace(/\n/g, '<br>');
    }

    updateTotalTokens() {
        const avgInputTokens = this.messageCount ? Math.round(this.totalInputTokens / this.messageCount) : 0;
        const avgOutputTokens = this.messageCount ? Math.round(this.totalOutputTokens / this.messageCount) : 0;
        
        document.getElementById('total-tokens').textContent = 
            `Total Tokens: ${this.totalInputTokens} in / ${this.totalOutputTokens} out | Average per message: ${avgInputTokens} in / ${avgOutputTokens} out`;
    }
}

// Initialize chat when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chat = new Chat();
}); 