-- ============================================
-- Employee Tiers & XP System (Task Q)
-- 1-100 tier system that replaces / augments the role field.
-- XP comes from tax votes, EOTM, budget contributions, game sessions,
-- and Logan's manual grants from the admin page.
--
-- Scaling: xp_to_next_tier(current_tier) = 100 + current_tier * 50
--   tier  1 -> 2:    150 XP
--   tier 50 -> 51: 2,600 XP
--   tier 99 -> 100: 5,050 XP
-- ============================================

-- =====================
-- employee_tiers (primary table)
-- =====================
CREATE TABLE IF NOT EXISTS employee_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  current_tier INTEGER NOT NULL DEFAULT 1 CHECK (current_tier >= 1 AND current_tier <= 100),
  current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
  total_xp_earned BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- employee_xp_log (audit log of XP grants)
-- =====================
CREATE TABLE IF NOT EXISTS employee_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_log_employee ON employee_xp_log(employee_id, created_at DESC);

-- =====================
-- RLS (open like the rest of the app)
-- =====================
ALTER TABLE employee_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_xp_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on employee_tiers" ON employee_tiers;
CREATE POLICY "Allow all on employee_tiers" ON employee_tiers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on employee_xp_log" ON employee_xp_log;
CREATE POLICY "Allow all on employee_xp_log" ON employee_xp_log
  FOR ALL USING (true) WITH CHECK (true);

-- =====================
-- award_xp(): main XP grant function with auto tier-up
-- =====================
CREATE OR REPLACE FUNCTION award_xp(
  p_employee_id TEXT,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql AS $fn$
#variable_conflict use_variable
DECLARE
  v_current_tier INTEGER;
  v_current_xp INTEGER;
  v_new_xp INTEGER;
  v_new_tier INTEGER;
  v_needed INTEGER;
  v_tiered_up BOOLEAN := FALSE;
  v_amount INTEGER := GREATEST(0, p_amount);
BEGIN
  -- Ensure the row exists
  INSERT INTO employee_tiers (employee_id) VALUES (p_employee_id)
  ON CONFLICT (employee_id) DO NOTHING;

  -- Fetch current state
  SELECT employee_tiers.current_tier, employee_tiers.current_xp
    INTO v_current_tier, v_current_xp
    FROM employee_tiers
    WHERE employee_tiers.employee_id = p_employee_id;

  -- At max tier? Log and bounce out
  IF v_current_tier >= 100 THEN
    INSERT INTO employee_xp_log (employee_id, amount, source, description)
    VALUES (p_employee_id, v_amount, p_source, p_description);
    RETURN jsonb_build_object(
      'tier', 100,
      'xp', v_current_xp,
      'xp_to_next', 0,
      'tiered_up', false,
      'capped', true
    );
  END IF;

  v_new_xp := v_current_xp + v_amount;
  v_new_tier := v_current_tier;

  LOOP
    v_needed := 100 + v_new_tier * 50;
    EXIT WHEN v_new_xp < v_needed OR v_new_tier >= 100;
    v_new_xp := v_new_xp - v_needed;
    v_new_tier := v_new_tier + 1;
    v_tiered_up := TRUE;
  END LOOP;

  -- Clamp at max
  IF v_new_tier >= 100 THEN
    v_new_tier := 100;
    v_new_xp := 0;
  END IF;

  UPDATE employee_tiers
  SET current_tier = v_new_tier,
      current_xp = v_new_xp,
      total_xp_earned = total_xp_earned + v_amount,
      updated_at = NOW()
  WHERE employee_tiers.employee_id = p_employee_id;

  INSERT INTO employee_xp_log (employee_id, amount, source, description)
  VALUES (p_employee_id, v_amount, p_source, p_description);

  RETURN jsonb_build_object(
    'tier', v_new_tier,
    'xp', v_new_xp,
    'xp_to_next', CASE WHEN v_new_tier >= 100 THEN 0 ELSE 100 + v_new_tier * 50 END,
    'tiered_up', v_tiered_up,
    'capped', v_new_tier >= 100
  );
END;
$fn$;

-- =====================
-- instant_tier_up(): +1 tier regardless of XP (used for EOTM)
-- =====================
CREATE OR REPLACE FUNCTION instant_tier_up(
  p_employee_id TEXT,
  p_source TEXT DEFAULT 'instant_tier_up'
) RETURNS JSONB LANGUAGE plpgsql AS $fn$
#variable_conflict use_variable
DECLARE
  v_new_tier INTEGER;
BEGIN
  INSERT INTO employee_tiers (employee_id) VALUES (p_employee_id)
  ON CONFLICT (employee_id) DO NOTHING;

  UPDATE employee_tiers
  SET current_tier = LEAST(current_tier + 1, 100),
      current_xp = 0,
      updated_at = NOW()
  WHERE employee_tiers.employee_id = p_employee_id
  RETURNING employee_tiers.current_tier INTO v_new_tier;

  INSERT INTO employee_xp_log (employee_id, amount, source, description)
  VALUES (p_employee_id, 0, p_source, 'Instant tier-up');

  RETURN jsonb_build_object('tier', v_new_tier);
END;
$fn$;

-- =====================
-- Realtime (idempotent)
-- =====================
DO $tier_realtime$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE employee_tiers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE employee_xp_log;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$tier_realtime$;
