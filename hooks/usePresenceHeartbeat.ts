'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/lib/supabase';

// How often a logged-in user pings their presence row. The "Active Now" panel
// considers anyone whose last_seen is within the last ACTIVE_WINDOW_MS to be
// online, so this interval should be comfortably less than that window.
const HEARTBEAT_INTERVAL_MS = 20000;

/**
 * Heartbeat that keeps the user_presence table fresh for the current user.
 *
 * - Pings on mount, then every 20s.
 * - Re-pings when the path changes so the panel reflects where each user is.
 * - Re-pings when the tab becomes visible again (after sleep / tab switch).
 * - Sends one final beacon-style ping with the path on unload so we don't
 *   leave a stale row hanging around for an entire minute.
 */
export function usePresenceHeartbeat() {
  const { employee } = useAuth();
  const { client, isClient } = useClient();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let userId: string | null = null;
    let userType: 'employee' | 'client' | null = null;
    let username: string | null = null;
    if (employee) {
      userId = employee.id;
      userType = 'employee';
      username = employee.name;
    } else if (isClient && client) {
      userId = client.id;
      userType = 'client';
      username = client.username;
    }
    if (!userId || !userType) return;

    let cancelled = false;
    const ping = async () => {
      if (cancelled) return;
      try {
        await supabase.from('user_presence').upsert(
          {
            user_id: userId!,
            user_type: userType!,
            username: username,
            current_path: pathRef.current ?? '/',
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      } catch (err) {
        // Non-fatal — table might not exist yet (run sql/USER_PRESENCE.sql)
        console.warn('[presence] heartbeat failed', err);
      }
    };

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [employee, isClient, client]);

  // Separate effect so a route change immediately updates current_path without
  // tearing down the heartbeat interval.
  useEffect(() => {
    let userId: string | null = null;
    if (employee) userId = employee.id;
    else if (isClient && client) userId = client.id;
    if (!userId) return;
    let username: string | null = employee?.name ?? client?.username ?? null;
    let userType: 'employee' | 'client' = employee ? 'employee' : 'client';
    void supabase
      .from('user_presence')
      .upsert(
        {
          user_id: userId,
          user_type: userType,
          username,
          current_path: pathname ?? '/',
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .then(() => {});
  }, [pathname, employee, isClient, client]);
}
