"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface Topic {
  path: string
  description: string
  code_example: string
  use_cases: string[]
  parent_id: string | null
  parent_temp_id: string | null
}

interface TopicViewerProps {
  topic: Topic | null
  onSave?: () => void
  onSkip?: () => void
}

export default function TopicViewer({ topic, onSave, onSkip }: TopicViewerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: topic ? `What would you like to know about ${topic.path.split("/").pop()}?` : "Select a topic to begin learning.",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasMarkedAsLearned, setHasMarkedAsLearned] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    if (topic) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: `What would you like to know about ${topic.path.split("/").pop()}?`,
        },
      ])
      setHasMarkedAsLearned(false)
    }
  }, [topic])

  const handleSendMessage = () => {
    if (!inputValue.trim() || !topic) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    setTimeout(() => {
      const topicName = topic.path.split("/").pop() || "this concept"
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `That's a great question about ${topicName}. It's a powerful concept that can help improve your code. Would you like to know more about specific aspects?`,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 800)
  }

  if (!topic) {
    return (
      <div className="space-y-12 max-w-3xl">
        <div className="space-y-2">
          <h2 className="text-4xl font-light tracking-tight text-foreground">Welcome</h2>
          <p className="text-sm text-muted-foreground font-light">Generate topics to start learning</p>
        </div>
      </div>
    )
  }

  const topicName = topic.path.split("/").pop() || topic.path

  return (
    <div className="space-y-12 max-w-3xl">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{topicName}</h2>
        <p className="text-sm text-muted-foreground">{topic.path}</p>
      </div>

      <Tabs defaultValue="explain" className="w-full max-w-3xl">
        <TabsList className="grid w-full grid-cols-3 bg-transparent border-b border-border p-0 h-auto gap-8">
          <TabsTrigger
            value="explain"
            className="rounded-none border border-transparent data-[state=active]:border-primary data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-b-[3px] bg-transparent px-0 py-3 text-sm w-[150px] transition-all duration-200"
          >
            Explanation
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="rounded-none border border-transparent data-[state=active]:border-primary data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-b-[3px] bg-transparent px-0 py-3 text-sm w-[150px] transition-all duration-200"
          >
            Code
          </TabsTrigger>
          <TabsTrigger
            value="usecases"
            className="rounded-none border border-transparent data-[state=active]:border-primary data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-b-[3px] bg-transparent px-0 py-3 text-sm w-[150px] transition-all duration-200"
          >
            Use Cases
          </TabsTrigger>
        </TabsList>

        <div className="relative h-[400px] mt-8">
          <TabsContent 
            value="explain" 
            className="absolute inset-0 data-[state=active]:animate-in data-[state=inactive]:animate-out data-[state=active]:fade-in-0 data-[state=inactive]:fade-out-0 data-[state=active]:slide-in-from-bottom-2 data-[state=inactive]:slide-out-to-top-2 duration-300 overflow-y-auto"
          >
            <div className="space-y-4 text-sm leading-relaxed font-sans">
              {topic.description.split("\n").map((paragraph, idx) => (
                <p key={idx} className="text-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </TabsContent>

          <TabsContent 
            value="code" 
            className="absolute inset-0 data-[state=active]:animate-in data-[state=inactive]:animate-out data-[state=active]:fade-in-0 data-[state=inactive]:fade-out-0 data-[state=active]:slide-in-from-bottom-2 data-[state=inactive]:slide-out-to-top-2 duration-300 overflow-y-auto"
          >
            <div className="w-full overflow-hidden">
              <pre className="bg-muted/30 border border-border rounded-lg p-6 overflow-x-auto max-w-full">
                <code className="text-sm font-mono text-foreground whitespace-pre">{topic.code_example}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent 
            value="usecases" 
            className="absolute inset-0 data-[state=active]:animate-in data-[state=inactive]:animate-out data-[state=active]:fade-in-0 data-[state=inactive]:fade-out-0 data-[state=active]:slide-in-from-bottom-2 data-[state=inactive]:slide-out-to-top-2 duration-300 overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-3">
              {topic.use_cases.map((useCase, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <p className="text-sm text-foreground">{useCase}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Action Buttons */}
      {(onSave || onSkip) && (
        <div className="flex gap-2 items-center">
          {onSave && (
            <button
              onClick={() => {
                setHasMarkedAsLearned(true)
                onSave()
              }}
              disabled={hasMarkedAsLearned}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                hasMarkedAsLearned 
                  ? "bg-primary/20 text-primary border border-primary cursor-not-allowed" 
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-transparent hover:border-primary/50"
              }`}
            >
              {hasMarkedAsLearned ? "✓ Marked as Learned" : "Mark as Learned"}
            </button>
          )}
          {onSkip && (
            <button
              onClick={onSkip}
              disabled={hasMarkedAsLearned}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                hasMarkedAsLearned
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Skip for Now
            </button>
          )}
        </div>
      )}

      <Card className="border-border bg-card/30 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-border">
          <h3 className="text-sm font-semibold">Ask a question</h3>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="max-h-48 overflow-y-auto space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground/80"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-xs text-muted-foreground">AI is thinking...</div>}
              <div ref={scrollRef} />
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Your question..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button onClick={handleSendMessage} disabled={isLoading} size="sm" className="px-3">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

