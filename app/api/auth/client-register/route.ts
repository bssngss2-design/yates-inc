import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('client-register: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is unset');
    return NextResponse.json(
      {
        success: false,
        error:
          'Server missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart `npm run dev`.',
      },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey);

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const mailHandle = username.toLowerCase() + '.mail';

    // Check if username already exists (maybeSingle: zero rows is not an error)
    const { data: existingUser } = await supabase
      .from('clients')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Username already taken! Try another one.' });
    }

    // Create new client — password stored server-side, never returned
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert([
        {
          username: username.toLowerCase(),
          mail_handle: mailHandle,
          password: password,
        },
      ])
      .select('id, username, mail_handle')
      .single();

    if (createError) {
      console.error('Error creating client:', createError.code, createError.message, createError.details, createError.hint);
      const msg = typeof createError.message === 'string' ? createError.message : '';
      const isSchema =
        /column|schema cache|PGRST204|42703/i.test(msg) || createError.code === 'PGRST204' || createError.code === '42703';
      const isRls =
        /row-level security|rls|violates row-level|42501|permission denied/i.test(msg) ||
        createError.code === '42501';
      const isMissingTable = /relation ["']?clients["']? does not exist|42P01/i.test(msg);
      let error = 'Error creating account. Make sure you ran the SQL setup!';
      if (isMissingTable) {
        error = 'Table `clients` is missing. Run sql/CLIENTS_SQL.sql in Supabase SQL Editor.';
      } else if (isSchema) {
        error =
          'Database: `clients` needs a `password` column. In Supabase SQL Editor run sql/FIX_CLIENTS_REGISTRATION.sql (or sql/CATCH_UP_CLIENTS_PASSWORD.sql).';
      } else if (isRls) {
        error =
          'Database: Row Level Security is blocking signup. In Supabase SQL Editor run sql/FIX_CLIENTS_REGISTRATION.sql (adds anon policies for `clients`).';
      }
      return NextResponse.json(
        {
          success: false,
          error,
          ...(process.env.NODE_ENV === 'development' ? { debug: msg || String(createError) } : {}),
        },
        { status: 500 }
      );
    }

    // Return client data WITHOUT the password
    return NextResponse.json({
      success: true,
      client: {
        id: newClient.id,
        username: newClient.username,
        mail_handle: newClient.mail_handle,
      },
    });
  } catch (err) {
    console.error('Client register error:', err);
    return NextResponse.json({ success: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
