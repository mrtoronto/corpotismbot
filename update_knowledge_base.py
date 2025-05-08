import json
import os
import uuid

ONTOLOGY_FILE = "ontology.json"
KNOWLEDGE_BASE_FILE = "knowledge_base.json"

def load_json_file(file_path):
    """Loads data from a JSON file."""
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {file_path}")
        return None
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None

def save_json_file(data, file_path):
    """Saves data to a JSON file."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Successfully saved to {file_path}")
    except Exception as e:
        print(f"Error saving {file_path}: {e}")

def generate_kb_nodes_from_ontology_recursive(ontology_items, parent_id=None):
    """
    Recursively traverses the ontology structure and generates knowledge base nodes.
    Each node will have 'id', 'category', 'title', 'body', and 'parent_id'.
    """
    kb_nodes = []
    for item in ontology_items:
        title = item.get("name")
        if not title:
            continue # Skip items without a name

        category = "SUBTOPIC" if parent_id else "TOPIC"
        node_id = str(uuid.uuid4())

        node = {
            "id": node_id,
            "category": category,
            "title": title,
            "body": "",  # Initialize with an empty body
            "parent_id": parent_id
        }
        kb_nodes.append(node)

        if "subtopics" in item and item["subtopics"]:
            kb_nodes.extend(generate_kb_nodes_from_ontology_recursive(item["subtopics"], parent_id=node_id))
    
    return kb_nodes

def update_existing_nodes_with_ids(knowledge_base_nodes):
    """
    Ensures all existing nodes have IDs and updates parent references.
    Returns a mapping of (title, old_parent) -> new_id for reference updating.
    """
    id_mapping = {}
    
    # First pass: ensure all nodes have IDs and build mapping
    for node in knowledge_base_nodes:
        if "id" not in node:
            node["id"] = str(uuid.uuid4())
        
        # Create mapping from (title, parent_category) to id
        key = (node["title"], node.get("parent_category"))
        id_mapping[key] = node["id"]
        
    # Second pass: update parent references
    for node in knowledge_base_nodes:
        if "parent_category" in node:
            parent_title = node["parent_category"]
            if parent_title is not None:
                # Find the parent's ID from our mapping
                for (title, parent), node_id in id_mapping.items():
                    if title == parent_title:
                        node["parent_id"] = node_id
                        break
            else:
                node["parent_id"] = None
            # Remove the old parent_category field
            del node["parent_category"]
    
    return id_mapping

def main():
    print(f"Loading ontology from {ONTOLOGY_FILE}...")
    ontology_data = load_json_file(ONTOLOGY_FILE)
    if ontology_data is None:
        print(f"Ontology file {ONTOLOGY_FILE} not found or is invalid. Exiting.")
        return

    print(f"Loading existing knowledge base from {KNOWLEDGE_BASE_FILE}...")
    knowledge_base_nodes = load_json_file(KNOWLEDGE_BASE_FILE)
    if knowledge_base_nodes is None:
        print(f"{KNOWLEDGE_BASE_FILE} not found or invalid, starting with an empty knowledge base.")
        knowledge_base_nodes = []
    
    if not isinstance(knowledge_base_nodes, list):
        print(f"Warning: {KNOWLEDGE_BASE_FILE} did not contain a list. Resetting to an empty knowledge base.")
        knowledge_base_nodes = []

    # Update existing nodes with IDs if they don't have them
    if knowledge_base_nodes:
        print("Updating existing nodes with unique IDs...")
        update_existing_nodes_with_ids(knowledge_base_nodes)

    print("Generating nodes from ontology...")
    ontology_derived_kb_nodes = generate_kb_nodes_from_ontology_recursive(ontology_data)

    # Create a set of existing node identifiers using title and parent_id
    existing_node_identifiers = {(node["title"], node.get("parent_id")) for node in knowledge_base_nodes}

    new_nodes_added_count = 0
    for new_node in ontology_derived_kb_nodes:
        node_identifier = (new_node["title"], new_node.get("parent_id"))
        if node_identifier not in existing_node_identifiers:
            knowledge_base_nodes.append(new_node)
            existing_node_identifiers.add(node_identifier)
            new_nodes_added_count += 1
            print(f"  Adding new node: Title='{new_node['title']}', ID='{new_node['id']}'")

    if new_nodes_added_count > 0:
        print(f"Added {new_nodes_added_count} new nodes to the knowledge base.")
    else:
        print("No new nodes from the ontology to add. Knowledge base is up-to-date with the current ontology structure.")

    print(f"Saving updated knowledge base to {KNOWLEDGE_BASE_FILE}...")
    save_json_file(knowledge_base_nodes, KNOWLEDGE_BASE_FILE)

    print("Knowledge base update process complete.")

if __name__ == "__main__":
    main() 