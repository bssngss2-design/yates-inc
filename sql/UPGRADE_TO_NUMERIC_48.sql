-- =====================================================
-- UPGRADE TO NUMERIC(48) - TREDECILLION SUPPORT
-- =====================================================
-- Upgrades money/counter columns from NUMERIC(24) to NUMERIC(48)
-- NUMERIC(48,0) supports up to 10^48 (well past Tredecillion = 10^42)
-- PostgreSQL handles NUMERIC(24) -> NUMERIC(48) conversion losslessly
-- Run this in Supabase SQL Editor BEFORE deploying the code changes
-- =====================================================

-- =====================================================
-- STEP 1: Upgrade user_game_data (normal mode)
-- =====================================================

ALTER TABLE user_game_data
ALTER COLUMN yates_dollars TYPE NUMERIC(48,2);

ALTER TABLE user_game_data
ALTER COLUMN total_money_earned TYPE NUMERIC(48,0);

ALTER TABLE user_game_data
ALTER COLUMN total_clicks TYPE NUMERIC(48,0);

ALTER TABLE user_game_data
ALTER COLUMN rocks_mined_count TYPE NUMERIC(48,0);

ALTER TABLE user_game_data
ALTER COLUMN current_rock_hp TYPE NUMERIC(48,0);

-- =====================================================
-- STEP 2: Upgrade user_game_hard_data (hard mode)
-- =====================================================

ALTER TABLE user_game_hard_data
ALTER COLUMN yates_dollars TYPE NUMERIC(48,2);

ALTER TABLE user_game_hard_data
ALTER COLUMN total_money_earned TYPE NUMERIC(48,0);

ALTER TABLE user_game_hard_data
ALTER COLUMN total_clicks TYPE NUMERIC(48,0);

ALTER TABLE user_game_hard_data
ALTER COLUMN rocks_mined_count TYPE NUMERIC(48,0);

ALTER TABLE user_game_hard_data
ALTER COLUMN current_rock_hp TYPE NUMERIC(48,0);

-- =====================================================
-- VERIFICATION: Check the column types are now NUMERIC(48)
-- =====================================================
SELECT
  table_name,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_name IN ('user_game_data', 'user_game_hard_data')
  AND column_name IN (
    'yates_dollars',
    'total_money_earned',
    'total_clicks',
    'rocks_mined_count',
    'current_rock_hp'
  )
ORDER BY table_name, column_name;

-- =====================================================
-- WHY THIS MATTERS:
-- =====================================================
-- NUMERIC(24,0):  999,999,999,999,999,999,999,999 (~1 Septillion)
-- NUMERIC(48,0):  10^48 (~1 Quindecillion)
--
-- Players are already reaching Septillion ($Sp) territory.
-- New number tiers added:
--   Sp  = Septillion    (10^24)
--   Oc  = Octillion     (10^27)
--   No  = Nonillion     (10^30)
--   Dc  = Decillion     (10^33)
--   Un  = Undecillion   (10^36)
--   Dr  = Duodecillion  (10^39)
--   Tr  = Tredecillion  (10^42)
--   ∞   = Infinity      (beyond)
--
-- NUMERIC(48) gives plenty of headroom past Tredecillion.
-- =====================================================
