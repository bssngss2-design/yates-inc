-- ============================================
-- Tax Vote System (Task M)
-- Tax pool accumulates wealth from the game's wealth tax + a portion of
-- employee paycheck tax. Anyone can submit a "Vote for Change" proposal.
-- 5 approvers vote (3/5 majority). Approvers set the cost (deducts from pool).
-- Logan (000001) sets the timer which activates the banner on the home page.
-- ============================================

-- =====================
-- tax_pool (single row, like company_budget)
-- =====================
CREATE TABLE IF NOT EXISTS tax_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance NUMERIC(48, 2) NOT NULL DEFAULT 0,
  total_collected NUMERIC(48, 2) NOT NULL DEFAULT 0,
  total_spent NUMERIC(48, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the single row if empty
INSERT INTO tax_pool (balance, total_collected, total_spent)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM tax_pool);

-- =====================
-- tax_pool_transactions (audit trail)
-- =====================
CREATE TABLE IF NOT EXISTS tax_pool_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(48, 2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  source TEXT NOT NULL, -- 'wealth_tax', 'paycheck_tax', 'proposal_spend'
  description TEXT,
  related_proposal_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_pool_transactions_created_at
  ON tax_pool_transactions(created_at DESC);

-- =====================
-- change_proposals
-- =====================
CREATE TABLE IF NOT EXISTS change_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id TEXT NOT NULL,
  proposer_name TEXT NOT NULL,
  proposer_type TEXT NOT NULL DEFAULT 'employee' CHECK (proposer_type IN ('employee', 'client')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed')),
  cost_amount NUMERIC(48, 2), -- filled when an approver sets the cost
  cost_percentage NUMERIC(6, 3), -- optional: cost as % of pool at time of setting
  approvals JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of approver ids who voted YES
  rejections JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of approver ids who voted NO
  cost_set_by TEXT, -- approver id who set the cost
  cost_set_at TIMESTAMP WITH TIME ZONE,
  timer_set_by TEXT, -- approver id who set the timer (Logan)
  timer_start TIMESTAMP WITH TIME ZONE,
  timer_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_proposals_status
  ON change_proposals(status);
CREATE INDEX IF NOT EXISTS idx_change_proposals_created_at
  ON change_proposals(created_at DESC);

-- =====================
-- RLS
-- =====================
ALTER TABLE tax_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_pool_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on tax_pool" ON tax_pool;
CREATE POLICY "Allow all on tax_pool" ON tax_pool
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on tax_pool_transactions" ON tax_pool_transactions;
CREATE POLICY "Allow all on tax_pool_transactions" ON tax_pool_transactions
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on change_proposals" ON change_proposals;
CREATE POLICY "Allow all on change_proposals" ON change_proposals
  FOR ALL USING (true) WITH CHECK (true);

-- =====================
-- Realtime (idempotent)
-- =====================
DO $realtime$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tax_pool;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE change_proposals;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$realtime$;

-- =====================
-- Helper RPC: atomically add to the pool
-- (avoids race conditions when game wealth tax + paychecks hit at once)
-- =====================
CREATE OR REPLACE FUNCTION add_to_tax_pool(
  p_amount NUMERIC,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_pool_id UUID;
  result_balance NUMERIC;
BEGIN
  -- Grab the single row's id (safe-update mode requires a keyed WHERE)
  SELECT id INTO v_pool_id FROM tax_pool LIMIT 1;
  IF v_pool_id IS NULL THEN
    -- Shouldn't happen since we seed on table creation, but self-heal anyway
    INSERT INTO tax_pool (balance, total_collected, total_spent)
    VALUES (0, 0, 0)
    RETURNING id INTO v_pool_id;
  END IF;

  UPDATE tax_pool
  SET balance = tax_pool.balance + p_amount,
      total_collected = tax_pool.total_collected + p_amount,
      updated_at = NOW()
  WHERE id = v_pool_id
  RETURNING tax_pool.balance INTO result_balance;

  INSERT INTO tax_pool_transactions (amount, direction, source, description)
  VALUES (p_amount, 'in', p_source, p_description);

  RETURN result_balance;
END;
$fn$;

-- =====================
-- Helper RPC: atomically spend from the pool (for proposal activation)
-- Returns the new balance, or NULL if insufficient funds.
-- =====================
CREATE OR REPLACE FUNCTION spend_from_tax_pool(
  p_amount NUMERIC,
  p_proposal_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_pool_id UUID;
  result_balance NUMERIC;
BEGIN
  SELECT id INTO v_pool_id FROM tax_pool LIMIT 1;
  IF v_pool_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Only update if there's enough money; if not, RETURNING yields no row
  -- and result_balance stays NULL.
  UPDATE tax_pool
  SET balance = tax_pool.balance - p_amount,
      total_spent = tax_pool.total_spent + p_amount,
      updated_at = NOW()
  WHERE id = v_pool_id
    AND tax_pool.balance >= p_amount
  RETURNING tax_pool.balance INTO result_balance;

  IF result_balance IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO tax_pool_transactions (amount, direction, source, description, related_proposal_id)
  VALUES (p_amount, 'out', 'proposal_spend', p_description, p_proposal_id);

  RETURN result_balance;
END;
$fn$;
