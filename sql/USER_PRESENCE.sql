-- =========================================================
-- USER PRESENCE / "WHO'S ONLINE" TRACKING
-- Run this in your Supabase SQL Editor.
-- =========================================================
-- Each logged-in employee/client upserts a row every ~20s
-- with their current path. To find "active" users we just
-- check rows whose last_seen is within the last 60s.
-- =========================================================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id      TEXT PRIMARY KEY,
  user_type    TEXT NOT NULL CHECK (user_type IN ('employee', 'client')),
  username     TEXT,
  current_path TEXT,
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_presence read all" ON user_presence;
CREATE POLICY "user_presence read all"
  ON user_presence FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_presence insert all" ON user_presence;
CREATE POLICY "user_presence insert all"
  ON user_presence FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "user_presence update all" ON user_presence;
CREATE POLICY "user_presence update all"
  ON user_presence FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON user_presence (last_seen DESC);
