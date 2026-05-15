-- Ascension Tree: Heavenly Upgrade System (prestige 10+)
-- Run this in Supabase SQL Editor before deploying

-- Normal mode table
ALTER TABLE user_game_data
  ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heavenly_chips INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hc_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owned_ascension_node_ids TEXT[] DEFAULT '{}';

-- Hard mode table
ALTER TABLE user_game_hard_data
  ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heavenly_chips INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hc_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owned_ascension_node_ids TEXT[] DEFAULT '{}';
