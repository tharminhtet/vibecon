# Setup Instructions

## Database Setup

You need to run the following SQL in your Supabase SQL Editor to create the required table:

```sql
-- Create table for tracking repository sync state
CREATE TABLE IF NOT EXISTS repo_sync_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_name TEXT NOT NULL UNIQUE,
  last_commit_hash TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_name ON repo_sync_state(repo_name);
```

## How to Create the Table

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `yiavbuptkktkhyszevix`
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Paste the SQL code above
6. Click "Run" or press Ctrl+Enter

## Verify the Table

After creating the table, verify it exists by running:

```sql
SELECT * FROM repo_sync_state;
```

This should return an empty result set (no error).

## How It Works

The `repo_sync_state` table tracks the last synced commit for each repository:

- **repo_name**: The repository identifier (e.g., "tharminhtet/AiChatIOS")
- **last_commit_hash**: The SHA of the most recent commit that was synced
- **last_synced_at**: Timestamp of when the last sync occurred
- **created_at**: When this repo was first added to tracking

When you click "Sync New Changes":
1. The system checks if this repo exists in `repo_sync_state`
2. If yes: Fetches commits newer than `last_commit_hash`
3. If no: Fetches recent commits and creates the initial record
4. After successful sync, updates `last_commit_hash` with the newest commit

This eliminates the need to manually track commit SHAs!
