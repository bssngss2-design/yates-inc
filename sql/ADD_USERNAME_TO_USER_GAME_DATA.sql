-- =============================================
-- Denormalize username into user_game_data (and hard variant)
-- Fixes the leaderboard "Unknown" bug by storing the player's display name
-- alongside their game data row, avoiding lookups against clients / employees
-- (which fail for hired employees and the static roster like Wyatt/Nesh/Suhas).
--
-- Safe to run multiple times. Run in Supabase SQL Editor.
-- =============================================

-- 1. Add the column to both tables.
ALTER TABLE user_game_data
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE user_game_hard_data
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. One-shot backfill from existing identity tables.
--    Each block is wrapped in DO so it does not abort the script if a source
--    table is missing in this environment.

-- 2a. Clients -> user_game_data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    UPDATE user_game_data ugd
    SET username = c.username
    FROM clients c
    WHERE ugd.user_id = c.id::text
      AND ugd.user_type = 'client'
      AND ugd.username IS NULL
      AND c.username IS NOT NULL;
  END IF;
END $$;

-- 2b. Employees -> user_game_data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    UPDATE user_game_data ugd
    SET username = e.name
    FROM employees e
    WHERE ugd.user_id = e.id
      AND ugd.user_type = 'employee'
      AND ugd.username IS NULL
      AND e.name IS NOT NULL;
  END IF;
END $$;

-- 2c. admin_hired_employees -> user_game_data (covers hired admins not in employees)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_hired_employees') THEN
    UPDATE user_game_data ugd
    SET username = h.name
    FROM admin_hired_employees h
    WHERE ugd.user_id = h.employee_id
      AND ugd.user_type = 'employee'
      AND ugd.username IS NULL
      AND h.name IS NOT NULL;
  END IF;
END $$;

-- 2d. Same three sources -> user_game_hard_data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    UPDATE user_game_hard_data ugd
    SET username = c.username
    FROM clients c
    WHERE ugd.user_id = c.id::text
      AND ugd.user_type = 'client'
      AND ugd.username IS NULL
      AND c.username IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    UPDATE user_game_hard_data ugd
    SET username = e.name
    FROM employees e
    WHERE ugd.user_id = e.id
      AND ugd.user_type = 'employee'
      AND ugd.username IS NULL
      AND e.name IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_hired_employees') THEN
    UPDATE user_game_hard_data ugd
    SET username = h.name
    FROM admin_hired_employees h
    WHERE ugd.user_id = h.employee_id
      AND ugd.user_type = 'employee'
      AND ugd.username IS NULL
      AND h.name IS NOT NULL;
  END IF;
END $$;

-- 3. Index for fast lookups (e.g., leaderboard joins) if not present.
CREATE INDEX IF NOT EXISTS idx_user_game_data_username ON user_game_data(username);
CREATE INDEX IF NOT EXISTS idx_user_game_hard_data_username ON user_game_hard_data(username);
