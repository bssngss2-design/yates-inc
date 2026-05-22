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
),
-- Clean game data - filter out NaN, Infinity, and out-of-range values
clean_game_data AS (
  SELECT 
    ugd.user_id,
    ugd.user_type,
    ugd.username,
    CASE 
      WHEN ugd.total_money_earned IS NULL OR NOT isfinite(ugd.total_money_earned::numeric) THEN 0::BIGINT
      WHEN ugd.total_money_earned > 9223372036854775807 THEN 9223372036854775807::BIGINT -- Max BIGINT
      WHEN ugd.total_money_earned < -9223372036854775808 THEN -9223372036854775808::BIGINT -- Min BIGINT
      ELSE ugd.total_money_earned::BIGINT
    END as safe_money,
    CASE 
      WHEN ugd.fastest_prestige_time IS NULL OR NOT isfinite(ugd.fastest_prestige_time::numeric) THEN NULL::BIGINT
      WHEN ugd.fastest_prestige_time > 9223372036854775807 THEN 9223372036854775807::BIGINT
      WHEN ugd.fastest_prestige_time < 0 THEN NULL::BIGINT
      ELSE ugd.fastest_prestige_time::BIGINT
    END as safe_speed,
    CASE 
      WHEN ugd.prestige_count IS NULL OR NOT isfinite(ugd.prestige_count::numeric) THEN 0::INTEGER
      WHEN ugd.prestige_count > 2147483647 THEN 2147483647::INTEGER -- Max INT
      WHEN ugd.prestige_count < 0 THEN 0::INTEGER
      ELSE ugd.prestige_count::INTEGER
    END as safe_prestiges
  FROM user_game_data ugd
  WHERE ugd.username IS NOT NULL
)

-- 2. Populate rankings from cleaned game data
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
  cgd.user_id,
  cgd.user_type,
  cgd.username,
  cgd.safe_money,
  cgd.safe_speed,
  cgd.safe_prestiges,
  ap.period_start,
  ap.period_end
FROM clean_game_data cgd
CROSS JOIN (SELECT DISTINCT period_start, period_end FROM active_period LIMIT 1) ap
WHERE cgd.safe_money > 0 OR cgd.safe_speed IS NOT NULL OR cgd.safe_prestiges > 0
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
