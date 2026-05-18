const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sqlMigration = `
-- Create promo_codes table for managing promotional codes with expiry dates
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code_id TEXT NOT NULL UNIQUE,
  code_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial promo codes with expiry dates
-- SORRY4DOWN expires Thursday May 20, 2026 at 11:59 PM UTC
INSERT INTO promo_codes (code_id, code_name, description, expires_at)
VALUES ('SORRY4DOWN', 'SORRY4DOWN', 'Compensation for downtime - expires Thu May 20, 2026 11:59 PM UTC', '2026-05-21 03:59:00+00:00')
ON CONFLICT (code_id) DO UPDATE SET
  expires_at = EXCLUDED.expires_at,
  updated_at = NOW();

-- CODES expires Friday May 22, 2026 at 11:59 PM UTC
INSERT INTO promo_codes (code_id, code_name, description, expires_at)
VALUES ('CODES', 'CODES', 'General promo code - expires Fri May 22, 2026 11:59 PM UTC', '2026-05-23 03:59:00+00:00')
ON CONFLICT (code_id) DO UPDATE SET
  expires_at = EXCLUDED.expires_at,
  updated_at = NOW();

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
`;

async function runMigration() {
  try {
    console.log('🚀 Starting promo codes table migration...');
    
    const { data, error } = await supabase
      .rpc('exec_sql', { sql: sqlMigration });
    
    if (error) {
      console.error('❌ SQL Error:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Created promo_codes table with:');
    console.log('   - SORRY4DOWN: expires Thu May 20, 2026 11:59 PM UTC');
    console.log('   - CODES: expires Fri May 22, 2026 11:59 PM UTC');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error running migration:', err.message);
    process.exit(1);
  }
}

runMigration();
