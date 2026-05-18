import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashClientPassword } from '@/lib/clientPassword';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('client-set-password: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is unset');
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
  }

  const supabase = createClient(url, anonKey);

  try {
    const { clientId, password } = await request.json();

    if (!clientId || !password) {
      return NextResponse.json({ success: false, error: 'Client ID and password required' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ success: false, error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const passwordHash = hashClientPassword(password);
    const { error: updateError } = await supabase.from('clients').update({ password: passwordHash }).eq('id', clientId);

    if (updateError) {
      console.error('Error setting password:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to save password.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Set password error:', err);
    return NextResponse.json({ success: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
