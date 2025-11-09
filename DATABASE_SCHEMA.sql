-- Existing table for knowledge base
CREATE TABLE IF NOT EXISTS programming_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES programming_notes(id) ON DELETE CASCADE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  github_link TEXT
);

CREATE INDEX IF NOT EXISTS idx_parent ON programming_notes(parent_id);

-- New table for tracking repository sync state
CREATE TABLE IF NOT EXISTS repo_sync_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_name TEXT NOT NULL UNIQUE,
  last_commit_hash TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_name ON repo_sync_state(repo_name);

-- Function to get tree structure (existing)
CREATE OR REPLACE FUNCTION get_tree(root_name TEXT DEFAULT 'Python')
RETURNS TABLE (id UUID, name TEXT, depth INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subtree AS (
    SELECT n.id, n.name, 0 AS depth
    FROM programming_notes n
    WHERE n.name = get_tree.root_name
    UNION ALL
    SELECT n.id, n.name, s.depth + 1
    FROM programming_notes n
    INNER JOIN subtree s ON n.parent_id = (
      SELECT pn.id FROM programming_notes pn WHERE pn.name = s.name LIMIT 1
    )
  )
  SELECT st.id, st.name, st.depth FROM subtree st ORDER BY st.depth, st.name;
END;
$$ LANGUAGE plpgsql;
