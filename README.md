# Git Learning Program

A powerful tool to learn programming concepts from your git commit history by analyzing code changes and generating structured learning topics using AI.

## Overview

This application helps developers learn from their own code by:
1. **Loading your existing knowledge base** - A tree structure of programming concepts you already know
2. **Analyzing git commits** - Fetching commit diffs from GitHub repositories
3. **Generating learning topics** - Using OpenAI to identify new concepts and create educational descriptions
4. **Organizing knowledge** - Saving topics to a PostgreSQL database in a hierarchical structure

## Tech Stack

### Backend (Python + FastAPI)
- **FastAPI** - High-performance web framework
- **Supabase** - PostgreSQL database for knowledge base
- **OpenAI API** - GPT-4o for topic generation with structured output
- **GitHub API** - Fetching commits and diffs
- **Python 3.11+** - Core language

### Frontend (Next.js)
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **Axios** - API communication

## Project Structure

```
/app
├── backend/
│   ├── server.py                    # FastAPI application
│   ├── github_commit_analyzer.py    # GitHub API integration
│   ├── supabase_client.py           # Database operations
│   ├── treeprinter.py               # Tree visualization utility
│   ├── requirements.txt             # Python dependencies
│   └── .env                         # Environment variables
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Main UI component
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   ├── package.json                 # Node dependencies
│   └── .env.local                   # Frontend environment variables
└── README.md
```

## Services

- **Backend**: http://localhost:8001
- **Frontend**: http://localhost:3000

Both services are running and ready to use!

## How to Use

1. **Load Knowledge Base**
   - Open http://localhost:3000
   - Enter your programming language (e.g., "Python")
   - Click "Load Knowledge Base" to see your current knowledge tree

2. **Analyze Commits**
   - Enter repository (e.g., "owner/repo")
   - Enter a commit SHA to start from
   - Enter branch name
   - Click "Analyze Commits" to fetch newer commits

3. **Generate Topics**
   - Select commits to analyze
   - Add optional instructions or focus areas
   - Click "Generate Topics" to use AI for analysis

4. **Save Topics**
   - Review generated topics with descriptions
   - Click "Save" on individual topics to add them to your knowledge base
   - Reload knowledge base to see updated tree

## API Endpoints

### GET /api/health
Health check endpoint

### GET /api/knowledge_base/{root_name}
Get the knowledge base tree structure

### POST /api/analyze_commits
Analyze commits newer than a specific commit

### POST /api/get_commit_diffs
Get diffs for specified commits

### POST /api/generate_topics
Generate learning topics from commit diffs using OpenAI

### POST /api/save_learning
Save a learning topic to the database

### POST /api/save_topics_batch
Save multiple topics with parent resolution

## Features

- ✅ Tree-based Knowledge Organization
- ✅ GitHub Integration for commit analysis
- ✅ AI-Powered Topic Generation (GPT-4o)
- ✅ Smart Parent Resolution
- ✅ Interactive UI with Tailwind CSS
- ✅ Real-time Updates with hot reload
- ✅ Structured output from OpenAI
- ✅ Batch topic saving

## Environment Variables Configured

- ✅ Supabase URL and API key
- ✅ GitHub Personal Access Token
- ✅ OpenAI API Key
- ✅ Frontend-Backend connection

All environment variables are properly configured and the application is ready to use!
