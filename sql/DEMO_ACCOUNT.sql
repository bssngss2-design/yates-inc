-- Demo test account for testing Ascension Tree and other features
-- Login: ID = "demo", Password = "demo123"

INSERT INTO employees (id, name, password, role, bio, mail_handle)
VALUES ('demo', 'Demo Tester', 'demo123', 'Tester', 'Test account for development', 'demo')
ON CONFLICT (id) DO UPDATE SET password = 'demo123', name = 'Demo Tester';

-- Set up demo game data at prestige 15 with some HC, gems, and money for testing
INSERT INTO user_game_data (
  user_id, user_type, yates_dollars, total_clicks, current_pickaxe_id, current_rock_id,
  current_rock_hp, rocks_mined_count, owned_pickaxe_ids, prestige_count, prestige_multiplier,
  prestige_tokens, total_money_earned, gems, heavenly_chips, total_hc_earned, owned_ascension_node_ids,
  miner_count, has_autoclicker, stokens
)
VALUES (
  'demo', 'employee', 50000000000000, 1000000, 20, 25,
  500000, 50000, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], 15, 2.5,
  30, 100000000000000, 200, 50, 50, '{}',
  100, true, 20
)
ON CONFLICT (user_id) DO UPDATE SET
  prestige_count = 15,
  prestige_multiplier = 2.5,
  yates_dollars = 50000000000000,
  gems = 200,
  heavenly_chips = 50,
  total_hc_earned = 50,
  owned_ascension_node_ids = '{}',
  total_money_earned = 100000000000000,
  miner_count = 100,
  has_autoclicker = true,
  stokens = 20;
