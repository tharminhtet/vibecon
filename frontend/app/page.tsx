"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Sparkles,
  CheckCircle,
  Circle,
  Send,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import TopicViewer from "@/components/topic-viewer";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

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
  github_commit_link: string;
}

export default function Home() {
  // Repo state
  const [repoUrl, setRepoUrl] = useState("");
  const [currentRepo, setCurrentRepo] = useState<string | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(
    new Set()
  );
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(
    new Set()
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Ref for scrolling to topics section
  const topicsSectionRef = useRef<HTMLDivElement>(null);

  const parseRepoUrl = (url: string): string | null => {
    // Handle github.com URLs
    const githubMatch = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (githubMatch) {
      return githubMatch[1].replace(/\.git$/, "");
    }

    // Handle direct owner/repo format
    if (/^[^\/]+\/[^\/]+$/.test(url.trim())) {
      return url.trim();
    }

    return null;
  };

  const handleRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRepo = parseRepoUrl(repoUrl);

    if (!parsedRepo) {
      setError("Please enter a valid GitHub repo URL or owner/repo format");
      return;
    }

    setCurrentRepo(parsedRepo);
    setError("");
    await syncCommits(parsedRepo);
  };

  const syncCommits = async (repo: string = currentRepo!) => {
    if (!repo) return;

    setIsSyncing(true);
    setError("");

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
      setIsSyncing(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/analyze_commits`,
        {
          repo_id: repo,
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
      setIsSyncing(false);
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

    if (!currentRepo) {
      setError("No repository selected");
      return;
    }

    setIsGenerating(true);
    setError("");
    try {
      const focusAreas = [];
      if (filters.language) focusAreas.push("language features");
      if (filters.frameworks) focusAreas.push("frameworks");
      if (filters.libraries) focusAreas.push("libraries");

      const response = await axios.post(`${API_URL}/api/generate_topics`, {
        repo_id: currentRepo,
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
        repo_id: currentRepo,
        branch: "main",
        max_commits: 20,
        update_last_sync: true,
      });

      // Scroll to topics section with offset for better positioning
      requestAnimationFrame(() => {
        if (topicsSectionRef.current) {
          const yOffset = -120; // Scroll a bit higher than the element
          const elementTop =
            topicsSectionRef.current.getBoundingClientRect().top;
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
          const targetPosition = elementTop + scrollTop + yOffset;

          window.scrollTo({ top: targetPosition, behavior: "smooth" });
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate topics");
    } finally {
      setIsGenerating(false);
    }
  };

  const truncateDescription = (desc: string, maxLength: number = 100) => {
    if (desc.length <= maxLength) return desc;

    // Find the last space before maxLength to avoid cutting words
    const truncated = desc.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > 0) {
      return desc.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
  };

  const saveTopic = async () => {
    if (selectedTopicIndex === null || !currentRepo) return;

    setError("");
    try {
      const topic = topics[selectedTopicIndex];
      const nameParts = topic.path.split("/");
      const name = nameParts[nameParts.length - 1];

      // Combine all topic content into a structured blob
      const fullTopicContent = JSON.stringify({
        description: topic.description,
        code_example: topic.code_example,
        use_cases: topic.use_cases,
        path: topic.path,
      });

      await axios.post(`${API_URL}/api/save_learning`, {
        name: name,
        description: fullTopicContent,
        parent_id: topic.parent_id,
        parent_temp_id: topic.parent_temp_id,
        github_link: topic.github_commit_link,
      });

      // Mark as learned instead of removing
      setLearnedTopics((prev) => new Set(prev).add(selectedTopicIndex));

      // Move to next topic
      if (selectedTopicIndex < topics.length - 1) {
        setSelectedTopicIndex(selectedTopicIndex + 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save topic");
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

  // Example repos for the landing page
  const exampleRepos = [
    { name: "facebook/react", desc: "A JavaScript library for building UIs" },
    { name: "vercel/next.js", desc: "The React Framework" },
    { name: "microsoft/vscode", desc: "Visual Studio Code" },
  ];

  const handleExampleClick = async (repoId: string) => {
    setRepoUrl(repoId);
    setCurrentRepo(repoId);
    setError("");
    await syncCommits(repoId);
  };

  const handleBackToHome = () => {
    setCurrentRepo(null);
    setRepoUrl("");
    setCommits([]);
    setSelectedCommits(new Set());
    setTopics([]);
    setSelectedTopicIndex(null);
    setLearnedTopics(new Set());
    setError("");
  };

  // If no repo is selected, show landing page
  if (!currentRepo) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-12">
        <div className="max-w-2xl w-full mx-auto -mt-20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold tracking-tight">
              <span className="text-foreground">Learn while </span>
              <span className="text-primary">vibecoding</span>
            </h1>
          </div>

          <form onSubmit={handleRepoSubmit} className="space-y-4 mb-12">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="github.com/owner/repo"
                className="flex-1 px-6 py-4 bg-muted border-2 border-border rounded-lg text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-border transition-all"
                disabled={isSyncing}
              />
              <button
                type="submit"
                disabled={isSyncing || !repoUrl.trim()}
                className="p-4 text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                aria-label="Submit repository"
              >
                {isSyncing ? (
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Send className="w-6 h-6" />
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </form>

          {/* Recent/Example Repos */}
          <div>
            <p className="text-sm text-muted-foreground mb-3 text-center">
              Or try these popular repositories
            </p>
            <div className="space-y-2">
              {exampleRepos.map((repo) => (
                <button
                  key={repo.name}
                  onClick={() => handleExampleClick(repo.name)}
                  disabled={isSyncing}
                  className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {repo.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {repo.desc}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:text-primary transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToHome}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-md text-muted-foreground">
                    /{currentRepo.split("/")[1]}
                  </p>
                  <a
                    href={`https://github.com/${currentRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#47494b] hover:bg-[] transition-colors"
                    title="View on GitHub"
                  >
                    <svg
                      height="16"
                      width="16"
                      viewBox="0 0 16 16"
                      fill="white"
                      aria-hidden="true"
                    >
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    <span className="text-xs font-medium text-white">
                      GitHub
                    </span>
                  </a>
                </div>
                {commits.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {commits.length} commit{commits.length !== 1 ? "s" : ""}{" "}
                    since last session
                  </p>
                )}
              </div>
            </div>
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

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Generating Indicator */}
        {isGenerating && (
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
              <p className="text-xs font-medium text-foreground">
                Generating knowledge topics...
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Timeline */}
          <div className="flex-1">
            {isSyncing && commits.length === 0 ? (
              <div className="py-12 px-8">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground mb-2">
                      Syncing commits
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fetching latest changes from repository...
                    </p>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div className="absolute h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-loading-slide"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {commits.map((commit, index) => (
                  <div
                    key={commit.commit_id}
                    className="flex gap-4 animate-fade-in-down"
                    style={{
                      animationDelay: `${index * 120}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <div className="flex flex-col items-center pt-[18px]">
                      <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                      {index < commits.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-2" />
                      )}
                    </div>

                    <div className="flex-1 pb-8">
                      <div className="w-full group">
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={selectedCommits.has(commit.commit_id)}
                            onCheckedChange={() =>
                              toggleSelect(commit.commit_id)
                            }
                            className="mt-[3px] flex-shrink-0"
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
                            <p className="text-sm font-medium text-foreground transition-all duration-200">
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
                        <div className="mt-3 ml-9 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                                Commit Message
                              </p>
                              <p className="text-sm text-foreground leading-relaxed">
                                {commit.description}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-border/50">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">
                                Commit Details
                              </p>
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-muted-foreground min-w-[60px]">
                                    Hash:
                                  </span>
                                  <code className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {commit.commit_id}
                                  </code>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-muted-foreground min-w-[60px]">
                                    Link:
                                  </span>
                                  <a
                                    href={`https://github.com/${currentRepo}/commit/${commit.commit_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    View on GitHub →
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-8 space-y-4">
              {/* Generate Knowledge */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Generate Knowledge
                  </h3>
                </div>
                <Button
                  size="sm"
                  className="w-full mb-2 text-xs h-8 hover:bg-primary/80 hover:scale-[1.02] transition-all relative overflow-hidden group"
                  onClick={generateTopics}
                  disabled={
                    isSyncing || isGenerating || selectedCommits.size === 0
                  }
                >
                  {isGenerating ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary animate-shimmer bg-[length:200%_100%]"></div>
                      <span className="relative flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span className="animate-pulse">Generating...</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                      Generate
                    </span>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8 bg-transparent hover:!bg-muted hover:!text-foreground hover:border-muted-foreground/40 transition-all"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  {showSettings ? "Hide" : "Show"} Settings
                </Button>
              </div>

              {/* Settings */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showSettings ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
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
              </div>
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
                  <p
                    ref={topicsSectionRef}
                    className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4"
                  >
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
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted/50 text-left relative ${
                            isSelected ? "bg-muted/50" : ""
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
                          )}
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
                  isLearned={
                    selectedTopicIndex !== null &&
                    learnedTopics.has(selectedTopicIndex)
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
