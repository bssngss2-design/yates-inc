-- Run this in your Supabase SQL Editor to create the warning tracking table

CREATE TABLE IF NOT EXISTS warning_seen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL UNIQUE,
  seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Age-screening (COPPA). TRUE = user confirmed 13+, FALSE = confirmed under 13,
-- NULL = hasn't answered yet (legacy rows from before this column existed).
ALTER TABLE warning_seen
  ADD COLUMN IF NOT EXISTS is_13_plus BOOLEAN;

-- Allow anonymous inserts, reads, and updates (for saving the age answer later)
ALTER TABLE warning_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous insert" ON warning_seen;
CREATE POLICY "Allow anonymous insert" ON warning_seen
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous select" ON warning_seen;
CREATE POLICY "Allow anonymous select" ON warning_seen
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous update" ON warning_seen;
CREATE POLICY "Allow anonymous update" ON warning_seen
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_warning_seen_visitor_id ON warning_seen(visitor_id);

