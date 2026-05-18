import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid code parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('promo_codes')
      .select('code_id, expires_at, is_active')
      .eq('code_id', code.toUpperCase())
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Promo code not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        code_id: data.code_id,
        expires_at: data.expires_at,
        is_active: data.is_active,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching promo code:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
