'use client'

import { useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

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
  const [rootLanguage, setRootLanguage] = useState('Python')
  const [knowledgeTree, setKnowledgeTree] = useState<string>('')
  const [repoId, setRepoId] = useState('')
  const [sinceCommitId, setSinceCommitId] = useState('')
  const [branch, setBranch] = useState('main')
  const [commits, setCommits] = useState<Commit[]>([])
  const [selectedCommits, setSelectedCommits] = useState<string[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [userInstructions, setUserInstructions] = useState('')
  const [focusArea, setFocusArea] = useState('')

  const loadKnowledgeBase = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${API_URL}/api/knowledge_base/${rootLanguage}`)
      setKnowledgeTree(response.data.tree_string)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load knowledge base')
    } finally {
      setLoading(false)
    }
  }

  const analyzeCommits = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.post(`${API_URL}/api/analyze_commits`, {
        repo_id: repoId,
        since_commit_id: sinceCommitId,
        branch: branch,
        max_commits: 10
      })
      setCommits(response.data.commits)
      setSelectedCommits(response.data.commits.map((c: Commit) => c.commit_id))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze commits')
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
      const response = await axios.post(`${API_URL}/api/generate_topics`, {
        repo_id: repoId,
        commit_ids: selectedCommits,
        root_language: rootLanguage,
        user_instructions: userInstructions || undefined,
        focus_area: focusArea || undefined
      })
      setTopics(response.data.topics)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate topics')
    } finally {
      setLoading(false)
    }
  }

  const saveTopic = async (topic: Topic) => {
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
        github_link: `https://github.com/${repoId}`
      })
      
      alert('Topic saved successfully!')
      // Reload knowledge base
      await loadKnowledgeBase()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save topic')
    } finally {
      setLoading(false)
    }
  }

  const toggleCommit = (commitId: string) => {
    setSelectedCommits(prev => 
      prev.includes(commitId)
        ? prev.filter(id => id !== commitId)
        : [...prev, commitId]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Git Learning Program</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Knowledge Base Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Knowledge Base</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={rootLanguage}
              onChange={(e) => setRootLanguage(e.target.value)}
              placeholder="Root Language (e.g., Python)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={loadKnowledgeBase}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Load Knowledge Base'}
            </button>
          </div>
          {knowledgeTree && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
              <pre className="tree-view">{knowledgeTree}</pre>
            </div>
          )}
        </div>

        {/* Commit Analysis Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Analyze Commits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              placeholder="Repository (e.g., owner/repo)"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={sinceCommitId}
              onChange={(e) => setSinceCommitId(e.target.value)}
              placeholder="Since Commit ID"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Branch (default: main)"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={analyzeCommits}
            disabled={loading || !repoId || !sinceCommitId}
            className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Analyzing...' : 'Analyze Commits'}
          </button>

          {commits.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3">Found Commits:</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {commits.map((commit) => (
                  <div
                    key={commit.commit_id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCommits.includes(commit.commit_id)}
                      onChange={() => toggleCommit(commit.commit_id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-mono text-sm text-gray-600">
                        {commit.commit_id.substring(0, 8)}
                      </div>
                      <div className="text-gray-900">{commit.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Generate Topics Section */}
        {commits.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Generate Learning Topics</h2>
            <div className="space-y-4 mb-4">
              <textarea
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                placeholder="Special instructions (optional)..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <input
                type="text"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                placeholder="Focus area (e.g., frameworks, language features)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={generateTopics}
              disabled={loading || selectedCommits.length === 0}
              className="w-full px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? 'Generating...' : `Generate Topics from ${selectedCommits.length} commit(s)`}
            </button>
          </div>
        )}

        {/* Topics Display */}
        {topics.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Generated Topics</h2>
            <div className="space-y-4">
              {topics.map((topic, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-lg text-blue-600">{topic.path}</div>
                      {topic.parent_id && (
                        <div className="text-sm text-gray-500">Parent ID: {topic.parent_id}</div>
                      )}
                      {topic.parent_temp_id && (
                        <div className="text-sm text-orange-500">Temp Parent ID: {topic.parent_temp_id}</div>
                      )}
                    </div>
                    <button
                      onClick={() => saveTopic(topic)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                    >
                      Save
                    </button>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">{topic.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}