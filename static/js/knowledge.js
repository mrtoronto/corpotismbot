document.addEventListener('DOMContentLoaded', function() {
    fetchKnowledgeBase();
    
    // Add event listeners for expand/collapse buttons
    document.getElementById('expandAll').addEventListener('click', expandAllTopics);
    document.getElementById('collapseAll').addEventListener('click', collapseAllTopics);
    
    if (isLoggedIn) {
        document.getElementById('addTopic').addEventListener('click', addNewTopic);
    }
});

let knowledgeBaseData = []; // Store the complete knowledge base data

async function fetchKnowledgeBase() {
    try {
        const response = await fetch('/api/knowledge');
        if (!response.ok) {
            throw new Error('Failed to fetch knowledge base');
        }
        const data = await response.json();
        knowledgeBaseData = data; // Store the data
        displayTopics(data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('topics-container').innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Failed to load knowledge base. Please try again later.</p>
            </div>
        `;
    }
}

function displayTopics(topics) {
    const container = document.getElementById('topics-container');
    container.innerHTML = ''; // Clear loading state

    // Get root topics (those with no parent_id)
    const rootTopics = topics.filter(topic => !topic.parent_id);
    
    rootTopics.forEach(topic => {
        const topicElement = createTopicElement(topic, topics);
        container.appendChild(topicElement);
    });
}

function createTopicElement(topic, allTopics) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow p-6 topic-container';
    div.dataset.topicId = topic.id;
    
    const children = allTopics.filter(t => t.parent_id === topic.id);
    const hasChildren = children.length > 0;
    
    const content = `
        <div class="topic-header flex items-start justify-between">
            <div class="flex-grow cursor-pointer" onclick="toggleTopic(this)">
                <div class="flex items-center">
                    ${hasChildren ? `
                        <svg class="w-6 h-6 mr-2 transform transition-transform duration-200 expand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    ` : ''}
                    <h3 class="text-xl font-semibold text-gray-900">${topic.title}</h3>
                </div>
                <div class="text-sm text-gray-500 mt-1">${topic.category}</div>
            </div>
            ${isLoggedIn ? `
                <div class="flex space-x-2">
                    <a href="/knowledge/edit/${topic.id}" class="text-blue-500 hover:text-blue-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </a>
                    <button onclick="deleteTopic('${topic.id}')" class="text-red-500 hover:text-red-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            ` : ''}
        </div>
        
        <div class="topic-content mt-4 hidden">
            ${formatTopicContent(topic)}
            
            ${hasChildren ? `
                <div class="children-container mt-6 ml-6 space-y-4">
                    ${children.map(child => createTopicElement(child, allTopics).outerHTML).join('')}
                </div>
            ` : ''}
            
            ${isLoggedIn ? `
                <button onclick="addChildTopic('${topic.id}')" 
                    class="mt-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm">
                    Add Subtopic
                </button>
            ` : ''}
        </div>
    `;
    
    div.innerHTML = content;
    return div;
}

function formatTopicContent(topic) {
    let content = '';
    
    // Add importance or relation to parent
    if (topic.metadata.importance) {
        content += `
            <div class="mb-6">
                <h4 class="font-semibold text-gray-700 mb-2">Importance</h4>
                <p class="text-gray-600">${topic.metadata.importance}</p>
            </div>
        `;
    }
    
    if (topic.metadata.relation_to_parent) {
        content += `
            <div class="mb-6">
                <h4 class="font-semibold text-gray-700 mb-2">Relation to Parent Topic</h4>
                <p class="text-gray-600">${topic.metadata.relation_to_parent}</p>
            </div>
        `;
    }
    
    // Add challenges section
    if (topic.metadata.challenges && topic.metadata.challenges.length > 0) {
        content += `
            <div class="mb-6">
                <h4 class="font-semibold text-gray-700 mb-2">Key Challenges</h4>
                <ul class="list-disc ml-6 space-y-2 text-gray-600">
                    ${topic.metadata.challenges.map(challenge => `<li>${challenge}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Add strategies section
    if (topic.metadata.strategies && topic.metadata.strategies.length > 0) {
        content += `
            <div class="mb-6">
                <h4 class="font-semibold text-gray-700 mb-2">Strategies</h4>
                <ul class="list-disc ml-6 space-y-2 text-gray-600">
                    ${topic.metadata.strategies.map(strategy => `<li>${strategy}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Add examples section
    if (topic.metadata.examples && topic.metadata.examples.length > 0) {
        content += `
            <div class="mb-6">
                <h4 class="font-semibold text-gray-700 mb-2">Examples</h4>
                <ul class="list-disc ml-6 space-y-2 text-gray-600">
                    ${topic.metadata.examples.map(example => `<li>${example}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Add action steps section
    if (topic.metadata.action_steps && topic.metadata.action_steps.length > 0) {
        content += `
            <div class="mb-6">
                <h4 class="font-semibold text-gray-700 mb-2">Action Steps</h4>
                <ul class="list-disc ml-6 space-y-2 text-gray-600">
                    ${topic.metadata.action_steps.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    return content;
}

function toggleTopic(header) {
    const container = header.closest('.topic-container');
    const content = container.querySelector('.topic-content');
    const expandIcon = container.querySelector('.expand-icon');
    
    content.classList.toggle('hidden');
    if (expandIcon) {
        expandIcon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
    }
}

function expandAllTopics() {
    document.querySelectorAll('.topic-content').forEach(content => {
        content.classList.remove('hidden');
    });
    document.querySelectorAll('.expand-icon').forEach(icon => {
        icon.style.transform = 'rotate(90deg)';
    });
}

function collapseAllTopics() {
    document.querySelectorAll('.topic-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.querySelectorAll('.expand-icon').forEach(icon => {
        icon.style.transform = 'rotate(0deg)';
    });
}

async function addNewTopic() {
    try {
        const newTopic = {
            id: Date.now().toString(),
            title: "New Topic",
            category: "TOPIC",
            parent_id: null,
            metadata: {
                importance: "",
                challenges: [],
                strategies: [],
                examples: [],
                action_steps: []
            }
        };

        knowledgeBaseData.push(newTopic);
        
        // Save to server
        const response = await fetch('/api/knowledge', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(knowledgeBaseData)
        });

        if (!response.ok) throw new Error('Failed to save new topic');

        // Redirect to edit page for the new topic
        window.location.href = `/knowledge/edit/${newTopic.id}`;

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create new topic. Please try again.');
    }
}

async function addChildTopic(parentId) {
    try {
        const newTopic = {
            id: Date.now().toString(),
            title: "New Subtopic",
            category: "SUBTOPIC",
            parent_id: parentId,
            metadata: {
                relation_to_parent: "",
                challenges: [],
                strategies: [],
                examples: [],
                action_steps: []
            }
        };

        knowledgeBaseData.push(newTopic);
        
        // Save to server
        const response = await fetch('/api/knowledge', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(knowledgeBaseData)
        });

        if (!response.ok) throw new Error('Failed to save new subtopic');

        // Redirect to edit page for the new topic
        window.location.href = `/knowledge/edit/${newTopic.id}`;

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create new subtopic. Please try again.');
    }
}

function showDeleteConfirmation(topicId, topicTitle) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-bold text-red-600 mb-4">Confirm Deletion</h3>
            <p class="text-gray-700 mb-4">
                Are you sure you want to delete "${topicTitle}"? This action cannot be undone and will also delete all subtopics.
            </p>
            <div class="flex justify-end space-x-3">
                <button onclick="this.closest('.fixed').remove()" 
                    class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                    Cancel
                </button>
                <button onclick="confirmDelete('${topicId}', this)" 
                    class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                    Delete
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmDelete(topicId, button) {
    const modal = button.closest('.fixed');
    
    try {
        // Remove the topic and all its children
        const removeTopicAndChildren = (id) => {
            knowledgeBaseData = knowledgeBaseData.filter(topic => {
                if (topic.id === id) return false;
                if (topic.parent_id === id) {
                    removeTopicAndChildren(topic.id);
                    return false;
                }
                return true;
            });
        };

        removeTopicAndChildren(topicId);
        
        // Save to server
        const response = await fetch('/api/knowledge', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(knowledgeBaseData)
        });

        if (!response.ok) throw new Error('Failed to delete topic');

        // Close the modal
        modal.remove();

        // Show success message
        const message = document.createElement('div');
        message.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50';
        message.textContent = 'Topic deleted successfully';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);

        // Refresh the display
        displayTopics(knowledgeBaseData);

    } catch (error) {
        console.error('Error:', error);
        // Show error in the modal
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-500 mt-2';
        errorDiv.textContent = 'Failed to delete topic. Please try again.';
        button.parentElement.insertBefore(errorDiv, button);
    }
}

function deleteTopic(topicId) {
    const topic = knowledgeBaseData.find(t => t.id === topicId);
    if (!topic) return;
    showDeleteConfirmation(topicId, topic.title);
} 