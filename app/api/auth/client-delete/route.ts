import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyClientPassword } from '@/lib/clientPassword';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('client-delete: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is unset');
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
  }

  const supabase = createClient(url, anonKey);

  try {
    const { clientId, password } = await request.json();

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID required' }, { status: 400 });
    }

    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, username, mail_handle, password')
      .eq('id', clientId)
      .maybeSingle();

    if (fetchError || !client) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }

    if (client.password) {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Password required to delete account.' }, { status: 401 });
      }
      if (!verifyClientPassword(password, client.password)) {
        return NextResponse.json({ success: false, error: 'Wrong password. Account not deleted.' }, { status: 401 });
      }
    }

    const { error: deleteError } = await supabase.from('clients').delete().eq('id', clientId);

    if (deleteError) {
      console.error('Error deleting client:', deleteError);
      return NextResponse.json({ success: false, error: 'Could not delete the account. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Client delete error:', err);
    return NextResponse.json({ success: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
