// Knowledge Base functionality
class KnowledgeBase {
    constructor() {
        this.data = null;
        this.currentTopic = null;
        this.isLoading = false;
    }

    async initialize() {
        try {
            this.isLoading = true;
            const response = await fetch('knowledge_base.json');
            if (!response.ok) {
                throw new Error('Failed to load knowledge base');
            }
            this.data = await response.json();
            this.isLoading = false;
            this.render();
        } catch (error) {
            console.error('Error initializing knowledge base:', error);
            this.handleError(error);
        }
    }

    render() {
        const container = document.getElementById('topics-container');
        if (!container) return;

        if (this.isLoading) {
            this.renderLoadingState(container);
            return;
        }

        container.innerHTML = '';
        const topics = this.data.filter(item => item.category === 'TOPIC');
        
        topics.forEach(topic => {
            const subtopics = this.data.filter(item => 
                item.category === 'SUBTOPIC' && item.parent_id === topic.id
            );
            
            const topicElement = this.createTopicElement(topic, subtopics);
            container.appendChild(topicElement);
        });
    }

    createTopicElement(topic, subtopics) {
        const div = document.createElement('div');
        div.className = 'topic-card bg-gray-50 rounded-lg p-4 mb-4';
        
        const content = `
            <div class="cursor-pointer" data-topic-id="${topic.id}">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">${this.escapeHtml(topic.title)}</h3>
                <p class="text-gray-600 text-sm mb-3">${this.escapeHtml(topic.metadata?.importance || '')}</p>
            </div>
            <div class="subtopic-list ml-4 space-y-2">
                ${subtopics.map(subtopic => `
                    <div class="border-l-2 border-gray-200 pl-3 py-2 cursor-pointer hover:bg-gray-100 rounded"
                         data-subtopic-id="${subtopic.id}">
                        <h4 class="text-md font-medium text-gray-800">${this.escapeHtml(subtopic.title)}</h4>
                        <p class="text-gray-600 text-sm">${this.escapeHtml(subtopic.metadata?.relation_to_parent || '')}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        div.innerHTML = content;
        
        // Add click handlers
        div.querySelector(`[data-topic-id="${topic.id}"]`).addEventListener('click', () => {
            this.showTopicDetails(topic);
        });
        
        subtopics.forEach(subtopic => {
            div.querySelector(`[data-subtopic-id="${subtopic.id}"]`).addEventListener('click', (e) => {
                e.stopPropagation();
                this.showSubtopicDetails(subtopic);
            });
        });
        
        return div;
    }

    showTopicDetails(topic) {
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4';
        
        const content = `
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div class="flex justify-between items-start mb-4">
                    <h2 class="text-xl font-bold">${this.escapeHtml(topic.title)}</h2>
                    <button class="text-gray-500 hover:text-gray-700" id="close-details">×</button>
                </div>
                <div class="prose">
                    <h3 class="text-lg font-semibold mb-2">Importance</h3>
                    <p class="mb-4">${this.escapeHtml(topic.metadata?.importance || '')}</p>
                    
                    <h3 class="text-lg font-semibold mb-2">Challenges</h3>
                    <ul class="list-disc pl-5 mb-4">
                        ${(topic.metadata?.challenges || []).map(challenge => 
                            `<li>${this.escapeHtml(challenge)}</li>`
                        ).join('')}
                    </ul>
                    
                    <h3 class="text-lg font-semibold mb-2">Strategies</h3>
                    <ul class="list-disc pl-5 mb-4">
                        ${(topic.metadata?.strategies || []).map(strategy => 
                            `<li>${this.escapeHtml(strategy)}</li>`
                        ).join('')}
                    </ul>
                    
                    <h3 class="text-lg font-semibold mb-2">Examples</h3>
                    <ul class="list-disc pl-5 mb-4">
                        ${(topic.metadata?.examples || []).map(example => 
                            `<li>${this.escapeHtml(example)}</li>`
                        ).join('')}
                    </ul>
                    
                    <h3 class="text-lg font-semibold mb-2">Action Steps</h3>
                    <ul class="list-disc pl-5">
                        ${(topic.metadata?.action_steps || []).map(step => 
                            `<li>${this.escapeHtml(step)}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        detailsContainer.innerHTML = content;
        document.body.appendChild(detailsContainer);
        
        document.getElementById('close-details').addEventListener('click', () => {
            detailsContainer.remove();
        });
        
        detailsContainer.addEventListener('click', (e) => {
            if (e.target === detailsContainer) {
                detailsContainer.remove();
            }
        });
    }

    showSubtopicDetails(subtopic) {
        // Similar to showTopicDetails but with subtopic-specific content
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4';
        
        const content = `
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div class="flex justify-between items-start mb-4">
                    <h2 class="text-xl font-bold">${this.escapeHtml(subtopic.title)}</h2>
                    <button class="text-gray-500 hover:text-gray-700" id="close-details">×</button>
                </div>
                <div class="prose">
                    <h3 class="text-lg font-semibold mb-2">Relation to Parent Topic</h3>
                    <p class="mb-4">${this.escapeHtml(subtopic.metadata?.relation_to_parent || '')}</p>
                    
                    <h3 class="text-lg font-semibold mb-2">Challenges</h3>
                    <ul class="list-disc pl-5 mb-4">
                        ${(subtopic.metadata?.challenges || []).map(challenge => 
                            `<li>${this.escapeHtml(challenge)}</li>`
                        ).join('')}
                    </ul>
                    
                    <h3 class="text-lg font-semibold mb-2">Strategies</h3>
                    <ul class="list-disc pl-5 mb-4">
                        ${(subtopic.metadata?.strategies || []).map(strategy => 
                            `<li>${this.escapeHtml(strategy)}</li>`
                        ).join('')}
                    </ul>
                    
                    <h3 class="text-lg font-semibold mb-2">Examples</h3>
                    <ul class="list-disc pl-5 mb-4">
                        ${(subtopic.metadata?.examples || []).map(example => 
                            `<li>${this.escapeHtml(example)}</li>`
                        ).join('')}
                    </ul>
                    
                    <h3 class="text-lg font-semibold mb-2">Action Steps</h3>
                    <ul class="list-disc pl-5">
                        ${(subtopic.metadata?.action_steps || []).map(step => 
                            `<li>${this.escapeHtml(step)}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        detailsContainer.innerHTML = content;
        document.body.appendChild(detailsContainer);
        
        document.getElementById('close-details').addEventListener('click', () => {
            detailsContainer.remove();
        });
        
        detailsContainer.addEventListener('click', (e) => {
            if (e.target === detailsContainer) {
                detailsContainer.remove();
            }
        });
    }

    renderLoadingState(container) {
        container.innerHTML = `
            <div class="loading-pulse space-y-4">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="space-y-3">
                    <div class="h-4 bg-gray-200 rounded"></div>
                    <div class="h-4 bg-gray-200 rounded"></div>
                    <div class="h-4 bg-gray-200 rounded"></div>
                </div>
            </div>
        `;
    }

    handleError(error) {
        const container = document.getElementById('topics-container');
        if (container) {
            container.innerHTML = `
                <div class="text-red-500 p-4 rounded-lg bg-red-50 border border-red-200">
                    <p class="font-semibold">Error loading knowledge base</p>
                    <p class="text-sm mt-1">${this.escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the knowledge base when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const kb = new KnowledgeBase();
    kb.initialize();
}); 