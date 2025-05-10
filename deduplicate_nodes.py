import json

def deduplicate_knowledge_base():
    # Read the knowledge base
    with open('knowledge_base.json', 'r') as f:
        knowledge_base = json.load(f)
    
    # Create a dictionary to store nodes by title
    nodes_by_title = {}
    
    # First pass: Group nodes by title
    for node in knowledge_base:
        title = node['title']
        if title not in nodes_by_title:
            nodes_by_title[title] = []
        nodes_by_title[title].append(node)
    
    # Second pass: Keep only nodes with metadata when duplicates exist
    deduplicated_nodes = []
    duplicates_removed = 0
    
    for title, nodes in nodes_by_title.items():
        if len(nodes) > 1:
            # Find nodes with metadata
            nodes_with_metadata = [node for node in nodes if 'metadata' in node]
            
            if nodes_with_metadata:
                # Keep the first node with metadata
                deduplicated_nodes.append(nodes_with_metadata[0])
                duplicates_removed += len(nodes) - 1
            else:
                # If no nodes have metadata, keep the first one
                deduplicated_nodes.append(nodes[0])
                duplicates_removed += len(nodes) - 1
        else:
            # No duplicates, keep the single node
            deduplicated_nodes.append(nodes[0])
    
    # Save the deduplicated knowledge base
    with open('knowledge_base_deduplicated.json', 'w') as f:
        json.dump(deduplicated_nodes, f, indent=2)
    
    print(f"Deduplication complete!")
    print(f"Original node count: {len(knowledge_base)}")
    print(f"Deduplicated node count: {len(deduplicated_nodes)}")
    print(f"Duplicates removed: {duplicates_removed}")

if __name__ == "__main__":
    deduplicate_knowledge_base() 