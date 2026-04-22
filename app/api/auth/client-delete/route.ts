import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { clientId, password } = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID required' },
        { status: 400 }
      );
    }

    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, username, mail_handle, password')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json(
        { success: false, error: 'Account not found.' },
        { status: 404 }
      );
    }

    // If the account has a password, require it to delete — so nobody can
    // nuke somebody else's account by stuffing their id in the body.
    if (client.password) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Password required to delete account.' },
          { status: 401 }
        );
      }
      if (client.password !== password) {
        return NextResponse.json(
          { success: false, error: 'Wrong password. Account not deleted.' },
          { status: 401 }
        );
      }
    }

    // Nuke the client row itself. Messages/conversations referencing this
    // user stay intact (so the other participants' inbox isn't broken), but
    // the identifiable account — username, password hash, mail handle — is gone.
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      console.error('Error deleting client:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Could not delete the account. Try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Client delete error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
