class Chat {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key');
        this.chats = this.loadChats(); // { guid: { messages: [], totalInputTokens, totalOutputTokens, messageCount } }
        this.currentChatId = this.loadCurrentChatId();
        this.voices = {};
        this.currentVoice = localStorage.getItem('selected_voice') || 'af_heart';
        this.loadVoices();
        this.initializeElements();
        this.attachEventListeners();
        this.updateUIState();
        this.renderChatList();
        this.loadChatMessages();
    }

    async loadVoices() {
        try {
            const response = await fetch('/api/voices');
            const data = await response.json();
            this.voices = data.voices;
            this.currentVoice = localStorage.getItem('selected_voice') || data.default;
            this.updateVoiceSelector();
        } catch (error) {
            console.error('Error loading voices:', error);
        }
    }

    updateVoiceSelector() {
        const voiceSelector = document.getElementById('voice-selector');
        if (!voiceSelector) return;

        // Group voices by accent
        const groupedVoices = Object.entries(this.voices).reduce((acc, [id, voice]) => {
            const group = acc[voice.accent] || [];
            group.push({ id, ...voice });
            acc[voice.accent] = group;
            return acc;
        }, {});

        // Create options with optgroups
        voiceSelector.innerHTML = Object.entries(groupedVoices).map(([accent, voices]) => `
            <optgroup label="${accent}">
                ${voices.map(voice => `
                    <option value="${voice.id}" ${this.currentVoice === voice.id ? 'selected' : ''}>
                        ${voice.gender === 'F' ? '👩' : '👨'} ${voice.name}
                    </option>
                `).join('')}
            </optgroup>
        `).join('');

        // Add change handler
        voiceSelector.addEventListener('change', (e) => {
            this.currentVoice = e.target.value;
            localStorage.setItem('selected_voice', this.currentVoice);
        });
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
        this.deleteChatBtnMobile = document.getElementById('delete-chat-btn-mobile');
        // Set initial API key if exists
        if (this.apiKey) {
            this.apiKeyInput.value = '********';
            this.apiKeyStatus.textContent = 'API key saved';
            this.apiKeyStatus.className = 'text-sm mt-2 text-green-500';
            this.apiKeySection.style.display = 'none';
        } else {
            this.apiKeySection.style.display = '';
        }

        // Add voice selector initialization
        const voiceSelectorContainer = document.createElement('div');
        voiceSelectorContainer.className = 'flex items-center space-x-2 mt-2';
        voiceSelectorContainer.innerHTML = `
            <label for="voice-selector" class="text-sm text-gray-600">Voice:</label>
            <select id="voice-selector" class="text-sm rounded-lg border border-gray-300 px-2 py-1">
                <option value="af_heart">Loading voices...</option>
            </select>
        `;
        
        // Insert voice selector after the chat input
        const chatInputContainer = this.chatInput.parentElement;
        chatInputContainer.parentElement.insertBefore(voiceSelectorContainer, chatInputContainer.nextSibling);
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
        if (this.deleteChatBtnMobile) {
            this.deleteChatBtnMobile.addEventListener('click', () => this.deleteCurrentChat());
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
        // Disable delete buttons if only one chat
        const onlyOne = Object.keys(this.chats).length <= 1;
        if (this.deleteChatBtn) {
            this.deleteChatBtn.disabled = onlyOne;
            this.deleteChatBtn.classList.toggle('opacity-50', onlyOne);
        }
        if (this.deleteChatBtnMobile) {
            this.deleteChatBtnMobile.disabled = onlyOne;
            this.deleteChatBtnMobile.classList.toggle('opacity-50', onlyOne);
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
        // Add a style block for audio controls at the start of the method
        if (!document.getElementById('audio-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'audio-styles';
            styleSheet.textContent = `
                @media (max-width: 768px) {
                    /* Hide volume slider on mobile */
                    audio::-webkit-media-controls-volume-slider,
                    audio::-webkit-media-controls-mute-button {
                        display: none !important;
                    }
                }
            `;
            document.head.appendChild(styleSheet);
        }

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
                <div class="ml-3 flex-grow">
                    <div class="p-3 rounded-lg shadow-sm ${role === 'assistant' ? 'bg-blue-50' : 'bg-white'}">
                        <div class="mb-2">${this.formatMessage(content)}</div>
                        ${role === 'assistant' ? `
                            <div class="border-t pt-2 mt-2">
                                <div class="flex flex-col space-y-2">
                                    <button class="text-blue-500 hover:text-blue-700 text-sm flex items-center generate-tts w-fit" data-message="${encodeURIComponent(content)}">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                        Generate Voice
                                    </button>
                                    <div class="audio-container hidden">
                                        <!-- Audio player will be inserted here -->
                                    </div>
                                    <div class="tts-loading hidden">
                                        <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
               </div>`;
        messageDiv.innerHTML = messageContent;

        // Add click handler for TTS button
        if (role === 'assistant') {
            const ttsButton = messageDiv.querySelector('.generate-tts');
            const audioContainer = messageDiv.querySelector('.audio-container');
            const loadingSpinner = messageDiv.querySelector('.tts-loading');
            
            ttsButton.addEventListener('click', async () => {
                try {
                    // Show loading spinner
                    loadingSpinner.classList.remove('hidden');
                    ttsButton.classList.add('hidden');
                    
                    // Get message content
                    const messageText = decodeURIComponent(ttsButton.dataset.message);
                    
                    // Request TTS audio with selected voice
                    const response = await fetch('/api/tts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            text: messageText,
                            voice: this.currentVoice
                        })
                    });
                    
                    if (!response.ok) throw new Error('Failed to generate audio');
                    
                    // Get audio blob
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    // Create audio player with mobile-specific class
                    audioContainer.innerHTML = `
                        <audio controls class="w-full max-w-md audio-player">
                            <source src="${audioUrl}" type="audio/wav">
                            Your browser does not support the audio element.
                        </audio>
                    `;
                    audioContainer.classList.remove('hidden');
                    
                } catch (error) {
                    console.error('Error generating TTS:', error);
                    alert('Failed to generate audio. Please try again.');
                    ttsButton.classList.remove('hidden');
                } finally {
                    loadingSpinner.classList.add('hidden');
                }
            });
        }

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