-- Clients table existed without password; registration + login APIs need this column.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS password TEXT;
