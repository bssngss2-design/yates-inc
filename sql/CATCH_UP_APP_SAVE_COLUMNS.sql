-- Columns GameContext saves to user_game_* that were never added in older migrations.
-- Idempotent (IF NOT EXISTS). Run after user_game_hard_data exists.

-- Path / side progression
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS side_level INTEGER DEFAULT 1;
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS side_level_buffs TEXT DEFAULT '{}';
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS total_golden_cookies_collected INTEGER DEFAULT 0;
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS total_miners_sacrificed INTEGER DEFAULT 0;

ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS side_level INTEGER DEFAULT 1;
ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS side_level_buffs TEXT DEFAULT '{}';
ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS total_golden_cookies_collected INTEGER DEFAULT 0;
ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS total_miners_sacrificed INTEGER DEFAULT 0;

-- Loans (bank building)
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS loan_amount NUMERIC(48, 2) DEFAULT 0;
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS loan_taken_at BIGINT;
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS loan_last_accrual_at BIGINT;

ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS loan_amount NUMERIC(48, 2) DEFAULT 0;
ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS loan_taken_at BIGINT;
ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS loan_last_accrual_at BIGINT;

-- JSON blobs (client stores JSON.stringify)
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS shady_sam_swaps TEXT DEFAULT '{}';
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS wandering_trader_perm_buffs TEXT DEFAULT '{}';
ALTER TABLE user_game_data ADD COLUMN IF NOT EXISTS powerup_cooldowns TEXT DEFAULT '{}';

ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS shady_sam_swaps TEXT DEFAULT '{}';
ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS wandering_trader_perm_buffs TEXT DEFAULT '{}';
ALTER TABLE user_game_hard_data ADD COLUMN IF NOT EXISTS powerup_cooldowns TEXT DEFAULT '{}';
