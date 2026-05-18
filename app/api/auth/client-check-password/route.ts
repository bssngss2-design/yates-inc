import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ needsPassword: false }, { status: 503 });
  }

  const supabase = createClient(url, anonKey);

  try {
    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ needsPassword: false }, { status: 400 });
    }

    const { data, error } = await supabase.from('clients').select('password').eq('id', clientId).maybeSingle();

    if (error) {
      return NextResponse.json({ needsPassword: true });
    }

    return NextResponse.json({ needsPassword: !data?.password });
  } catch (err) {
    console.error('Check password error:', err);
    return NextResponse.json({ needsPassword: true });
  }
}
