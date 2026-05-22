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
-- Clamp huge game stats to BIGINT/INT range (Postgres has no isfinite() for numeric)
clean_game_data AS (
  SELECT 
    ugd.user_id,
    ugd.user_type,
    ugd.username,
    LEAST(
      GREATEST(COALESCE(ugd.total_money_earned::numeric, 0), 0),
      9223372036854775807::numeric
    )::bigint AS safe_money,
    CASE
      WHEN ugd.fastest_prestige_time IS NULL THEN NULL::bigint
      WHEN ugd.fastest_prestige_time::numeric <= 0 THEN NULL::bigint
      ELSE LEAST(
        ugd.fastest_prestige_time::numeric,
        9223372036854775807::numeric
      )::bigint
    END AS safe_speed,
    LEAST(
      GREATEST(COALESCE(ugd.prestige_count::numeric, 0), 0),
      2147483647::numeric
    )::integer AS safe_prestiges
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
