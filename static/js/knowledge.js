document.addEventListener('DOMContentLoaded', function() {
    fetchKnowledgeBase();
    
    // Add event listeners for expand/collapse buttons
    document.getElementById('expandAll').addEventListener('click', expandAllTopics);
    document.getElementById('collapseAll').addEventListener('click', collapseAllTopics);
});

async function fetchKnowledgeBase() {
    try {
        const response = await fetch('/api/knowledge');
        if (!response.ok) {
            throw new Error('Failed to fetch knowledge base');
        }
        const data = await response.json();
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
        <div class="topic-header flex items-start justify-between cursor-pointer" onclick="toggleTopic(this)">
            <div class="flex-grow">
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
        </div>
        
        <div class="topic-content mt-4 hidden">
            ${formatTopicContent(topic)}
            
            ${hasChildren ? `
                <div class="children-container mt-6 ml-6 space-y-4">
                    ${children.map(child => createTopicElement(child, allTopics).outerHTML).join('')}
                </div>
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