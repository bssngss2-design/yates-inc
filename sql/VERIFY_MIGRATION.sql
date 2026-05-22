-- =============================================
-- VERIFICATION: Check data integrity and count users
-- 
-- Run these checks in Supabase SQL Editor to verify the migration was successful
-- =============================================

-- 1. Count comparison: should be similar after migration
SELECT 
  'clients' as table_name,
  COUNT(*) as count
FROM clients
UNION ALL
SELECT 
  'user_game_data (clients)' as table_name,
  COUNT(*) as count
FROM user_game_data
WHERE user_type = 'client'
UNION ALL
SELECT 
  'user_presence (clients)' as table_name,
  COUNT(*) as count
FROM user_presence
WHERE user_type = 'client'
ORDER BY count DESC;

-- 2. Clients with NULL usernames (should be few or none after migration)
SELECT 
  COUNT(*) as clients_with_null_username,
  COUNT(CASE WHEN username = '[MIGRATED - PASSWORD RESET REQUIRED]' THEN 1 END) as migrated_pending_reset
FROM clients;

-- 3. Game data with NULL usernames (should be filled after migration)
SELECT 
  COUNT(*) as orphaned_game_rows,
  COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as with_username
FROM user_game_data
WHERE user_type = 'client';

-- 4. Sample of migrated users
SELECT 
  c.id,
  c.username,
  c.mail_handle,
  c.created_at,
  ugd.yates_dollars,
  ugd.prestige_count,
  ugd.total_playtime_seconds,
  up.last_seen
FROM clients c
LEFT JOIN user_game_data ugd ON c.id::text = ugd.user_id AND ugd.user_type = 'client'
LEFT JOIN user_presence up ON c.id::text = up.user_id AND up.user_type = 'client'
ORDER BY c.created_at DESC
LIMIT 20;

-- 5. Top earners (by total_money_earned in game data)
SELECT 
  ugd.username,
  c.username as clients_name,
  ugd.total_money_earned,
  ugd.prestige_count,
  ugd.total_playtime_seconds / 3600.0 as hours_played
FROM user_game_data ugd
LEFT JOIN clients c ON ugd.user_id = c.id::text AND ugd.user_type = 'client'
WHERE ugd.user_type = 'client'
  AND ugd.total_money_earned IS NOT NULL
ORDER BY ugd.total_money_earned DESC
LIMIT 10;

-- 6. Presence verification (users who pinged in last 24 hours)
SELECT 
  COUNT(*) as active_clients_24h,
  COUNT(CASE WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 1 END) as active_last_hour,
  COUNT(CASE WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 1 END) as active_now
FROM user_presence
WHERE user_type = 'client'
  AND last_seen > NOW() - INTERVAL '24 hours';
