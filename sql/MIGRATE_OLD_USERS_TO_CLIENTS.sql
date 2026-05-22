-- =============================================
-- MIGRATION: Populate clients table with old users from user_game_data
-- 
-- WHAT THIS DOES:
-- - Finds all client rows in user_game_data that aren't in clients table
-- - Extracts their usernames and mail_handles from user_presence/user_game_data
-- - Inserts them into clients with a temporary password (marked [MIGRATED])
-- - Safe to run multiple times (uses INSERT IGNORE where possible)
--
-- RUN THIS in Supabase SQL Editor after the new Supabase is set up.
-- =============================================

-- 1. Identify and migrate old users from game_data -> clients
WITH orphan_clients AS (
  SELECT DISTINCT
    ugd.user_id,
    COALESCE(ugd.username, up.username, 'migrated_user_' || ugd.user_id::text) as display_username,
    COALESCE(
      -- Try to extract email-like handles from presence
      (up.username || '.mail'),
      -- Or construct from username
      (COALESCE(ugd.username, 'user') || '_' || ugd.user_id::text || '.mail')
    ) as mail_handle,
    ugd.created_at
  FROM user_game_data ugd
  LEFT JOIN user_presence up ON ugd.user_id = up.user_id AND ugd.user_type = up.user_type
  WHERE ugd.user_type = 'client'
    AND NOT EXISTS (
      -- Skip if already in clients
      SELECT 1 FROM clients c WHERE c.id = ugd.user_id::uuid
    )
)
INSERT INTO clients (id, username, mail_handle, password, created_at)
SELECT 
  orphan_clients.user_id::uuid,
  orphan_clients.display_username,
  orphan_clients.mail_handle,
  '[MIGRATED - PASSWORD RESET REQUIRED]',  -- Placeholder: user must reset password on next login
  orphan_clients.created_at
FROM orphan_clients
ON CONFLICT (id) DO NOTHING;  -- Safe if run multiple times

-- 2. Update user_game_data with denormalized usernames where missing
UPDATE user_game_data ugd
SET username = c.username
FROM clients c
WHERE ugd.user_id = c.id::text
  AND ugd.user_type = 'client'
  AND ugd.username IS NULL;

-- 3. Update user_presence with denormalized usernames where missing
UPDATE user_presence up
SET username = c.username
FROM clients c
WHERE up.user_id = c.id::text
  AND up.user_type = 'client'
  AND up.username IS NULL;

-- 4. Report on migration results
SELECT 
  COUNT(*) as newly_migrated_clients,
  MAX(created_at) as oldest_migrated_user
FROM clients
WHERE password = '[MIGRATED - PASSWORD RESET REQUIRED]';
