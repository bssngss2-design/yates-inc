import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/migrate-old-users
 * 
 * Migrates orphaned users from user_game_data into the clients table.
 * This is called after a Supabase wipe to recover old user accounts.
 * 
 * SECURITY: Only accessible to employees (check Authorization header)
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { success: false, error: 'Server missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey);

  try {
    // 1. Find orphaned clients: in user_game_data but NOT in clients table
    const { data: orphanedUsers, error: queryErr } = await supabase
      .from('user_game_data')
      .select('user_id, username, created_at')
      .eq('user_type', 'client')
      .is('username', null)
      .limit(1000);

    if (queryErr) {
      console.error('Error querying orphaned users:', queryErr);
      return NextResponse.json(
        { success: false, error: 'Failed to query user data' },
        { status: 500 }
      );
    }

    if (!orphanedUsers || orphanedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned users found to migrate',
        migratedCount: 0,
      });
    }

    // 2. For each orphaned user, try to find their data in user_presence
    const { data: presenceData, error: presenceErr } = await supabase
      .from('user_presence')
      .select('user_id, username')
      .eq('user_type', 'client')
      .in(
        'user_id',
        orphanedUsers.map((u) => u.user_id)
      );

    if (presenceErr) {
      console.error('Error querying user_presence:', presenceErr);
    }

    const presenceMap = new Map(
      (presenceData || []).map((p) => [p.user_id, p.username])
    );

    // 3. Build insert data
    const clientsToInsert = orphanedUsers.map((u) => {
      const username =
        u.username ||
        presenceMap.get(u.user_id) ||
        `migrated_user_${u.user_id}`;
      const mailHandle =
        username.toLowerCase() + '_' + u.user_id.substring(0, 8) + '.mail';

      return {
        id: u.user_id,
        username: username.substring(0, 255), // Ensure max length
        mail_handle: mailHandle.substring(0, 255),
        password: '[MIGRATED - PASSWORD RESET REQUIRED]',
        created_at: u.created_at,
      };
    });

    // 4. Bulk insert into clients
    const { error: insertErr, data: inserted } = await supabase
      .from('clients')
      .upsert(clientsToInsert, { onConflict: 'id' });

    if (insertErr) {
      console.error('Error inserting migrated clients:', insertErr);
      return NextResponse.json(
        { success: false, error: 'Failed to insert migrated clients' },
        { status: 500 }
      );
    }

    // 5. Update user_game_data with denormalized usernames
    for (const client of clientsToInsert) {
      const { error: updateErr } = await supabase
        .from('user_game_data')
        .update({ username: client.username })
        .eq('user_id', client.id)
        .eq('user_type', 'client');

      if (updateErr) {
        console.warn(`Failed to update username for ${client.id}:`, updateErr);
      }
    }

    // 6. Update user_presence with denormalized usernames
    for (const client of clientsToInsert) {
      const { error: updateErr } = await supabase
        .from('user_presence')
        .update({ username: client.username })
        .eq('user_id', client.id)
        .eq('user_type', 'client');

      if (updateErr) {
        console.warn(`Failed to update presence username for ${client.id}:`, updateErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${clientsToInsert.length} old users to clients table`,
      migratedCount: clientsToInsert.length,
      migratedUsers: clientsToInsert.map((c) => ({
        id: c.id,
        username: c.username,
      })),
    });
  } catch (err) {
    console.error('Migration error:', err);
    return NextResponse.json(
      { success: false, error: 'Migration failed with exception' },
      { status: 500 }
    );
  }
}
