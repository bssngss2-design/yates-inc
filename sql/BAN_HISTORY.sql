-- =========================================================
-- BAN HISTORY LOG
-- Run this in your Supabase SQL Editor.
-- =========================================================
-- The existing `banned_users` table only tracks ACTIVE bans
-- (rows get deleted on unban). This table is the audit log:
-- one row per ban / unban event so we can answer "was this
-- person ever banned, and were they unbanned?".
-- =========================================================

CREATE TABLE IF NOT EXISTS ban_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  user_type   TEXT,
  username    TEXT,
  action      TEXT NOT NULL CHECK (action IN ('ban', 'unban')),
  by_user_id  TEXT,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ban_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ban_history all" ON ban_history;
CREATE POLICY "ban_history all"
  ON ban_history FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ban_history_user_id
  ON ban_history (user_id);
CREATE INDEX IF NOT EXISTS idx_ban_history_created_at
  ON ban_history (created_at DESC);
