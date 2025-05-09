document.addEventListener('DOMContentLoaded', function() {
    fetchKnowledgeBase();
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
        const topicElement = createTopicElement(topic);
        container.appendChild(topicElement);
        
        // Find and display child topics
        const children = topics.filter(t => t.parent_id === topic.id);
        if (children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'ml-6 mt-4 space-y-4';
            children.forEach(child => {
                childrenContainer.appendChild(createTopicElement(child));
            });
            topicElement.appendChild(childrenContainer);
        }
    });
}

function createTopicElement(topic) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow';
    
    const content = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="text-lg font-semibold text-gray-900">${topic.title}</h3>
                <div class="mt-2 text-gray-600">
                    ${formatTopicContent(topic)}
                </div>
            </div>
        </div>
    `;
    
    div.innerHTML = content;
    return div;
}

function formatTopicContent(topic) {
    // Format the content based on metadata
    let content = '';
    
    if (topic.metadata.importance) {
        content += `<p class="mb-2">${topic.metadata.importance}</p>`;
    }
    
    if (topic.metadata.relation_to_parent) {
        content += `<p class="mb-2">${topic.metadata.relation_to_parent}</p>`;
    }
    
    if (topic.metadata.challenges) {
        content += '<div class="mt-2"><strong>Key Challenges:</strong><ul class="list-disc ml-4 mt-1">';
        topic.metadata.challenges.slice(0, 3).forEach(challenge => {
            content += `<li>${challenge}</li>`;
        });
        content += '</ul></div>';
    }
    
    return content;
} 