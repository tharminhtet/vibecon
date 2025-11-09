from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
from dotenv import load_dotenv
from openai import OpenAI
import json

from github_commit_analyzer import GitHubCommitAnalyzer
from supabase_client import (
    get_knowledge_tree,
    save_learning,
    get_node_by_name,
    get_repo_sync_state,
    update_repo_sync_state,
)

load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
github_token = os.getenv("GITHUB_TOKEN")
openai_api_key = os.getenv("OPENAI_API_KEY")

if not github_token:
    raise ValueError("GITHUB_TOKEN not found in environment variables")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

github_analyzer = GitHubCommitAnalyzer(github_token)
openai_client = OpenAI(api_key=openai_api_key)


# Pydantic models
class AnalyzeCommitsRequest(BaseModel):
    repo_id: str
    branch: str = "main"
    max_commits: int = 20
    update_last_sync: bool = False


class GetCommitDiffsRequest(BaseModel):
    repo_id: str
    commit_ids: List[str]
    include_patch: bool = True


class GenerateTopicsRequest(BaseModel):
    repo_id: str
    commit_ids: List[str]
    root_language: str = "Python"
    user_instructions: Optional[str] = None
    focus_area: Optional[str] = None


class SaveLearningRequest(BaseModel):
    name: str
    description: str
    parent_id: Optional[str] = None
    parent_temp_id: Optional[str] = None
    github_link: Optional[str] = None


class TopicOutput(BaseModel):
    path: str
    description: str
    code_example: str
    use_cases: List[str]
    parent_id: Optional[str] = None
    parent_temp_id: Optional[str] = None


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/test")
def test_endpoint():
    return {"status": "ok", "message": "Backend is reachable", "timestamp": "now"}


@app.get("/api/knowledge_base/{root_name}")
def get_knowledge_base(root_name: str = "Python"):
    """
    Get the knowledge base tree structure.
    """
    try:
        result = get_knowledge_tree(root_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze_commits")
def analyze_commits(request: AnalyzeCommitsRequest):
    """
    Get commits newer than the last synced commit for this repository.
    If no sync state exists, get recent commits and create initial state.
    Only updates last sync state if update_last_sync is True.
    """
    try:
        # Get the last synced commit for this repo
        sync_state = get_repo_sync_state(request.repo_id)

        if sync_state:
            # Get commits since last sync
            since_commit_id = sync_state["last_commit_hash"]
            commits = github_analyzer.get_commits_since(
                repo_id=request.repo_id,
                since_commit_id=since_commit_id,
                branch=request.branch,
                max_commits=request.max_commits,
            )
        else:
            # First time syncing this repo - get recent commits
            # We'll use a special approach: get the latest commits
            url = f"https://api.github.com/repos/{request.repo_id}/commits"
            params = {"sha": request.branch, "per_page": min(request.max_commits, 10)}

            response = github_analyzer._make_request(url, params)
            commits = [
                {
                    "commit_id": commit["sha"],
                    "description": commit["commit"]["message"].split("\n")[0],
                }
                for commit in response
            ]

            # Store the most recent commit as the initial sync point only if update_last_sync is True
            if commits and request.update_last_sync:
                update_repo_sync_state(request.repo_id, commits[0]["commit_id"])

        # Update sync state with the newest commit only if update_last_sync is True
        if commits and sync_state and request.update_last_sync:
            update_repo_sync_state(request.repo_id, commits[0]["commit_id"])

        return {
            "commits": commits,
            "is_first_sync": sync_state is None,
            "last_synced_commit": (
                sync_state["last_commit_hash"] if sync_state else None
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/get_commit_diffs")
def get_commit_diffs(request: GetCommitDiffsRequest):
    """
    Get diffs for specified commits.
    """
    try:
        diffs = github_analyzer.get_multiple_commit_diffs(
            repo_id=request.repo_id,
            commit_ids=request.commit_ids,
            include_patch=request.include_patch,
        )
        return {"diffs": diffs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate_topics")
def generate_topics(request: GenerateTopicsRequest):
    """
    Generate learning topics from commit diffs using LLM.
    """
    try:
        # Get knowledge base tree
        kb_result = get_knowledge_tree(request.root_language)
        kb_tree = kb_result["tree_string"]
        kb_data = kb_result["raw_data"]

        # Get commit diffs
        diffs = github_analyzer.get_multiple_commit_diffs(
            repo_id=request.repo_id, commit_ids=request.commit_ids, include_patch=True
        )

        # Load system prompt from file
        prompt_file_path = os.path.join(os.path.dirname(__file__), "prompt.txt")
        with open(prompt_file_path, "r") as f:
            system_prompt_template = f.read()

        # Format prompt with knowledge base tree
        system_prompt = system_prompt_template.format(kb_tree=kb_tree)

        user_prompt = f"""Analyze these commit diffs and generate learning topics:

{diffs}
"""

        if request.user_instructions:
            user_prompt += f"\n\nAdditional instructions: {request.user_instructions}"

        if request.focus_area:
            user_prompt += f"\n\nFocus on: {request.focus_area}"

        # Call OpenAI with structured output
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "learning_topics",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "topics": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "path": {"type": "string"},
                                        "description": {"type": "string"},
                                        "code_example": {"type": "string"},
                                        "use_cases": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                        "parent_id": {"type": ["string", "null"]},
                                        "parent_temp_id": {"type": ["string", "null"]},
                                    },
                                    "required": [
                                        "path",
                                        "description",
                                        "code_example",
                                        "use_cases",
                                        "parent_id",
                                        "parent_temp_id",
                                    ],
                                    "additionalProperties": False,
                                },
                            }
                        },
                        "required": ["topics"],
                        "additionalProperties": False,
                    },
                },
            },
        )

        # Parse response
        topics_data = json.loads(response.choices[0].message.content)

        # Match parent IDs from knowledge base
        for topic in topics_data["topics"]:
            path_parts = topic["path"].split("/")
            if len(path_parts) >= 2:
                parent_name = path_parts[-2]
                # Try to find parent in knowledge base
                for node in kb_data:
                    if node["name"] == parent_name:
                        topic["parent_id"] = node["id"]
                        topic["parent_temp_id"] = None
                        break

        return {"topics": topics_data["topics"], "knowledge_base_tree": kb_tree}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/save_learning")
def save_learning_endpoint(request: SaveLearningRequest):
    """
    Save a new learning topic to the database.
    Handles parent_temp_id by recursively creating parents.
    """
    try:
        # If parent_id is provided, save directly
        if request.parent_id:
            result = save_learning(
                name=request.name,
                description=request.description,
                parent_id=request.parent_id,
                github_link=request.github_link,
            )
            return result

        # If parent_temp_id is provided, we need to handle parent creation
        # This is a simplified version - in production, you'd need to track temp IDs
        # and resolve them in order
        if request.parent_temp_id:
            # For now, try to find parent by name from the path
            # This assumes the name contains path information
            result = save_learning(
                name=request.name,
                description=request.description,
                parent_id=None,
                github_link=request.github_link,
            )
            return result

        # No parent, save as root
        result = save_learning(
            name=request.name,
            description=request.description,
            parent_id=None,
            github_link=request.github_link,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/save_topics_batch")
def save_topics_batch(topics: List[SaveLearningRequest]):
    """
    Save multiple topics, handling parent_temp_id dependencies.
    """
    try:
        temp_id_map = {}  # Map temp IDs to real IDs
        saved_topics = []

        # Sort topics to ensure parents are created first
        # Topics without parent_temp_id or with parent_id come first
        sorted_topics = sorted(
            topics,
            key=lambda t: (
                t.parent_temp_id is not None and not t.parent_id,
                t.parent_temp_id or "",
            ),
        )

        for topic in sorted_topics:
            parent_id = topic.parent_id

            # Resolve parent_temp_id to real ID if needed
            if topic.parent_temp_id and topic.parent_temp_id in temp_id_map:
                parent_id = temp_id_map[topic.parent_temp_id]

            # Save the topic
            result = save_learning(
                name=topic.name,
                description=topic.description,
                parent_id=parent_id,
                github_link=topic.github_link,
            )

            saved_topics.append(result)

            # Store mapping if this topic had a temp ID
            if hasattr(topic, "temp_id"):
                temp_id_map[topic.temp_id] = result["id"]

        return {"saved_topics": saved_topics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
