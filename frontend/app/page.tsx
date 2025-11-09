"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Sparkles, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import TopicViewer from "@/components/topic-viewer";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const HARDCODED_REPO = "tharminhtet/AiChatIOS";

interface Commit {
  commit_id: string;
  description: string;
}

interface Topic {
  path: string;
  description: string;
  code_example: string;
  use_cases: string[];
  parent_id: string | null;
  parent_temp_id: string | null;
}

export default function Home() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(
    new Set()
  );
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(
    new Set()
  );
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Topics state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(
    null
  );
  const [learnedTopics, setLearnedTopics] = useState<Set<number>>(new Set());

  // Settings state
  const [filters, setFilters] = useState({
    language: true,
    frameworks: true,
    libraries: true,
  });
  const [customInstructions, setCustomInstructions] = useState("");

  // Auto-sync on page load
  useEffect(() => {
    syncCommits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncCommits = async () => {
    setLoading(true);
    setError("");
    console.log("Syncing commits from:", HARDCODED_REPO);
    console.log("API URL:", API_URL);

    // Test health endpoint first
    try {
      console.log("Testing backend health...");
      const healthCheck = await axios.get(`${API_URL}/api/health`, {
        timeout: 5000,
      });
      console.log("Backend health:", healthCheck.data);
    } catch (healthError: any) {
      console.error("Backend health check failed:", healthError.message);
      setError(
        `Cannot connect to backend at ${API_URL}: ${healthError.message}`
      );
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/analyze_commits`,
        {
          repo_id: HARDCODED_REPO,
          branch: "main",
          max_commits: 20,
          update_last_sync: false,
        },
        {
          timeout: 10000,
        }
      );

      console.log("Sync response:", response.data);
      setCommits(response.data.commits);
      // Select all commits by default
      const allCommitIds = new Set<string>(
        response.data.commits.map((c: Commit) => c.commit_id)
      );
      setSelectedCommits(allCommitIds);
    } catch (err: any) {
      console.error("Sync error:", err);
      setError(
        err.response?.data?.detail || err.message || "Failed to sync commits"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (commitId: string) => {
    const newExpanded = new Set(expandedCommits);
    if (newExpanded.has(commitId)) {
      newExpanded.delete(commitId);
    } else {
      newExpanded.add(commitId);
    }
    setExpandedCommits(newExpanded);
  };

  const toggleSelect = (commitId: string) => {
    const newSelected = new Set(selectedCommits);
    if (newSelected.has(commitId)) {
      newSelected.delete(commitId);
    } else {
      newSelected.add(commitId);
    }
    setSelectedCommits(newSelected);
  };

  const generateTopics = async () => {
    if (selectedCommits.size === 0) {
      setError("Please select at least one commit");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const focusAreas = [];
      if (filters.language) focusAreas.push("language features");
      if (filters.frameworks) focusAreas.push("frameworks");
      if (filters.libraries) focusAreas.push("libraries");

      const response = await axios.post(`${API_URL}/api/generate_topics`, {
        repo_id: HARDCODED_REPO,
        commit_ids: Array.from(selectedCommits),
        root_language: "Python",
        user_instructions: customInstructions || undefined,
        focus_area: focusAreas.length > 0 ? focusAreas.join(", ") : undefined,
      });

      console.log("Generated topics:", response.data.topics);
      setTopics(response.data.topics);
      // Auto-select first topic
      if (response.data.topics.length > 0) {
        setSelectedTopicIndex(0);
      }

      // Update last sync after successful topic generation
      await axios.post(`${API_URL}/api/analyze_commits`, {
        repo_id: HARDCODED_REPO,
        branch: "main",
        max_commits: 20,
        update_last_sync: true,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate topics");
    } finally {
      setLoading(false);
    }
  };

  const truncateDescription = (desc: string, maxLength: number = 80) => {
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength) + "...";
  };

  const saveTopic = async () => {
    if (selectedTopicIndex === null) return;

    setLoading(true);
    setError("");
    try {
      const topic = topics[selectedTopicIndex];
      const nameParts = topic.path.split("/");
      const name = nameParts[nameParts.length - 1];

      await axios.post(`${API_URL}/api/save_learning`, {
        name: name,
        description: topic.description,
        parent_id: topic.parent_id,
        parent_temp_id: topic.parent_temp_id,
        github_link: `https://github.com/${HARDCODED_REPO}`,
      });

      // Mark as learned instead of removing
      setLearnedTopics((prev) => new Set(prev).add(selectedTopicIndex));

      // Move to next topic
      if (selectedTopicIndex < topics.length - 1) {
        setSelectedTopicIndex(selectedTopicIndex + 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save topic");
    } finally {
      setLoading(false);
    }
  };

  const skipTopic = () => {
    if (selectedTopicIndex === null) return;

    // Move to next topic
    if (selectedTopicIndex < topics.length - 1) {
      setSelectedTopicIndex(selectedTopicIndex + 1);
    } else if (selectedTopicIndex > 0) {
      setSelectedTopicIndex(selectedTopicIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Recent Changes
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              /{HARDCODED_REPO.split("/")[1]}
            </p>
            <a 
              href={`https://github.com/${HARDCODED_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {loading && commits.length === 0 && (
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Syncing commits...</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Timeline */}
          <div className="flex-1">
            <div className="space-y-0">
              {commits.map((commit, index) => (
                <div key={commit.commit_id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary mt-2.5" />
                    {index < commits.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-2 min-h-[6rem]" />
                    )}
                  </div>

                  <div className="flex-1 pb-8">
                    <div
                      className="w-full group"
                    >
                      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          checked={selectedCommits.has(commit.commit_id)}
                          onCheckedChange={() => toggleSelect(commit.commit_id)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleExpand(commit.commit_id)}
                        >
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-mono text-muted-foreground">
                              {commit.commit_id.slice(0, 7)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {index === 0
                                ? "newest"
                                : index === commits.length - 1
                                ? "last sync"
                                : `${index}`}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {expandedCommits.has(commit.commit_id)
                              ? commit.description
                              : truncateDescription(commit.description)}
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 mt-0.5 cursor-pointer ${
                            expandedCommits.has(commit.commit_id)
                              ? "rotate-180"
                              : ""
                          }`}
                          onClick={() => toggleExpand(commit.commit_id)}
                        />
                      </div>
                    </div>

                    {expandedCommits.has(commit.commit_id) && (
                      <div className="mt-2 ml-3 pl-3 border-l-2 border-accent/40 space-y-2">
                        <div className="bg-muted/30 rounded p-3 font-mono text-xs text-muted-foreground space-y-1">
                          <div>commit: {commit.commit_id}</div>
                          <div>repo: {HARDCODED_REPO}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-8 space-y-4">
              {/* Sync Commits */}
              <div className="border border-border rounded-lg p-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8"
                  onClick={syncCommits}
                  disabled={loading}
                >
                  {loading ? "Syncing..." : "Sync New Commits"}
                </Button>
              </div>

              {/* Generate Knowledge */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Generate Knowledge
                </h3>
                <Button
                  size="sm"
                  className="w-full mb-2 text-xs h-8"
                  onClick={generateTopics}
                  disabled={loading || selectedCommits.size === 0}
                >
                  {loading ? "Generating..." : "Generate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8 bg-transparent"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  {showSettings ? "Hide" : "Show"} Settings
                </Button>
              </div>

              {/* Settings */}
              {showSettings && (
                <div className="border border-border rounded-lg p-4 text-sm space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-2">
                      Focus Areas
                    </label>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="language"
                          checked={filters.language}
                          onCheckedChange={(checked) =>
                            setFilters((prev) => ({
                              ...prev,
                              language: checked as boolean,
                            }))
                          }
                        />
                        <label
                          htmlFor="language"
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          Languages
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="frameworks"
                          checked={filters.frameworks}
                          onCheckedChange={(checked) =>
                            setFilters((prev) => ({
                              ...prev,
                              frameworks: checked as boolean,
                            }))
                          }
                        />
                        <label
                          htmlFor="frameworks"
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          Frameworks
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="libraries"
                          checked={filters.libraries}
                          onCheckedChange={(checked) =>
                            setFilters((prev) => ({
                              ...prev,
                              libraries: checked as boolean,
                            }))
                          }
                        />
                        <label
                          htmlFor="libraries"
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          Libraries
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="instructions"
                      className="text-xs font-semibold text-foreground block mb-1.5"
                    >
                      Custom Instructions
                    </label>
                    <textarea
                      id="instructions"
                      placeholder="Add context..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      className="w-full px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generated Topics - Beautiful Learning UI */}
        {topics.length > 0 && (
          <div className="mt-12 border-t border-border pt-8">
            <div className="flex gap-8">
              {/* Topics Sidebar */}
              <aside className="w-64 flex-shrink-0">
                <div className="sticky top-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Topics ({topics.length})
                  </p>
                  <div className="space-y-2">
                    {topics.map((topic, index) => {
                      const topicName =
                        topic.path.split("/").pop() || topic.path;
                      const isSelected = selectedTopicIndex === index;
                      const isLearned = learnedTopics.has(index);

                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedTopicIndex(index)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted/50 text-left ${
                            isSelected ? "bg-muted/50" : ""
                          }`}
                        >
                          {isLearned ? (
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span
                            className={
                              isLearned
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {topicName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              {/* Topic Viewer */}
              <div className="flex-1">
                <TopicViewer
                  topic={
                    selectedTopicIndex !== null
                      ? topics[selectedTopicIndex]
                      : null
                  }
                  onSave={saveTopic}
                  onSkip={skipTopic}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
