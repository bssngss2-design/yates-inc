-- ============================================
-- Employee Shop System (Task N)
-- Employees spend their paycheck balance (yates$ / walters$) on shop items.
-- Some items are one-time effects (promotion cert, chair), some are consumables
-- (motivation pack = click once to spawn a 1min game boost pill, energy bomb = 2-day visual).
-- ============================================

-- =====================
-- employee_shop_purchases
-- Audit log of every purchase
-- =====================
CREATE TABLE IF NOT EXISTS employee_shop_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price NUMERIC(20, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('yates', 'walters')),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_shop_purchases_employee
  ON employee_shop_purchases(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_shop_purchases_item
  ON employee_shop_purchases(item_id);

-- =====================
-- employee_shop_effects
-- Currently-active effects. One row per (employee_id, effect_type).
-- Re-buying an item either extends expires_at or increments uses_remaining,
-- depending on the effect.
-- =====================
CREATE TABLE IF NOT EXISTS employee_shop_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  effect_type TEXT NOT NULL,
  uses_remaining INTEGER,                           -- NULL means permanent / time-based
  expires_at TIMESTAMP WITH TIME ZONE,              -- NULL means permanent
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,      -- free-form per effect
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (employee_id, effect_type)
);

CREATE INDEX IF NOT EXISTS idx_employee_shop_effects_employee
  ON employee_shop_effects(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_shop_effects_expires
  ON employee_shop_effects(expires_at);

-- =====================
-- RLS
-- =====================
ALTER TABLE employee_shop_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shop_effects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on employee_shop_purchases" ON employee_shop_purchases;
CREATE POLICY "Allow all on employee_shop_purchases" ON employee_shop_purchases
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on employee_shop_effects" ON employee_shop_effects;
CREATE POLICY "Allow all on employee_shop_effects" ON employee_shop_effects
  FOR ALL USING (true) WITH CHECK (true);

-- =====================
-- Realtime (idempotent)
-- =====================
DO $shop_realtime$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE employee_shop_purchases;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE employee_shop_effects;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$shop_realtime$;
