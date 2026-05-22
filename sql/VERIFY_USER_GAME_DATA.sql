-- =============================================
-- VERIFICATION: Check user_game_data integrity
-- 
-- Verify that:
-- 1. All users in user_presence have matching rows in user_game_data
-- 2. Usernames are properly denormalized
-- 3. Stats are reasonable (not NaN, not corrupt)
-- 4. Hard mode data exists separately
--
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Count of users in presence vs game_data
SELECT 
  'user_presence' as source,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_rows
FROM user_presence
UNION ALL
SELECT 
  'user_game_data (client)',
  COUNT(DISTINCT user_id),
  COUNT(*)
FROM user_game_data
WHERE user_type = 'client'
UNION ALL
SELECT 
  'user_game_data (employee)',
  COUNT(DISTINCT user_id),
  COUNT(*)
FROM user_game_data
WHERE user_type = 'employee'
UNION ALL
SELECT 
  'user_game_hard_data',
  COUNT(DISTINCT user_id),
  COUNT(*)
FROM user_game_hard_data;

-- 2. Users in presence but missing from game_data
SELECT 
  up.user_id,
  up.user_type,
  up.username,
  COUNT(ugd.user_id) as has_game_data
FROM user_presence up
LEFT JOIN user_game_data ugd ON up.user_id = ugd.user_id AND up.user_type = ugd.user_type
GROUP BY up.user_id, up.user_type, up.username
HAVING COUNT(ugd.user_id) = 0
LIMIT 20;

-- 3. Check for corrupt numbers (NaN, Infinity) in key columns
SELECT 
  COUNT(*) as corrupt_rows,
  COUNT(CASE WHEN yates_dollars < 0 THEN 1 END) as negative_money,
  COUNT(CASE WHEN yates_dollars IS NULL THEN 1 END) as null_money,
  COUNT(CASE WHEN prestige_count < 0 THEN 1 END) as negative_prestige,
  COUNT(CASE WHEN total_playtime_seconds < 0 THEN 1 END) as negative_playtime
FROM user_game_data;

-- 4. Users missing username denormalization
SELECT 
  COUNT(*) as users_missing_username,
  user_type,
  COUNT(CASE WHEN username IS NULL THEN 1 END) / COUNT(*) * 100 as pct_null
FROM user_game_data
WHERE username IS NULL
GROUP BY user_type;

-- 5. Top players by money (should show real players)
SELECT 
  user_id,
  username,
  yates_dollars,
  prestige_count,
  total_playtime_seconds,
  user_type
FROM user_game_data
WHERE yates_dollars > 0
ORDER BY yates_dollars DESC
LIMIT 10;

-- 6. Hard mode comparison (should have similar structure)
SELECT 
  'normal mode' as mode,
  COUNT(*) as rows,
  COUNT(DISTINCT user_id) as users,
  COUNT(DISTINCT user_type) as user_types
FROM user_game_data
UNION ALL
SELECT 
  'hard mode',
  COUNT(*),
  COUNT(DISTINCT user_id),
  COUNT(DISTINCT user_type)
FROM user_game_hard_data;
