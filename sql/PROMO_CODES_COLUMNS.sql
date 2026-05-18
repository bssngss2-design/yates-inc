-- Promo codes + D1 Player Pack persistence (normal + hard mode saves)
-- Also included in sql/CATCH_UP_APP_SAVE_COLUMNS.sql — run one or the other if you need DB columns only.

ALTER TABLE user_game_data
  ADD COLUMN IF NOT EXISTS redeemed_codes TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS has_d1_player_pack BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promo_perm_bonuses TEXT DEFAULT '{"luckBonus":0,"dropChanceBonus":0}',
  ADD COLUMN IF NOT EXISTS d1_mine_counter INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_promo_crates TEXT DEFAULT '[]';

ALTER TABLE user_game_hard_data
  ADD COLUMN IF NOT EXISTS redeemed_codes TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS has_d1_player_pack BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promo_perm_bonuses TEXT DEFAULT '{"luckBonus":0,"dropChanceBonus":0}',
  ADD COLUMN IF NOT EXISTS d1_mine_counter INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_promo_crates TEXT DEFAULT '[]';
