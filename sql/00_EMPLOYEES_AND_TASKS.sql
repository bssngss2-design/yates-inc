-- ============================================
-- RUN THIS FILE FIRST — before any other sql/*.sql
-- ============================================
-- Creates `employees` and `tasks`. Required by BUDGET_SQL.sql (hidden owner row),
-- INBOX_COMPLETE_SQL.sql (FK to employees), PAYCHECK_SQL.sql seed IDs, etc.
-- ============================================

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT
);

-- Insert employee data (idempotent)
INSERT INTO employees (id, name, password, role, bio) VALUES
  ('000001', 'Logan Wall Fencer', 'CEOBOSS', 'CEO', 'Logan, is the CEO and founder of Yates Inc. He has spend a lot of time and effort, making this the greatest company he could every think of.'),
  ('39187', 'Mr. Michael Mackenzy McKale Mackelayne', 'MMMS', 'CPS/HR', 'Michael, is who does everything of our designs, and how things will work, he also is our Human Rights manager. Michael also is one of our 2 first hires, together with Bernardo. Michael is very hard working and is able to accomplish multiple Ps, a day, he one made 60% of our daily revenue, doing 21 Ps, and 2 30minute long videos to 5M+ subs channels.'),
  ('123456', 'Bernardo', 'PSSW', 'CTO/CFO/LW', 'Bernardo works in three areas. First, he''s our Chief Technology Officer handling all tech and development. Second, he''s our Chief Financial Officer managing all the money coming in and out. Finally, he''s the company''s Lawyer, negotiating partnerships and deals with other companies.'),
  ('007411', 'Dylan Mad Hawk', 'T@llahM2N', 'PSM', 'Dylan is our latest hire, but he is very hard working, he handles everything of managing the resources and putting them into our products, with the requirements made from the other companies/MMM''s design.'),
  ('674121', 'Harris', 'TUFboss', 'SCM', 'Harris is our newest hire and Supply Chain Manager. While he has some basic coding skills, his real strength is managing the supply chain and logistics. He handles all our partnerships, vendor relationships, and ensures resources flow smoothly to keep operations running.')
ON CONFLICT (id) DO NOTHING;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name TEXT NOT NULL,
  description TEXT,
  assigned_to_id TEXT NOT NULL REFERENCES employees(id),
  assigned_to_name TEXT NOT NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  due_date DATE NOT NULL,
  created_by_id TEXT NOT NULL REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
