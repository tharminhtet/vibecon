"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Search, ExternalLink, Loader2, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface KnowledgeNode {
  id: string;
  name: string;
  parent_id: string | null;
  created_date: string;
  description: string;
  github_link: string;
  children?: KnowledgeNode[];
  level?: number;
}

interface NodeDetail {
  description: string;
  code_example: string;
  use_cases: string[];
  path: string;
}

export default function KnowledgeMap() {
  const [allNodes, setAllNodes] = useState<KnowledgeNode[]>([]);
  const [nodeMap, setNodeMap] = useState<Map<string, KnowledgeNode>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const fetchKnowledgeBase = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(`${API_URL}/api/knowledge_base_all`);

      const rawData: KnowledgeNode[] = response.data.nodes;

      // Create a map for quick lookups
      const map = new Map<string, KnowledgeNode>();
      rawData.forEach((node) => {
        map.set(node.id, { ...node, children: [] });
      });

      // Build children relationships
      rawData.forEach((node) => {
        const currentNode = map.get(node.id);
        if (currentNode && node.parent_id && map.has(node.parent_id)) {
          const parent = map.get(node.parent_id);
          if (parent) {
            parent.children?.push(currentNode);
          }
        }
      });

      setAllNodes(rawData);
      setNodeMap(map);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch knowledge base");
    } finally {
      setLoading(false);
    }
  };

  const getParentHierarchy = (node: KnowledgeNode): KnowledgeNode[] => {
    const hierarchy: KnowledgeNode[] = [];
    let current: KnowledgeNode | undefined = node;

    while (current) {
      hierarchy.unshift(current);
      if (current.parent_id) {
        current = nodeMap.get(current.parent_id);
      } else {
        break;
      }
    }

    return hierarchy;
  };

  const handleNodeClick = (node: KnowledgeNode) => {
    setSelectedNode(node);

    // Parse description if it exists
    if (node.description && node.description.trim() !== "") {
      try {
        const parsedDetail = JSON.parse(node.description);
        setNodeDetail(parsedDetail);
      } catch (err) {
        setNodeDetail({
          description: node.description,
          code_example: "",
          use_cases: [],
          path: node.name,
        });
      }
    } else {
      setNodeDetail(null);
    }
  };

  const filteredNodes =
    searchQuery.trim() === ""
      ? []
      : allNodes.filter((node) =>
          node.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

  const renderSearchResults = () => {
    if (searchQuery.trim() === "") {
      return (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Search for a topic to explore the knowledge map
          </p>
        </div>
      );
    }

    if (filteredNodes.length === 0) {
      return (
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground">
            No topics found matching "{searchQuery}"
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredNodes.map((node) => (
          <button
            key={node.id}
            onClick={() => handleNodeClick(node)}
            className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {node.name}
            </p>
            {node.parent_id && nodeMap.has(node.parent_id) && (
              <p className="text-xs text-muted-foreground mt-1">
                in {nodeMap.get(node.parent_id)?.name}
              </p>
            )}
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading knowledge map...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const hierarchy = selectedNode ? getParentHierarchy(selectedNode) : [];
  const children = selectedNode?.children || [];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-muted border-2 border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-all"
        />
      </div>

      {/* Search Results or Selected Node */}
      {!selectedNode ? (
        renderSearchResults()
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Breadcrumb Hierarchy */}
          <div className="flex items-center gap-2 flex-wrap">
            {hierarchy.map((node, idx) => (
              <div key={node.id} className="flex items-center gap-2">
                <button
                  onClick={() => handleNodeClick(node)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    idx === hierarchy.length - 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  {node.name}
                </button>
                {idx < hierarchy.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* Node Details */}
          <div className="border border-border rounded-xl p-6 space-y-6 bg-muted/20">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                {selectedNode.name}
              </h2>
              {selectedNode.github_link && (
                <a
                  href={selectedNode.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on GitHub
                </a>
              )}
            </div>

            {/* Description and Details */}
            {nodeDetail ? (
              <div className="space-y-6">
                {/* Description */}
                {nodeDetail.description && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground/80">
                      Description
                    </h4>
                    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                      {nodeDetail.description
                        .split("\n")
                        .map(
                          (paragraph, idx) =>
                            paragraph.trim() && <p key={idx}>{paragraph}</p>
                        )}
                    </div>
                  </div>
                )}

                {/* Code Example */}
                {nodeDetail.code_example && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground/80">
                      Code Example
                    </h4>
                    <div className="overflow-x-auto">
                      <pre className="bg-[#1e1e1e] border border-border/50 rounded-lg p-4">
                        <code className="text-[13px] leading-relaxed font-mono text-[#b4b4b4] whitespace-pre block">
                          {nodeDetail.code_example}
                        </code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                {nodeDetail.use_cases && nodeDetail.use_cases.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground/80">
                      Use Cases
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {nodeDetail.use_cases.map((useCase, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-border hover:border-primary/50 transition-all"
                        >
                          <p className="text-sm text-foreground/70">
                            {useCase}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No additional details available for this topic.
              </p>
            )}
          </div>

          {/* Children Nodes */}
          {children.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80">
                Subtopics ({children.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleNodeClick(child)}
                    className="text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {child.name}
                    </p>
                    {child.description && child.description.trim() !== "" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to explore →
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Back to Search */}
          <button
            onClick={() => {
              setSelectedNode(null);
              setNodeDetail(null);
            }}
            className="text-sm text-primary hover:underline"
          >
            ← Back to search
          </button>
        </div>
      )}
    </div>
  );
}
