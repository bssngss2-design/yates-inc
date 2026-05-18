# Supabase Setup Instructions

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key
4. Add them to `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 2: Create Database Tables

**Easiest:** open `sql/00_EMPLOYEES_AND_TASKS.sql` in this repo and run that entire file in the Supabase SQL Editor first.

Or paste the equivalent SQL below:

```sql
-- Create employees table
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT
);

-- Insert employee data
INSERT INTO employees (id, name, password, role, bio) VALUES
  ('000001', 'Logan Wall Fencer', 'CEOBOSS', 'CEO', 'Logan, is the CEO and founder of Yates Inc. He has spend a lot of time and effort, making this the greatest company he could every think of.'),
  ('39187', 'Mr. Michael Mackenzy McKale Mackelayne', 'MMMS', 'CPS/HR', 'Michael, is who does everything of our designs, and how things will work, he also is our Human Rights manager. Michael also is one of our 2 first hires, together with Bernardo. Michael is very hard working and is able to accomplish multiple Ps, a day, he one made 60% of our daily revenue, doing 21 Ps, and 2 30minute long videos to 5M+ subs channels.'),
  ('123456', 'Bernardo', 'PSSW', 'CTO/CFO/LW', 'Bernardo works in three areas. First, he''s our Chief Technology Officer handling all tech and development. Second, he''s our Chief Financial Officer managing all the money coming in and out. Finally, he''s the company''s Lawyer, negotiating partnerships and deals with other companies.'),
  ('007411', 'Dylan Mad Hawk', 'T@llahM2N', 'PSM', 'Dylan is our latest hire, but he is very hard working, he handles everything of managing the resources and putting them into our products, with the requirements made from the other companies/MMM''s design.'),
  ('674121', 'Harris', 'TUFboss', 'SCM', 'Harris is our newest hire and Supply Chain Manager. While he has some basic coding skills, his real strength is managing the supply chain and logistics. He handles all our partnerships, vendor relationships, and ensures resources flow smoothly to keep operations running.');

-- Create tasks table
CREATE TABLE tasks (
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
```

## Step 3: Set Up Row Level Security (RLS)

```sql
-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read all tasks
CREATE POLICY "Allow read access for all" 
ON tasks FOR SELECT 
USING (true);

-- Policy: Only CEO can insert tasks
CREATE POLICY "Allow CEO to insert tasks" 
ON tasks FOR INSERT 
WITH CHECK (created_by_id = '000001');

-- Policy: Assigned employee can update their progress (only increase)
CREATE POLICY "Allow assigned employee to update progress" 
ON tasks FOR UPDATE 
USING (assigned_to_id = auth.uid()::text)
WITH CHECK (assigned_to_id = auth.uid()::text);

-- Policy: Only CEO can delete tasks
CREATE POLICY "Allow CEO to delete tasks" 
ON tasks FOR DELETE 
USING (true);

-- Note: Since we're using custom auth (not Supabase Auth), 
-- the RLS policies above won't work perfectly. 
-- For simplicity, you can disable RLS or adjust policies to allow all operations
-- and handle permissions in the application layer instead.

-- To disable RLS for testing:
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
```

## Step 4: Optional - Add Sample Tasks

```sql
-- Insert sample tasks for testing
INSERT INTO tasks (task_name, description, assigned_to_id, assigned_to_name, progress_percentage, due_date, created_by_id) VALUES
  ('Update product images', 'Replace placeholder images with high-quality photos', '39187', 'Mr. Michael Mackenzy McKale Mackelayne', 25, '2025-11-01', '000001'),
  ('Review financial reports', 'Analyze Q4 revenue and prepare presentation', '123456', 'Bernardo', 60, '2025-10-28', '000001'),
  ('Inventory check', 'Complete monthly inventory audit for all products', '007411', 'Dylan Mad Hawk', 10, '2025-10-30', '000001');
```

## Step 5: Run the Development Server

```bash
npm run dev
```

Your Yates Inc. website should now be fully functional!

## Valid Login Credentials

- **Logan (CEO)**: ID: `000001` | Password: `CEOBOSS`
- **Michael**: ID: `39187` | Password: `MMMS`
- **Bernardo**: ID: `123456` | Password: `PSSW`
- **Dylan**: ID: `007411` | Password: `T@llahM2N`
- **Harris**: ID: `674121` | Password: `H@irI67`
- **Yates (HIDDEN ADMIN)**: ID: `000000` | Password: `DaGoat2026` *(Not shown in UI)*

## Step 6: Add Yates (Hidden Admin)

Yates is the owner/founder. He can login but is NOT shown anywhere on the website UI.

```sql
-- HIDDEN ADMIN - DO NOT add to frontend employee lists (products.ts, ComposeMessageModal, etc.)
INSERT INTO employees (id, name, password, role, bio) VALUES
  ('000000', 'Yates', 'DaGoat2026', 'OWNER', 'The founder and owner of Yates Inc.')
ON CONFLICT (id) DO NOTHING;
```

## Notes

- The app uses localStorage for cart and session management
- No logout button is needed (per spec)
- CEO can add/delete tasks and change due dates
- Assigned employees can only increase their task progress
- All product images are in the `/public` folder








- No logout button is needed (per spec)
- CEO can add/delete tasks and change due dates
- Assigned employees can only increase their task progress
- All product images are in the `/public` folder







