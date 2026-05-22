-- =============================================
-- INVESTIGATE: What happened to the old players?
-- Run this to understand the data gap
-- =============================================

-- 1. Check age distribution of records in user_game_data
SELECT 
  'user_game_data' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN user_type = 'client' THEN 1 END) as client_rows,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record,
  EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) as age_days
FROM user_game_data;

-- 2. Check age distribution in user_presence
SELECT 
  'user_presence' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN user_type = 'client' THEN 1 END) as client_rows,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM user_presence;

-- 3. Check clients table age
SELECT 
  'clients' as table_name,
  COUNT(*) as total_rows,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record,
  EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) as age_days
FROM clients;

-- 4. Look for any users created before May 2026
SELECT 
  COUNT(*) as users_before_may_2026,
  COUNT(CASE WHEN created_at < '2026-05-01' THEN 1 END) as users_before_may,
  COUNT(CASE WHEN created_at < '2026-01-01' THEN 1 END) as users_before_jan_2026
FROM user_game_data
WHERE user_type = 'client';

-- 5. Sample records to see what we have
SELECT 
  user_id,
  username,
  created_at,
  yates_dollars,
  prestige_count,
  total_playtime_seconds
FROM user_game_data
WHERE user_type = 'client'
ORDER BY created_at ASC
LIMIT 10;
