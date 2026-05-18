-- Fix client signup (500 on /api/auth/client-register)
-- Run the whole block in Supabase SQL Editor once.
--
-- 1) Column the API inserts
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password TEXT;

-- 2) RLS: if the table has RLS on but no policies, anon inserts fail.
--    These policies match how the app uses NEXT_PUBLIC_SUPABASE_ANON_KEY in API routes.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_anon_select" ON clients;
CREATE POLICY "clients_anon_select" ON clients FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "clients_anon_insert" ON clients;
CREATE POLICY "clients_anon_insert" ON clients FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "clients_anon_update" ON clients;
CREATE POLICY "clients_anon_update" ON clients FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clients_auth_select" ON clients;
CREATE POLICY "clients_auth_select" ON clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "clients_auth_insert" ON clients;
CREATE POLICY "clients_auth_insert" ON clients FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "clients_auth_update" ON clients;
CREATE POLICY "clients_auth_update" ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON clients TO anon;
GRANT SELECT, INSERT, UPDATE ON clients TO authenticated;
