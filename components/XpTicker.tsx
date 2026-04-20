'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Grants passive XP (10) every 5 minutes while a logged-in employee
 * is actively on the /game path. Tab visibility is respected — no XP
 * accrues while the tab is hidden.
 */
const TICK_MS = 5 * 60 * 1000; // 5 minutes
const XP_PER_TICK = 10;

export default function XpTicker() {
  const { employee, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only tick while an employee is logged in and on the game page
    const onGame = pathname?.startsWith('/game');
    if (!isLoggedIn || !employee?.id || !onGame) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        await supabase.rpc('award_xp', {
          p_employee_id: employee.id,
          p_amount: XP_PER_TICK,
          p_source: 'game_session',
          p_description: 'Playing the game',
        });
      } catch (e) {
        console.warn('[XpTicker] award failed (non-fatal):', e);
      }
    };

    intervalRef.current = setInterval(tick, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isLoggedIn, employee?.id, pathname]);

  return null;
}
