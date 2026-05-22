-- =============================================
-- AUDIT: Identify users in game data but not in clients/employees
-- This reveals which old users need to be migrated
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Count of clients vs game data
SELECT 
  'clients' as table_name,
  COUNT(*) as total_rows
FROM clients
UNION ALL
SELECT 
  'user_game_data' as table_name,
  COUNT(*) as total_rows
FROM user_game_data
WHERE user_type = 'client'
UNION ALL
SELECT 
  'user_presence' as table_name,
  COUNT(*) as total_rows
FROM user_presence
WHERE user_type = 'client';

-- 2. Users in game_data but NOT in clients (old users)
SELECT 
  ugd.user_id,
  ugd.username,
  ugd.yates_dollars,
  ugd.prestige_count,
  ugd.total_playtime_seconds,
  up.username as presence_username,
  up.last_seen,
  c.username as clients_username,
  c.id as in_clients
FROM user_game_data ugd
LEFT JOIN user_presence up ON ugd.user_id = up.user_id AND ugd.user_type = up.user_type
LEFT JOIN clients c ON ugd.user_id = c.id::text
WHERE ugd.user_type = 'client'
  AND c.id IS NULL
ORDER BY ugd.yates_dollars DESC
LIMIT 50;

-- 3. Clients table contents (should be 2 or few)
SELECT 
  id,
  username,
  mail_handle,
  created_at
FROM clients
ORDER BY created_at DESC;

-- 4. Rankings table check (should be empty)
SELECT COUNT(*) as ranking_rows FROM rankings;
