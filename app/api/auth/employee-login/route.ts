import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('employee-login: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is unset');
    return NextResponse.json({ success: false, error: 'config' }, { status: 500 });
  }

  const supabase = createClient(url, anonKey);

  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!id || !password) {
      return NextResponse.json({ success: false, error: 'invalid' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employees')
      .select('id, name, password, role, bio, mail_handle')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('employee-login Supabase:', error.code, error.message);
      const msg = error.message || '';
      const isMissingTable = /does not exist|42P01/i.test(msg);
      const isRls =
        error.code === '42501' || /permission denied|row-level security|RLS/i.test(msg);
      if (isMissingTable) {
        return NextResponse.json({ success: false, error: 'no_table', detail: msg });
      }
      if (isRls) {
        return NextResponse.json({ success: false, error: 'rls', detail: msg });
      }
      return NextResponse.json({ success: false, error: 'server', detail: msg });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'id' });
    }

    if (data.password !== password) {
      return NextResponse.json({ success: false, error: 'password' });
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: data.id,
        name: data.name,
        role: data.role,
        bio: data.bio,
        mail_handle: data.mail_handle,
      },
    });
  } catch (err) {
    console.error('Employee login error:', err);
    return NextResponse.json({ success: false, error: 'server' }, { status: 500 });
  }
}
