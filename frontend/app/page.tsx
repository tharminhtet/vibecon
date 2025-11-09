'use client'

import { useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
const HARDCODED_REPO = 'tharminhtet/AiChatIOS'

interface Commit {
  commit_id: string
  description: string
}

interface Topic {
  path: string
  description: string
  parent_id: string | null
  parent_temp_id: string | null
}

export default function Home() {
  const [commits, setCommits] = useState<Commit[]>([])
  const [selectedCommits, setSelectedCommits] = useState<string[]>([])
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set())
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isFirstSync, setIsFirstSync] = useState(false)
  const [lastSyncedCommit, setLastSyncedCommit] = useState<string | null>(null)
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [filters, setFilters] = useState({
    language: false,
    frameworks: false,
    libraries: false
  })
  const [customInstructions, setCustomInstructions] = useState('')
  
  // Question state for each topic
  const [topicQuestions, setTopicQuestions] = useState<{[key: number]: string}>({})

  // Auto-sync on page load
  React.useEffect(() => {
    syncCommits()
  }, [])

  const syncCommits = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.post(`${API_URL}/api/analyze_commits`, {
        repo_id: HARDCODED_REPO,
        branch: 'main',
        max_commits: 20
      })
      setCommits(response.data.commits)
      setSelectedCommits(response.data.commits.map((c: Commit) => c.commit_id))
      setIsFirstSync(response.data.is_first_sync)
      setLastSyncedCommit(response.data.last_synced_commit)
      
      if (response.data.commits.length === 0) {
        setError('No new commits since last sync')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to sync commits')
    } finally {
      setLoading(false)
    }
  }

  const generateTopics = async () => {
    if (selectedCommits.length === 0) {
      setError('Please select at least one commit')
      return
    }

    setLoading(true)
    setError('')
    try {
      // Build focus area from filters
      const focusAreas = []
      if (filters.language) focusAreas.push('language features')
      if (filters.frameworks) focusAreas.push('frameworks')
      if (filters.libraries) focusAreas.push('libraries')
      
      const response = await axios.post(`${API_URL}/api/generate_topics`, {
        repo_id: HARDCODED_REPO,
        commit_ids: selectedCommits,
        root_language: 'Python',
        user_instructions: customInstructions || undefined,
        focus_area: focusAreas.length > 0 ? focusAreas.join(', ') : undefined
      })
      setTopics(response.data.topics)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate topics')
    } finally {
      setLoading(false)
    }
  }

  const saveTopic = async (topic: Topic, index: number) => {
    setLoading(true)
    setError('')
    try {
      const nameParts = topic.path.split('/')
      const name = nameParts[nameParts.length - 1]
      
      await axios.post(`${API_URL}/api/save_learning`, {
        name: name,
        description: topic.description,
        parent_id: topic.parent_id,
        parent_temp_id: topic.parent_temp_id,
        github_link: `https://github.com/${HARDCODED_REPO}`
      })
      
      // Remove saved topic from list
      setTopics(prev => prev.filter((_, i) => i !== index))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save topic')
    } finally {
      setLoading(false)
    }
  }

  const skipTopic = (index: number) => {
    setTopics(prev => prev.filter((_, i) => i !== index))
  }

  const toggleCommit = (commitId: string) => {
    setSelectedCommits(prev => 
      prev.includes(commitId)
        ? prev.filter(id => id !== commitId)
        : [...prev, commitId]
    )
  }

  const toggleExpandCommit = (commitId: string) => {
    setExpandedCommits(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commitId)) {
        newSet.delete(commitId)
      } else {
        newSet.add(commitId)
      }
      return newSet
    })
  }

  const truncateDescription = (desc: string, maxLength: number = 60) => {
    if (desc.length <= maxLength) return desc
    return desc.substring(0, maxLength) + '...'
  }

  const openChatGPT = (question: string) => {
    const encodedQuestion = encodeURIComponent(question)
    window.open(`https://chat.openai.com/?q=${encodedQuestion}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">New Changes in /{HARDCODED_REPO.split('/')[1]}</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Sync Button Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 mb-2">
                {lastSyncedCommit ? (
                  <>Last synced: <span className="font-mono text-sm">{lastSyncedCommit.substring(0, 7)}</span></>
                ) : (
                  'No previous sync found'
                )}
              </p>
              {isFirstSync && commits.length > 0 && (
                <p className="text-sm text-blue-600">This is your first sync - showing recent commits</p>
              )}
            </div>
            <button
              onClick={syncCommits}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Syncing...' : commits.length > 0 ? 'Sync Again' : 'Sync New Changes'}
            </button>
          </div>
        </div>

        {/* Commits List */}
        {commits.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="space-y-2">
              {commits.map((commit, index) => (
                <div key={commit.commit_id} className="border-b border-gray-200 pb-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCommits.includes(commit.commit_id)}
                      onChange={() => toggleCommit(commit.commit_id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">
                        {index === 0 && 'newest commit'} {index === commits.length - 1 && 'last sync'} {index > 0 && index < commits.length - 1 && index} — 
                      </div>
                      <div 
                        className="text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => toggleExpandCommit(commit.commit_id)}
                      >
                        {expandedCommits.has(commit.commit_id) 
                          ? commit.description 
                          : truncateDescription(commit.description)
                        }
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {commit.commit_id.substring(0, 7)} - [Github logo]
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Generate Button and Settings */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={generateTopics}
                disabled={loading || selectedCommits.length === 0}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-400"
              >
                {loading ? 'Generating...' : 'Generate new knowledge'}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Settings
              </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                <h3 className="font-semibold mb-3">Filters</h3>
                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.language}
                      onChange={(e) => setFilters(prev => ({...prev, language: e.target.checked}))}
                    />
                    <span>Language</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.frameworks}
                      onChange={(e) => setFilters(prev => ({...prev, frameworks: e.target.checked}))}
                    />
                    <span>Frameworks</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.libraries}
                      onChange={(e) => setFilters(prev => ({...prev, libraries: e.target.checked}))}
                    />
                    <span>Libraries</span>
                  </label>
                </div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Enter custom instructions..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        {/* Generated Topics */}
        {topics.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Python</h2>
            <div className="space-y-6">
              {topics.map((topic, index) => (
                <div key={index} className="border-l-4 border-gray-300 pl-4">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      &gt; {topic.path.split('/').slice(1).join(' / ')}
                    </h3>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => saveTopic(topic, index)}
                        disabled={loading}
                        className="px-4 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 text-sm"
                      >
                        Learned
                      </button>
                      <button
                        onClick={() => skipTopic(index)}
                        className="px-4 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-gray-700 mb-3 whitespace-pre-wrap">
                    {topic.description}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={topicQuestions[index] || ''}
                      onChange={(e) => setTopicQuestions(prev => ({...prev, [index]: e.target.value}))}
                      placeholder="Ask follow up question..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => {
                        const question = topicQuestions[index]
                        if (question) {
                          openChatGPT(`${question}\n\nContext: ${topic.description}`)
                        }
                      }}
                      disabled={!topicQuestions[index]}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm flex items-center gap-2"
                    >
                      chat_gpt
                      <span className="text-xs">include</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}