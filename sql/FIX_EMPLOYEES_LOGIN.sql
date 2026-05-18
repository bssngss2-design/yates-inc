-- Employee login uses anon key SELECT on `employees`.
-- If RLS is enabled on `employees` with no policy, login always fails ("ID wrong").
-- Run once in Supabase SQL Editor.

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_anon_select" ON employees;
CREATE POLICY "employees_anon_select" ON employees FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "employees_auth_select" ON employees;
CREATE POLICY "employees_auth_select" ON employees FOR SELECT TO authenticated USING (true);

GRANT SELECT ON employees TO anon;
GRANT SELECT ON employees TO authenticated;
