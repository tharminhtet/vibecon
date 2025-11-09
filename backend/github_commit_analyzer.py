"""
GitHub Commit Analyzer

This module provides functions to interact with GitHub's API to:
1. Get all commits newer than a given commit
2. Get LLM-readable diffs for a specific commit

Requirements:
pip install requests
"""

import requests
from typing import List, Dict, Optional
from datetime import datetime


class GitHubCommitAnalyzer:
    """A class to analyze GitHub commits and diffs."""

    def __init__(self, github_token: Optional[str] = None):
        """
        Initialize the analyzer.

        Args:
            github_token: Optional GitHub personal access token for higher rate limits
                (5000 req/hr vs 60 req/hr unauthenticated)
        """
        self.base_url = "https://api.github.com"
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if github_token:
            self.headers["Authorization"] = f"token {github_token}"

    def _make_request(self, url: str, params: Optional[Dict] = None) -> Dict:
        """
        Make a request to the GitHub API.

        Args:
            url: The API endpoint URL
            params: Optional query parameters

        Returns:
            JSON response as a dictionary

        Raises:
            requests.exceptions.HTTPError: If the request fails
        """
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_commits_since(
        self,
        repo_id: str,
        since_commit_id: str,
        branch: str = "main",
        max_commits: int = 100,
    ) -> List[Dict[str, str]]:
        """
        Get all commits newer than a given commit ID.

        Args:
            repo_id: Repository in format "owner/repo" (e.g., "torvalds/linux")
            since_commit_id: The commit SHA to start from (exclusive)
            branch: The branch to query (default: "main")
            max_commits: Maximum number of commits to retrieve (default: 100)

        Returns:
            List of dictionaries with 'commit_id' and 'description' keys
        """
        url = f"{self.base_url}/repos/{repo_id}/commits"

        # First, get the timestamp of the reference commit
        try:
            ref_commit_url = (
                f"{self.base_url}/repos/{repo_id}/commits/{since_commit_id}"
            )
            ref_commit = self._make_request(ref_commit_url)
            since_date = ref_commit["commit"]["committer"]["date"]
        except requests.exceptions.HTTPError as e:
            raise ValueError(f"Could not find commit {since_commit_id}: {e}")

        # Get all commits since that date
        params = {"sha": branch, "since": since_date, "per_page": min(max_commits, 100)}

        all_commits = []
        page = 1

        while len(all_commits) < max_commits:
            params["page"] = page
            commits = self._make_request(url, params)

            if not commits:
                break

            for commit in commits:
                # Skip the reference commit itself
                if commit["sha"] == since_commit_id:
                    continue

                all_commits.append(
                    {
                        "commit_id": commit["sha"],
                        "description": commit["commit"]["message"].split("\n")[
                            0
                        ],  # First line only
                    }
                )

                if len(all_commits) >= max_commits:
                    break

            # If we got fewer results than per_page, we've reached the end
            if len(commits) < params["per_page"]:
                break

            page += 1

        return all_commits

    def get_commit_diff(
        self, repo_id: str, commit_id: str, include_patch: bool = True
    ) -> str:
        """
        Get the diff of a commit in LLM-readable format.

        Args:
            repo_id: Repository in format "owner/repo" (e.g., "torvalds/linux")
            commit_id: The commit SHA to get the diff for
            include_patch: Whether to include the actual diff patch (default: True)

        Returns:
            A formatted string containing:
            - Commit ID
            - Commit description (full message)
            - For each file: filename and diff
        """
        url = f"{self.base_url}/repos/{repo_id}/commits/{commit_id}"

        try:
            commit_data = self._make_request(url)
        except requests.exceptions.HTTPError as e:
            raise ValueError(f"Could not find commit {commit_id}: {e}")

        # Build the LLM-readable output
        output = []
        output.append(f"[Commit ID]")
        output.append(commit_data["sha"])
        output.append("")
        output.append(f"[Description]")
        output.append(commit_data["commit"]["message"])
        output.append("")
        output.append(f"[Author]")
        output.append(
            f"{commit_data['commit']['author']['name']} <{commit_data['commit']['author']['email']}>"
        )
        output.append("")
        output.append(f"[Date]")
        output.append(commit_data["commit"]["author"]["date"])
        output.append("")
        output.append(f"[Stats]")
        output.append(f"Files changed: {len(commit_data.get('files', []))}")
        if "stats" in commit_data:
            output.append(f"Additions: {commit_data['stats'].get('additions', 0)}")
            output.append(f"Deletions: {commit_data['stats'].get('deletions', 0)}")
        output.append("")
        output.append("=" * 80)
        output.append("")

        # Process each file
        for file_data in commit_data.get("files", []):
            output.append(f"[File]")
            output.append(file_data["filename"])
            output.append("")
            output.append(f"[Status]")
            output.append(file_data["status"])  # modified, added, removed, renamed
            output.append("")
            output.append(f"[Changes]")
            output.append(
                f"+{file_data.get('additions', 0)} -{file_data.get('deletions', 0)}"
            )
            output.append("")

            if include_patch and "patch" in file_data:
                output.append(f"[Diff]")
                output.append(file_data["patch"])
                output.append("")

            output.append("-" * 80)
            output.append("")

        return "\n".join(output)

    def get_multiple_commit_diffs(
        self, repo_id: str, commit_ids: List[str], include_patch: bool = True
    ) -> str:
        """
        Get diffs for multiple commits in LLM-readable format.

        Args:
            repo_id: Repository in format "owner/repo"
            commit_ids: List of commit SHAs
            include_patch: Whether to include the actual diff patches

        Returns:
            A formatted string with all commit diffs concatenated
        """
        all_diffs = []

        for i, commit_id in enumerate(commit_ids, 1):
            all_diffs.append(f"\n{'=' * 80}")
            all_diffs.append(f"COMMIT {i} of {len(commit_ids)}")
            all_diffs.append(f"{'=' * 80}\n")

            try:
                diff = self.get_commit_diff(repo_id, commit_id, include_patch)
                all_diffs.append(diff)
            except Exception as e:
                all_diffs.append(f"Error getting diff for {commit_id}: {e}\n")

        return "\n".join(all_diffs)