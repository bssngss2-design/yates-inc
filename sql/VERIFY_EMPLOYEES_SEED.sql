-- Run in Supabase SQL Editor. If the first SELECT returns zero rows,
-- seed is missing → run sql/00_EMPLOYEES_AND_TASKS.sql (full file).
-- If row EXISTS but Employee Login fails, run sql/FIX_EMPLOYEES_LOGIN.sql (RLS).

SELECT id, name, role FROM employees WHERE id IN ('123456', '000001') ORDER BY id;

-- Optional: re-upsert Bernardo only (won’t delete other rows)
INSERT INTO employees (id, name, password, role, bio) VALUES
  ('123456', 'Bernardo', 'PSSW', 'CTO/CFO/LW',
   'Bernardo works in three areas. First, he''s our Chief Technology Officer handling all tech and development. Second, he''s our Chief Financial Officer managing all the money coming in and out. Finally, he''s the company''s Lawyer, negotiating partnerships and deals with other companies.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  bio = EXCLUDED.bio;
