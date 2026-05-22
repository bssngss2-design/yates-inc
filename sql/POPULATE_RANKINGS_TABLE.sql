-- =============================================
-- OPTIONAL: Populate rankings table from current game data
--
-- This is OPTIONAL - the app uses denormalized stats in user_game_data
-- for leaderboards and doesn't read from the rankings table.
-- 
-- Use this if you want historical period snapshots for reporting.
-- =============================================

-- 1. Verify rankings period structure exists
SELECT COUNT(*) as ranking_periods_count FROM ranking_periods;
SELECT COUNT(*) as rankings_rows FROM rankings;

-- 2. If no period exists, create current week's period
-- (Run this if ranking_periods is empty)
INSERT INTO ranking_periods (period_name, start_date, end_date, is_active)
VALUES (
  'Week of ' || TO_CHAR(CURRENT_DATE - INTERVAL '1 day' * EXTRACT(DOW FROM CURRENT_DATE)::int, 'YYYY-MM-DD'),
  CURRENT_DATE - INTERVAL '1 day' * EXTRACT(DOW FROM CURRENT_DATE)::int,
  CURRENT_DATE - INTERVAL '1 day' * EXTRACT(DOW FROM CURRENT_DATE)::int + INTERVAL '6 days',
  true
)
ON CONFLICT DO NOTHING;

-- 3. Get the current active period
WITH current_period AS (
  SELECT id as period_id FROM ranking_periods WHERE is_active = true ORDER BY start_date DESC LIMIT 1
)

-- 4. Populate rankings table from user_game_data (Money category)
INSERT INTO rankings (
  period_id,
  user_id,
  user_type,
  username,
  category,
  rank,
  score,
  updated_at
)
SELECT 
  cp.period_id,
  ugd.user_id,
  ugd.user_type,
  ugd.username,
  'money',
  ROW_NUMBER() OVER (ORDER BY ugd.total_money_earned DESC) as rank,
  ugd.total_money_earned as score,
  NOW()
FROM user_game_data ugd, current_period cp
WHERE ugd.total_money_earned > 0
  AND ugd.username IS NOT NULL
ON CONFLICT (period_id, user_id, category) DO UPDATE SET
  rank = EXCLUDED.rank,
  score = EXCLUDED.score,
  updated_at = NOW();

-- 5. Populate rankings table from user_game_data (Speed/Prestige Time category)
INSERT INTO rankings (
  period_id,
  user_id,
  user_type,
  username,
  category,
  rank,
  score,
  updated_at
)
SELECT 
  cp.period_id,
  ugd.user_id,
  ugd.user_type,
  ugd.username,
  'speed',
  ROW_NUMBER() OVER (ORDER BY ugd.fastest_prestige_time ASC) as rank,
  ugd.fastest_prestige_time as score,
  NOW()
FROM user_game_data ugd, current_period cp
WHERE ugd.fastest_prestige_time IS NOT NULL
  AND ugd.fastest_prestige_time > 0
  AND ugd.username IS NOT NULL
ON CONFLICT (period_id, user_id, category) DO UPDATE SET
  rank = EXCLUDED.rank,
  score = EXCLUDED.score,
  updated_at = NOW();

-- 6. Populate rankings table from user_game_data (Prestige Count category)
INSERT INTO rankings (
  period_id,
  user_id,
  user_type,
  username,
  category,
  rank,
  score,
  updated_at
)
SELECT 
  cp.period_id,
  ugd.user_id,
  ugd.user_type,
  ugd.username,
  'prestiges',
  ROW_NUMBER() OVER (ORDER BY ugd.prestige_count DESC) as rank,
  ugd.prestige_count as score,
  NOW()
FROM user_game_data ugd, current_period cp
WHERE ugd.prestige_count > 0
  AND ugd.username IS NOT NULL
ON CONFLICT (period_id, user_id, category) DO UPDATE SET
  rank = EXCLUDED.rank,
  score = EXCLUDED.score,
  updated_at = NOW();

-- 7. Verify results
SELECT 
  category,
  COUNT(*) as ranking_count,
  MAX(rank) as max_rank
FROM rankings
GROUP BY category;
