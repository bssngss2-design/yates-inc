-- Tax + playtime fields (skipped if you omit FIX_INTEGER_OVERFLOW.sql when using numeric upgrades).
-- Also run sql/CATCH_UP_APP_SAVE_COLUMNS.sql for side_level, loans, etc.
-- Safe to run anytime: IF NOT EXISTS.
-- Run AFTER user_game_hard_data exists (clone step).

ALTER TABLE user_game_data
  ADD COLUMN IF NOT EXISTS last_tax_time BIGINT;

ALTER TABLE user_game_data
  ADD COLUMN IF NOT EXISTS total_playtime_seconds BIGINT DEFAULT 0;

ALTER TABLE user_game_hard_data
  ADD COLUMN IF NOT EXISTS last_tax_time BIGINT;

ALTER TABLE user_game_hard_data
  ADD COLUMN IF NOT EXISTS total_playtime_seconds BIGINT DEFAULT 0;
