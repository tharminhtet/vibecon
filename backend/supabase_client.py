import os
from supabase import create_client
from typing import List, Dict, Optional
from dotenv import load_dotenv
from treeprinter import print_tree

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("Supabase credentials not found in environment variables")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_knowledge_tree(root_name: str = "Python") -> Dict:
    """
    Get the knowledge base tree structure from Supabase.
    
    Args:
        root_name: The root node name (default: "Python")
    
    Returns:
        Dictionary with 'tree_string' and 'raw_data' keys
    """
    result = supabase.rpc("get_tree", {"root_name": root_name}).execute()
    
    tree_string = print_tree(result.data)
    
    return {
        "tree_string": tree_string,
        "raw_data": result.data
    }


def save_learning(
    name: str,
    description: str,
    parent_id: Optional[str] = None,
    github_link: Optional[str] = None
) -> Dict:
    """
    Save a new learning node to the database.
    
    Args:
        name: The name of the topic
        description: Full description of the topic
        parent_id: UUID of the parent node (None for root)
        github_link: Optional GitHub link
    
    Returns:
        The created record
    """
    data = {
        "name": name,
        "description": description,
        "github_link": github_link
    }
    
    if parent_id:
        data["parent_id"] = parent_id
    
    result = supabase.table("programming_notes").insert(data).execute()
    
    return result.data[0] if result.data else None


def get_node_by_name(name: str) -> Optional[Dict]:
    """
    Get a node by its name.
    
    Args:
        name: The name of the node
    
    Returns:
        The node data or None
    """
    result = supabase.table("programming_notes").select("*").eq("name", name).execute()
    
    return result.data[0] if result.data else None


def get_repo_sync_state(repo_name: str) -> Optional[Dict]:
    """
    Get the sync state for a repository.
    
    Args:
        repo_name: The repository name (e.g., "owner/repo")
    
    Returns:
        The sync state data or None
    """
    result = supabase.table("repo_sync_state").select("*").eq("repo_name", repo_name).execute()
    
    return result.data[0] if result.data else None


def update_repo_sync_state(repo_name: str, last_commit_hash: str) -> Dict:
    """
    Update or create the sync state for a repository.
    
    Args:
        repo_name: The repository name (e.g., "owner/repo")
        last_commit_hash: The latest commit hash that was synced
    
    Returns:
        The created/updated record
    """
    # Check if repo exists
    existing = get_repo_sync_state(repo_name)
    
    if existing:
        # Update existing record
        result = supabase.table("repo_sync_state").update({
            "last_commit_hash": last_commit_hash,
            "last_synced_at": "now()"
        }).eq("repo_name", repo_name).execute()
    else:
        # Create new record
        result = supabase.table("repo_sync_state").insert({
            "repo_name": repo_name,
            "last_commit_hash": last_commit_hash
        }).execute()
    
    return result.data[0] if result.data else None