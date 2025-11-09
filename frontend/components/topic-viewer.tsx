"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Check, X, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

interface TopicViewerProps {
  topic: Topic | null;
  onSave?: () => void;
  onSkip?: () => void;
  isLearned?: boolean;
}

export default function TopicViewer({
  topic,
  onSave,
  onSkip,
  isLearned = false,
}: TopicViewerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: topic
        ? `What would you like to know about ${topic.path.split("/").pop()}?`
        : "Select a topic to begin learning.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [buttonClicked, setButtonClicked] = useState<"learned" | "skip" | null>(
    null
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (topic) {
      setIsTransitioning(true);
      // Fade out first
      setTimeout(() => {
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: `What would you like to know about ${topic.path
              .split("/")
              .pop()}?`,
          },
        ]);
        setButtonClicked(null);
        // Fade in after content update
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 150);
    }
  }, [topic]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !topic) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    setTimeout(() => {
      const topicName = topic.path.split("/").pop() || "this concept";
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `That's a great question about ${topicName}. It's a powerful concept that can help improve your code. Would you like to know more about specific aspects?`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 800);
  };

  const handleSave = () => {
    setButtonClicked("learned");
    setShowSuccessAnimation(true);

    // Wait for success animation to play
    setTimeout(() => {
      if (onSave) {
        onSave();
      }
      setShowSuccessAnimation(false);
    }, 600);
  };

  const handleSkip = () => {
    setButtonClicked("skip");
    if (onSkip) {
      onSkip();
    }
  };

  if (!topic) {
    return (
      <div className="space-y-12 max-w-3xl">
        <div className="space-y-2">
          <h2 className="text-4xl font-light tracking-tight text-foreground">
            Welcome
          </h2>
          <p className="text-sm text-muted-foreground font-light">
            Generate topics to start learning
          </p>
        </div>
      </div>
    );
  }

  const topicName = topic.path.split("/").pop() || topic.path;

  return (
    <div className="space-y-12 max-w-3xl relative">
      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="relative animate-in fade-in zoom-in duration-300">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative bg-primary rounded-full p-8 shadow-2xl">
              <Check
                className="w-16 h-16 text-primary-foreground animate-in zoom-in duration-200"
                strokeWidth={3}
              />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-primary animate-spin" />
            <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-accent animate-ping" />
          </div>
        </div>
      )}

      <div
        className={`space-y-2 transition-all duration-300 ${
          isTransitioning
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        <h2 className="text-4xl font-light tracking-tight text-foreground">
          {topicName}
        </h2>
        <div className="flex items-center gap-2 text-sm font-light">
          {topic.path.split("/").map((part, index, array) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className={
                  index === array.length - 1
                    ? "text-primary"
                    : "text-muted-foreground"
                }
              >
                {part}
              </span>
              {index < array.length - 1 && (
                <span className="text-muted-foreground/40">/</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Tabs
        defaultValue="explain"
        className={`w-full max-w-3xl transition-all duration-300 ${
          isTransitioning
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        <TabsList className="grid w-full grid-cols-3 bg-transparent border-b border-border p-0 h-auto gap-8">
          <TabsTrigger
            value="explain"
            className="rounded-none border border-transparent data-[state=active]:border-primary data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-b-[3px] bg-transparent px-0 py-3 font-light text-sm w-[150px] transition-all hover:text-primary/70"
          >
            Explanation
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="rounded-none border border-transparent data-[state=active]:border-primary data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-b-[3px] bg-transparent px-0 py-3 font-light text-sm w-[150px] transition-all hover:text-primary/70"
          >
            Code
          </TabsTrigger>
          <TabsTrigger
            value="usecases"
            className="rounded-none border border-transparent data-[state=active]:border-primary data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-b-[3px] bg-transparent px-0 py-3 font-light text-sm w-[150px] transition-all hover:text-primary/70"
          >
            Use Cases
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="explain"
          className="space-y-4 mt-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="space-y-4 text-xs leading-relaxed">
            {topic.description.split("\n").map((paragraph, idx) => (
              <p
                key={idx}
                className="text-muted-foreground font-normal animate-in fade-in slide-in-from-left-2 duration-300"
                style={{
                  animationDelay: `${idx * 50}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </TabsContent>

        <TabsContent
          value="code"
          className="space-y-4 mt-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="w-full">
            <div className="overflow-x-auto">
              <pre className="bg-[#1e1e1e] border border-border/50 rounded-lg p-6 hover:border-primary/30 transition-all">
                <code className="text-[13px] leading-relaxed font-mono text-[#b4b4b4] whitespace-pre block">
                  {topic.code_example}
                </code>
              </pre>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="usecases"
          className="space-y-4 mt-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="grid grid-cols-2 gap-3">
            {topic.use_cases.map((useCase, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                style={{
                  animationDelay: `${idx * 80}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <p className="text-sm text-foreground/70">{useCase}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {(onSave || onSkip) && (
        <div
          className={`flex gap-3 justify-center transition-all duration-300 ${
            isTransitioning
              ? "opacity-0 translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          {onSave && (
            <button
              onClick={handleSave}
              disabled={showSuccessAnimation}
              className={`group relative flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden ${
                isLearned
                  ? "bg-primary/20 text-primary border-2 border-primary shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground border-2 border-border hover:border-primary/40 hover:bg-primary/5 hover:scale-105 active:scale-95"
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 transition-opacity duration-300 ${
                  buttonClicked === "learned"
                    ? "opacity-100 animate-shimmer bg-[length:200%_100%]"
                    : "opacity-0"
                }`}
              ></div>
              <Check
                className={`h-4 w-4 relative transition-all duration-300 ${
                  isLearned
                    ? "opacity-100 rotate-0"
                    : "opacity-0 group-hover:opacity-50 -rotate-45 group-hover:rotate-0"
                }`}
              />
              <span className="relative">Mark as learned</span>
            </button>
          )}
          {onSkip && (
            <button
              onClick={handleSkip}
              className={`group flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                buttonClicked === "skip"
                  ? "bg-muted text-foreground border-2 border-border scale-95"
                  : "text-muted-foreground hover:text-foreground border-2 border-border hover:border-foreground/30 hover:bg-muted/50 hover:scale-105 active:scale-95"
              }`}
            >
              <X
                className={`h-4 w-4 transition-all duration-300 ${
                  buttonClicked === "skip"
                    ? "opacity-100 rotate-0"
                    : "opacity-0 group-hover:opacity-50 rotate-90 group-hover:rotate-0"
                }`}
              />
              Skip for now
            </button>
          )}
        </div>
      )}

      <div
        className={`border border-border/50 bg-muted/20 rounded-xl p-6 transition-all duration-300 ${
          isTransitioning
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        <h3 className="text-sm font-semibold text-foreground/80 mb-4">
          Follow-up Questions
        </h3>

        <div className="space-y-4">
          <div className="max-h-48 overflow-y-auto space-y-3 mb-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : index === 0
                      ? "bg-muted/40 text-muted-foreground/80 border border-border/30"
                      : "bg-card text-foreground/90 border border-border/50 shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="flex gap-2 pt-2 border-t border-border/30">
            <input
              type="text"
              placeholder="Ask anything about this topic..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all focus:scale-[1.01]"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
