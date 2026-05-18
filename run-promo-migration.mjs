import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const queries = [
  `CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code_id TEXT NOT NULL UNIQUE,
    code_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,
  
  `INSERT INTO promo_codes (code_id, code_name, description, expires_at)
   VALUES ('SORRY4DOWN', 'SORRY4DOWN', 'Compensation for downtime - expires Thu May 20, 2026 11:59 PM UTC', '2026-05-21 03:59:00+00:00')
   ON CONFLICT (code_id) DO UPDATE SET
     expires_at = EXCLUDED.expires_at,
     updated_at = NOW();`,
  
  `INSERT INTO promo_codes (code_id, code_name, description, expires_at)
   VALUES ('CODES', 'CODES', 'General promo code - expires Fri May 22, 2026 11:59 PM UTC', '2026-05-23 03:59:00+00:00')
   ON CONFLICT (code_id) DO UPDATE SET
     expires_at = EXCLUDED.expires_at,
     updated_at = NOW();`,
  
  `CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at);`,
  
  `CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);`,
];

async function runMigration() {
  try {
    console.log('🚀 Starting promo codes migration...\n');
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`Running query ${i + 1}/${queries.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      
      if (error) {
        console.error(`❌ Error on query ${i + 1}:`, error.message);
      } else {
        console.log(`✓ Query ${i + 1} completed`);
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log('📊 Promo codes configured:');
    console.log('   - SORRY4DOWN: expires Thu May 20, 2026 11:59 PM UTC');
    console.log('   - CODES: expires Fri May 22, 2026 11:59 PM UTC');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

runMigration();
