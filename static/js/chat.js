class Chat {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key');
        this.chats = this.loadChats(); // { guid: { messages: [], totalInputTokens, totalOutputTokens, messageCount } }
        this.currentChatId = this.loadCurrentChatId();
        this.initializeElements();
        this.attachEventListeners();
        this.updateUIState();
        this.renderChatList();
        this.loadChatMessages();
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
        this.chatList = document.getElementById('chat-list');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.currentChatGuid = document.getElementById('current-chat-guid');
        this.deleteChatBtn = document.getElementById('delete-chat-btn');
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
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.createNewChat());
        }
        if (this.chatList) {
            this.chatList.addEventListener('click', (e) => {
                if (e.target && e.target.dataset && e.target.dataset.chatId) {
                    this.switchChat(e.target.dataset.chatId);
                }
            });
        }
        if (this.deleteChatBtn) {
            this.deleteChatBtn.addEventListener('click', () => this.deleteCurrentChat());
        }
    }

    // --- Chat Storage ---
    loadChats() {
        const chats = localStorage.getItem('chats');
        if (chats) {
            const parsed = JSON.parse(chats);
            // Migrate old format if needed
            for (const guid in parsed) {
                if (Array.isArray(parsed[guid])) {
                    parsed[guid] = {
                        messages: parsed[guid],
                        totalInputTokens: 0,
                        totalOutputTokens: 0,
                        messageCount: 0
                    };
                }
            }
            return parsed;
        }
        // If no chats, create one
        const guid = this.generateGUID();
        const initial = {};
        initial[guid] = { messages: [], totalInputTokens: 0, totalOutputTokens: 0, messageCount: 0 };
        localStorage.setItem('chats', JSON.stringify(initial));
        localStorage.setItem('currentChatId', guid);
        return initial;
    }
    saveChats() {
        localStorage.setItem('chats', JSON.stringify(this.chats));
    }
    loadCurrentChatId() {
        let id = localStorage.getItem('currentChatId');
        if (!id || !this.chats[id]) {
            id = Object.keys(this.chats)[0];
            localStorage.setItem('currentChatId', id);
        }
        return id;
    }
    saveCurrentChatId() {
        localStorage.setItem('currentChatId', this.currentChatId);
    }
    generateGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- Chat List UI ---
    renderChatList() {
        if (!this.chatList) return;
        this.chatList.innerHTML = '';
        Object.keys(this.chats).forEach(guid => {
            const li = document.createElement('li');
            li.className = `p-2 rounded cursor-pointer ${guid === this.currentChatId ? 'bg-blue-100 font-bold' : 'hover:bg-gray-200'}`;
            li.textContent = guid;
            li.dataset.chatId = guid;
            this.chatList.appendChild(li);
        });
        // Update chat header
        if (this.currentChatGuid) {
            this.currentChatGuid.textContent = `Chat: ${this.currentChatId}`;
        }
        // Disable delete button if only one chat
        if (this.deleteChatBtn) {
            this.deleteChatBtn.disabled = Object.keys(this.chats).length <= 1;
            this.deleteChatBtn.classList.toggle('opacity-50', this.deleteChatBtn.disabled);
        }
    }

    createNewChat() {
        const guid = this.generateGUID();
        this.chats[guid] = { messages: [], totalInputTokens: 0, totalOutputTokens: 0, messageCount: 0 };
        this.currentChatId = guid;
        this.saveChats();
        this.saveCurrentChatId();
        this.renderChatList();
        this.loadChatMessages();
    }

    switchChat(guid) {
        if (!this.chats[guid]) return;
        this.currentChatId = guid;
        this.saveCurrentChatId();
        this.renderChatList();
        this.loadChatMessages();
    }

    deleteCurrentChat() {
        const chatIds = Object.keys(this.chats);
        if (chatIds.length <= 1) return; // Don't delete last chat
        delete this.chats[this.currentChatId];
        // Pick another chat to switch to
        const nextId = chatIds.find(id => id !== this.currentChatId) || Object.keys(this.chats)[0];
        this.currentChatId = nextId;
        this.saveChats();
        this.saveCurrentChatId();
        this.renderChatList();
        this.loadChatMessages();
    }

    // --- Chat Message UI ---
    loadChatMessages() {
        if (!this.chatMessages) return;
        this.chatMessages.innerHTML = '';
        const chat = this.chats[this.currentChatId] || { messages: [], totalInputTokens: 0, totalOutputTokens: 0, messageCount: 0 };
        const messages = chat.messages;
        this.totalInputTokens = chat.totalInputTokens || 0;
        this.totalOutputTokens = chat.totalOutputTokens || 0;
        this.messageCount = chat.messageCount || 0;
        if (messages.length === 0 && this.welcomeMessage) {
            this.welcomeMessage.style.display = '';
        } else if (this.welcomeMessage) {
            this.welcomeMessage.style.display = 'none';
        }
        messages.forEach(msg => {
            this.addMessageToChat(msg.role, msg.content, msg.tokens, false);
        });
        this.updateTotalTokens();
    }

    // --- UI State ---
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
        this.chatInput.value = '';
        this.addMessageToChat('user', message);
        this.saveMessage('user', message);
        this.setLoading(true);
        try {
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
            const messageContent = data.choices?.[0]?.message?.content || 'No response content found';
            this.addMessageToChat('assistant', messageContent, {
                input: data.usage?.prompt_tokens || 0,
                output: data.usage?.completion_tokens || 0
            });
            this.saveMessage('assistant', messageContent, {
                input: data.usage?.prompt_tokens || 0,
                output: data.usage?.completion_tokens || 0
            });
            if (data.usage) {
                this.totalInputTokens += data.usage.prompt_tokens || 0;
                this.totalOutputTokens += data.usage.completion_tokens || 0;
                this.messageCount++;
                this.updateChatTokenCounts();
                this.updateTotalTokens();
            }
        } catch (error) {
            console.error('Error in sendMessage:', error);
            this.addMessageToChat('error', 'Sorry, there was an error processing your message. Please try again.');
        } finally {
            this.setLoading(false);
            this.chatInput.focus();
        }
    }

    addMessageToChat(role, content, tokens = null, scroll = true) {
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
        if (scroll) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
        if (tokens) {
            this.updateTotalTokens();
        }
    }

    saveMessage(role, content, tokens = null) {
        const chat = this.chats[this.currentChatId];
        if (!chat) return;
        chat.messages.push({ role, content, tokens });
        this.saveChats();
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

    updateChatTokenCounts() {
        const chat = this.chats[this.currentChatId];
        if (!chat) return;
        chat.totalInputTokens = this.totalInputTokens;
        chat.totalOutputTokens = this.totalOutputTokens;
        chat.messageCount = this.messageCount;
        this.saveChats();
    }
}

// Initialize chat when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chat = new Chat();
}); 