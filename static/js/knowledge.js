document.addEventListener('DOMContentLoaded', function() {
    // Create a container for the network
    const container = document.getElementById('network-container');
    let network = null;
    let knowledgeBaseData = [];

    // Initialize the network visualization
    async function initNetwork() {
        try {
            const response = await fetch('/api/knowledge');
            if (!response.ok) {
                throw new Error('Failed to fetch knowledge base');
            }
            knowledgeBaseData = await response.json();
            console.log('Fetched knowledge base:', knowledgeBaseData);
            
            // Create the network data
            const { nodes, edges } = createNetworkData(knowledgeBaseData);
            
            const options = {
                nodes: {
                    shape: 'box',
                    margin: 30,
                    font: {
                        size: 18,
                        face: 'arial',
                        multi: true,
                        bold: {
                            color: '#2c3e50',
                            size: 18
                        }
                    },
                    borderWidth: 3,
                    shadow: {
                        enabled: true,
                        color: 'rgba(0,0,0,0.2)',
                        size: 15,
                        x: 5,
                        y: 5
                    },
                    scaling: {
                        min: 32,
                        max: 64,
                        label: {
                            enabled: true,
                            min: 32,
                            max: 64,
                            drawThreshold: 3,
                            maxVisible: 64
                        }
                    },
                    color: {
                        background: topic => topic.category === 'TOPIC' ? '#4CAF50' : '#2196F3',
                        border: topic => topic.category === 'TOPIC' ? '#2E7D32' : '#1565C0',
                        highlight: {
                            background: topic => topic.category === 'TOPIC' ? '#81C784' : '#64B5F6',
                            border: topic => topic.category === 'TOPIC' ? '#2E7D32' : '#1565C0'
                        }
                    },
                    widthConstraint: {
                        minimum: topic => topic.category === 'TOPIC' ? 600 : 200,
                        maximum: topic => topic.category === 'TOPIC' ? 800 : 300
                    },
                    heightConstraint: {
                        minimum: topic => topic.category === 'TOPIC' ? 150 : 50
                    }
                },
                edges: {
                    width: 3,
                    color: {
                        color: '#78909C',
                        highlight: '#455A64',
                        hover: '#455A64'
                    },
                    arrows: {
                        to: {
                            enabled: true,
                            scaleFactor: 1.5,
                            type: 'arrow'
                        }
                    },
                    smooth: {
                        enabled: true,
                        type: 'dynamic',
                        roundness: 0.5,
                        forceDirection: 'none'
                    },
                    selectionWidth: 2,
                    hoverWidth: 2
                },
                physics: {
                    enabled: true,
                    solver: 'forceAtlas2Based',
                    forceAtlas2Based: {
                        gravitationalConstant: -3000,
                        centralGravity: 0.01,
                        springLength: 400,
                        springConstant: 0.05,
                        damping: 0.4,
                        avoidOverlap: 1.5
                    },
                    stabilization: {
                        enabled: true,
                        iterations: 2000,
                        updateInterval: 25,
                        fit: true
                    },
                    adaptiveTimestep: true,
                    minVelocity: 0.5
                },
                layout: {
                    randomSeed: 2,
                    improvedLayout: true,
                    hierarchical: {
                        enabled: false
                    }
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 200,
                    zoomView: true,
                    dragView: true,
                    navigationButtons: true,
                    keyboard: true,
                    hideEdgesOnDrag: false,
                    hideEdgesOnZoom: false
                }
            };
            
            // Create the network
            network = new vis.Network(container, { nodes, edges }, options);

            // Add loading message
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded shadow-lg z-50';
            loadingDiv.textContent = 'Organizing network...';
            document.body.appendChild(loadingDiv);

            // Remove loading message after stabilization
            network.once('stabilizationIterationsDone', function() {
                loadingDiv.remove();
                // Fit the network to view after stabilization
                network.fit({
                    animation: {
                        duration: 1000,
                        easingFunction: 'easeInOutQuad'
                    }
                });
            });
            
            // Handle node click events
            network.on('click', function(params) {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    showTopicDetails(nodeId);
                }
            });

            // Handle double click events for zooming to a node
            network.on('doubleClick', function(params) {
                if (params.nodes.length > 0) {
                    network.focus(params.nodes[0], {
                        scale: 1.2,
                        animation: {
                            duration: 1000,
                            easingFunction: 'easeInOutQuad'
                        }
                    });
                }
            });

            // Add hover tooltips
            network.on('hoverNode', function(params) {
                const node = nodes.get(params.node);
                const topic = knowledgeBaseData.find(t => t.id === node.id);
                if (topic) {
                    const tooltip = createTooltipContent(topic);
                    node.title = tooltip;
                    nodes.update(node);
                }
            });

        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p>Failed to load knowledge base. Please try again later.</p>
                </div>
            `;
        }
    }

    function createNetworkData(topics) {
        if (!Array.isArray(topics)) {
            console.error('Invalid topics data:', topics);
            return { nodes: new vis.DataSet(), edges: new vis.DataSet() };
        }

        const nodes = new vis.DataSet();
        const edges = new vis.DataSet();
        
        // Debug log
        console.log('Creating network with topics:', topics);
        
        // First pass: Create all nodes
        topics.forEach(topic => {
            if (!topic || typeof topic !== 'object' || !topic.id) {
                console.error('Invalid topic:', topic);
                return;
            }

            // Debug log
            console.log('Creating node for topic:', topic);

            nodes.add({
                id: topic.id,
                label: topic.title || 'Untitled Topic',
                category: topic.category,
                color: {
                    background: topic.category === 'TOPIC' ? '#4CAF50' : '#2196F3',
                    border: topic.category === 'TOPIC' ? '#2E7D32' : '#1565C0',
                    highlight: {
                        background: topic.category === 'TOPIC' ? '#81C784' : '#64B5F6',
                        border: topic.category === 'TOPIC' ? '#2E7D32' : '#1565C0'
                    }
                },
                font: {
                    color: '#000000',
                    size: topic.category === 'TOPIC' ? 48 : 18,
                    face: 'arial',
                    bold: topic.category === 'TOPIC',
                    mod: topic.category === 'TOPIC' ? 'bold' : undefined
                },
                size: topic.category === 'TOPIC' ? 120 : 30,
                widthConstraint: {
                    minimum: topic.category === 'TOPIC' ? 600 : 200,
                    maximum: topic.category === 'TOPIC' ? 800 : 300
                },
                heightConstraint: {
                    minimum: topic.category === 'TOPIC' ? 150 : 50
                }
            });
        });
        
        // Second pass: Create all edges with proper connections
        topics.forEach(topic => {
            // Debug log parent relationships
            console.log('Processing topic:', {
                id: topic.id,
                title: topic.title,
                parent_id: topic.parent_id,
                category: topic.category
            });

            // Check for parent_id directly on the topic object
            if (topic && topic.id && topic.parent_id) {
                // Verify both nodes exist before creating edge
                const parentNode = nodes.get(topic.parent_id);
                const currentNode = nodes.get(topic.id);
                
                if (parentNode && currentNode) {
                    console.log('Creating edge:', {
                        from: topic.parent_id,
                        to: topic.id,
                        fromNode: parentNode.label,
                        toNode: currentNode.label
                    });
                    
                    try {
                        edges.add({
                            from: topic.parent_id,
                            to: topic.id,
                            arrows: {
                                to: {
                                    enabled: true,
                                    scaleFactor: 1.5
                                }
                            },
                            color: {
                                color: '#2B7CE9',
                                highlight: '#1B5299',
                                hover: '#1B5299'
                            },
                            width: 3,
                            smooth: {
                                type: 'cubicBezier',
                                forceDirection: 'vertical',
                                roundness: 0.4
                            }
                        });
                    } catch (error) {
                        console.error('Failed to create edge:', error, {
                            from: topic.parent_id,
                            to: topic.id
                        });
                    }
                } else {
                    console.warn('Missing nodes for edge:', {
                        parent_exists: !!parentNode,
                        parent_id: topic.parent_id,
                        current_exists: !!currentNode,
                        current_id: topic.id
                    });
                }
            }
        });

        // Verify edge creation
        const createdEdges = edges.get();
        console.log('Created edges:', createdEdges.length, createdEdges);
        
        // Verify node-edge consistency
        const nodeIds = new Set(nodes.get().map(n => n.id));
        const invalidEdges = createdEdges.filter(edge => 
            !nodeIds.has(edge.from) || !nodeIds.has(edge.to)
        );
        
        if (invalidEdges.length > 0) {
            console.warn('Found invalid edges:', invalidEdges);
        }
        
        // Debug log final network data
        console.log('Created network data:', {
            nodes: nodes.get(),
            edges: edges.get()
        });
        
        return { nodes, edges };
    }

    function createTooltipContent(topic) {
        if (!topic) return '';

        let tooltip = `<b>${topic.title || 'Untitled Topic'}</b>\n${topic.category || 'Unknown Category'}`;
        
        if (topic.metadata) {
            if (topic.metadata.importance) {
                tooltip += `\n\nImportance: ${topic.metadata.importance}`;
            }
            if (topic.metadata.relation_to_parent) {
                tooltip += `\n\nRelation: ${topic.metadata.relation_to_parent}`;
            }
            
            const challenges = topic.metadata.challenges;
            if (challenges && Array.isArray(challenges) && challenges.length > 0) {
                tooltip += '\n\nKey Challenges:';
                challenges.forEach(challenge => {
                    tooltip += `\n• ${challenge}`;
                });
            }
        }

        return tooltip;
    }

    function showTopicDetails(topicId) {
        const topic = knowledgeBaseData.find(t => t.id === topicId);
        if (!topic) return;

        // Remove any existing popups
        const existingPopup = document.querySelector('.topic-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const detailsHtml = `
            <div class="topic-popup fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">${topic.title || 'Untitled Topic'}</h2>
                            <p class="text-sm text-gray-500 mt-1">${topic.category || 'Unknown Category'}</p>
                        </div>
                        <button class="close-popup text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    ${topic.metadata?.importance ? `
                        <p class="text-gray-700 mb-6">${topic.metadata.importance}</p>
                    ` : ''}
                    <div class="flex justify-end space-x-3">
                        <a href="/topic/${topic.id}" 
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            View Full Details
                        </a>
                        <button class="close-popup px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        const detailsElement = document.createElement('div');
        detailsElement.innerHTML = detailsHtml;
        document.body.appendChild(detailsElement);

        // Add click event listeners for closing
        const popup = document.querySelector('.topic-popup');
        const closeButtons = popup.querySelectorAll('.close-popup');
        
        // Close on clicking the close buttons
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                popup.remove();
            });
        });

        // Close on clicking outside the content
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });

        // Close on pressing Escape key
        document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
                popup.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
    }

    function formatTopicContent(topic) {
        let content = '';
        
        // Add importance or relation to parent
        if (topic.metadata && topic.metadata.importance) {
            content += `
                <div class="mb-6">
                    <h4 class="font-semibold text-gray-700 mb-2">Importance</h4>
                    <p class="text-gray-600">${topic.metadata.importance}</p>
                </div>
            `;
        }
        
        if (topic.metadata && topic.metadata.relation_to_parent) {
            content += `
                <div class="mb-6">
                    <h4 class="font-semibold text-gray-700 mb-2">Relation to Parent Topic</h4>
                    <p class="text-gray-600">${topic.metadata.relation_to_parent}</p>
                </div>
            `;
        }
        
        // Add challenges section
        if (topic.metadata && topic.metadata.challenges && Array.isArray(topic.metadata.challenges) && topic.metadata.challenges.length > 0) {
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
        if (topic.metadata && topic.metadata.strategies && Array.isArray(topic.metadata.strategies) && topic.metadata.strategies.length > 0) {
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
        if (topic.metadata && topic.metadata.examples && Array.isArray(topic.metadata.examples) && topic.metadata.examples.length > 0) {
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
        if (topic.metadata && topic.metadata.action_steps && Array.isArray(topic.metadata.action_steps) && topic.metadata.action_steps.length > 0) {
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

    async function deleteTopic(topicId) {
        if (!confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
            return;
        }

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

            // Refresh the network
            initNetwork();

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to delete topic. Please try again.');
        }
    }

    // Initialize the network
    initNetwork();

    // Add event listeners for admin controls if logged in
    if (isLoggedIn) {
        document.getElementById('addTopic').addEventListener('click', addNewTopic);
    }
}); 