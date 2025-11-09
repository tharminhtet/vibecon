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

1. **Open the Application**
   - Navigate to http://localhost:3000
   - You'll see "New Changes in /AiChatIOS" as the title

2. **Load Commits**
   - Enter a commit SHA in the "last sync" field (e.g., `d4afea6e139e2f546a509e0e0860d2558cf21176`)
   - Click "Load Commits" to fetch newer commits
   - Commits will be listed with checkboxes on the left
   - Click on a commit description to expand/collapse it

3. **Configure Settings (Optional)**
   - Click "Settings" button to open the configuration panel
   - Select filters: Language, Frameworks, or Libraries
   - Add custom instructions for the AI

4. **Generate Topics**
   - Select which commits you want to learn from (by default all are selected)
   - Click "Generate new knowledge" button
   - Wait for AI to analyze the code changes

5. **Review and Save Topics**
   - Generated topics appear below with path and description
   - For each topic:
     - Click "Learned" to save it to your knowledge base
     - Click "Not now" to skip it
     - Type a follow-up question in the text box
     - Click the chat button to open ChatGPT with your question and context

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
