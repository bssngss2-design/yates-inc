-- Company Budget System Tables
-- Run this in your Supabase SQL Editor
--
-- PREREQUISITE: Run sql/00_EMPLOYEES_AND_TASKS.sql first (creates `employees`).

-- Main budget table (single row for company totals)
CREATE TABLE IF NOT EXISTS company_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_funds DECIMAL(20,2) DEFAULT 700532000, -- 700M 532K starting total
  active_budget DECIMAL(20,2) DEFAULT 100000000, -- 100M currently in use
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial budget data
INSERT INTO company_budget (total_funds, active_budget)
VALUES (700532000, 100000000)
ON CONFLICT DO NOTHING;

-- Transaction history for audit trail
CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(20,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('product_sale', 'prestige', 'paycheck', 'manual_add', 'manual_subtract')),
  description TEXT,
  affects TEXT NOT NULL CHECK (affects IN ('total_funds', 'active_budget', 'both')),
  created_by TEXT, -- employee_id who made the transaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget price history for the graph (like stock prices)
CREATE TABLE IF NOT EXISTS budget_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_funds DECIMAL(20,2) NOT NULL,
  active_budget DECIMAL(20,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE company_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust for production)
CREATE POLICY "Allow all on company_budget" ON company_budget
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on budget_transactions" ON budget_transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on budget_history" ON budget_history
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_budget_transactions_type ON budget_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_created ON budget_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_history_recorded ON budget_history(recorded_at DESC);

-- Function to record budget history (call periodically or on changes)
CREATE OR REPLACE FUNCTION record_budget_snapshot()
RETURNS void AS $$
BEGIN
  INSERT INTO budget_history (total_funds, active_budget)
  SELECT total_funds, active_budget FROM company_budget LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add Yates as hidden admin (NOT shown in UI, but can login)
-- Note: This is a hidden admin account - DO NOT add to frontend employee lists
INSERT INTO employees (id, name, password, role, bio) VALUES
  ('000000', 'Yates', 'DaGoat2026', 'OWNER', 'The founder and owner of Yates Inc.')
ON CONFLICT (id) DO NOTHING;

-- Add prestige columns to user_game_data if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_game_data' AND column_name = 'prestige_count') THEN
    ALTER TABLE user_game_data ADD COLUMN prestige_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_game_data' AND column_name = 'prestige_multiplier') THEN
    ALTER TABLE user_game_data ADD COLUMN prestige_multiplier DECIMAL(5,2) DEFAULT 1.0;
  END IF;
END $$;

