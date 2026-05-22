import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashClientPassword, isBcryptHash, verifyClientPassword } from '@/lib/clientPassword';

const MIGRATED_PASSWORD_PLACEHOLDER = '[MIGRATED - PASSWORD RESET REQUIRED]';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('client-login: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is unset');
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
  }

  const supabase = createClient(url, anonKey);

  try {
    const { username, password } = await request.json();

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 });
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, username, mail_handle, password')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error || !client) {
      return NextResponse.json({ success: false, error: 'Account not found. Check your username or create a new one!' });
    }

    // NEW: Detect migrated accounts that need password reset
    if (client.password === MIGRATED_PASSWORD_PLACEHOLDER) {
      return NextResponse.json({
        success: false,
        error: 'needs_password_reset',
        message: 'Your account was recovered from our database backup. Please set a new password to continue.',
        userId: client.id,
        username: client.username,
      });
    }

    if (client.password) {
      if (!password) {
        return NextResponse.json({
          success: false,
          error: 'needs_password',
          message: 'This account has a password. Please enter it.',
        });
      }

      if (!verifyClientPassword(password, client.password)) {
        return NextResponse.json({ success: false, error: 'Wrong password! Try again.' });
      }

      // One-time migration: plaintext → bcrypt
      if (!isBcryptHash(client.password)) {
        const upgraded = hashClientPassword(password);
        await supabase.from('clients').update({ password: upgraded }).eq('id', client.id);
      }
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        username: client.username,
        mail_handle: client.mail_handle,
      },
    });
  } catch (err) {
    console.error('Client login error:', err);
    return NextResponse.json({ success: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
