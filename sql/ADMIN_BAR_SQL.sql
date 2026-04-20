-- ============================================
-- Admin Bar System (Task P)
-- Backs Logan's consolidated admin features:
--   - Employee of the Month picker + plaque (Task O display)
--   - Hire new employees (dynamic roster append)
--   - Fire existing employees (hides them from the active roster)
-- ============================================

-- =====================
-- employee_of_the_month
-- Stores the currently-selected EOTM. Inserting a new row replaces the
-- active one (latest by set_date wins when rendering).
-- =====================
CREATE TABLE IF NOT EXISTS employee_of_the_month (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  set_date DATE NOT NULL DEFAULT CURRENT_DATE,
  set_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eotm_set_date
  ON employee_of_the_month(set_date DESC);

-- =====================
-- admin_hired_employees
-- Employees added at runtime via Logan's Hire button. These get merged into
-- the UI roster alongside the static `employees` array in utils/products.ts.
-- =====================
CREATE TABLE IF NOT EXISTS admin_hired_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  hired_by TEXT NOT NULL,
  hired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- admin_fired_employees
-- Marks an employee_id as fired. The employees page filters by this list.
-- Works for both static `employees` and dynamically hired ones.
-- =====================
CREATE TABLE IF NOT EXISTS admin_fired_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  employee_name TEXT NOT NULL,
  reason TEXT,
  fired_by TEXT NOT NULL,
  fired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- RLS (open like the rest of the app)
-- =====================
ALTER TABLE employee_of_the_month ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_hired_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_fired_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on employee_of_the_month" ON employee_of_the_month;
CREATE POLICY "Allow all on employee_of_the_month" ON employee_of_the_month
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on admin_hired_employees" ON admin_hired_employees;
CREATE POLICY "Allow all on admin_hired_employees" ON admin_hired_employees
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on admin_fired_employees" ON admin_fired_employees;
CREATE POLICY "Allow all on admin_fired_employees" ON admin_fired_employees
  FOR ALL USING (true) WITH CHECK (true);

-- =====================
-- Realtime (idempotent)
-- =====================
DO $admin_realtime$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE employee_of_the_month;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_hired_employees;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_fired_employees;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$admin_realtime$;
