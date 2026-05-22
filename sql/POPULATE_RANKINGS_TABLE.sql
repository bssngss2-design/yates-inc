-- =============================================
-- POPULATE: Rankings table from current game data
--
-- This populates the rankings table with data from user_game_data
-- for the current active ranking period.
-- =============================================

-- 1. Get or create current ranking period
WITH current_period AS (
  SELECT id, period_start, period_end FROM ranking_periods WHERE is_active = true ORDER BY period_start DESC LIMIT 1
),
-- If no period exists, create one (3-day period from now)
ensure_period AS (
  INSERT INTO ranking_periods (period_start, period_end, is_active)
  SELECT NOW(), NOW() + INTERVAL '3 days', true
  WHERE NOT EXISTS (SELECT 1 FROM ranking_periods WHERE is_active = true)
  RETURNING id, period_start, period_end
),
-- Use existing period or newly created one
active_period AS (
  SELECT id as period_id, period_start, period_end FROM current_period
  UNION ALL
  SELECT id as period_id, period_start, period_end FROM ensure_period
  WHERE NOT EXISTS (SELECT 1 FROM current_period)
)

-- 2. Populate rankings from user_game_data
INSERT INTO rankings (
  user_id,
  user_type,
  username,
  total_money_earned,
  fastest_prestige_time,
  total_prestiges,
  period_start,
  period_end
)
SELECT 
  ugd.user_id,
  ugd.user_type,
  ugd.username,
  ugd.total_money_earned,
  ugd.fastest_prestige_time,
  ugd.prestige_count,
  ap.period_start,
  ap.period_end
FROM user_game_data ugd
CROSS JOIN (SELECT DISTINCT period_start, period_end FROM active_period LIMIT 1) ap
WHERE ugd.username IS NOT NULL
  AND (ugd.total_money_earned > 0 OR ugd.fastest_prestige_time IS NOT NULL OR ugd.prestige_count > 0)
ON CONFLICT (user_id, period_start) DO UPDATE SET
  total_money_earned = EXCLUDED.total_money_earned,
  fastest_prestige_time = EXCLUDED.fastest_prestige_time,
  total_prestiges = EXCLUDED.total_prestiges,
  updated_at = NOW();

-- 3. Verify results
SELECT 
  'Rankings populated' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN total_money_earned > 0 THEN 1 END) as users_with_money,
  COUNT(CASE WHEN fastest_prestige_time IS NOT NULL THEN 1 END) as users_with_speed,
  COUNT(CASE WHEN total_prestiges > 0 THEN 1 END) as users_with_prestiges
FROM rankings;
