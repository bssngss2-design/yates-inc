'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTaxVote } from '@/contexts/TaxVoteContext';

function timeLeft(endIso: string): { text: string; endedSoon: boolean } {
  const ms = new Date(endIso).getTime() - Date.now();
  if (ms <= 0) return { text: 'ENDED', endedSoon: true };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const endedSoon = ms < 60 * 60 * 1000; // last hour
  if (d > 0) return { text: `${d}d ${h}h ${m}m`, endedSoon };
  if (h > 0) return { text: `${h}h ${m}m ${s}s`, endedSoon };
  if (m > 0) return { text: `${m}m ${s}s`, endedSoon };
  return { text: `${s}s`, endedSoon };
}

export default function ActiveChangeBanner() {
  const { activeProposal } = useTaxVote();
  const pathname = usePathname();
  const [, rerender] = useState(0);

  // Banner only lives on the home page. On other routes it's noise.
  const onHome = pathname === '/';

  useEffect(() => {
    if (!activeProposal || !onHome) return;
    const i = setInterval(() => rerender((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [activeProposal, onHome]);

  if (!activeProposal || !activeProposal.timer_end || !onHome) return null;

  const { text, endedSoon } = timeLeft(activeProposal.timer_end);

  return (
    <div className="bg-gradient-to-r from-black via-yellow-500 to-black py-2 border-y-2 border-yellow-400 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0 animate-pulse">📢</span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-black tracking-widest text-yellow-200 leading-tight">
              Active Change
            </div>
            <div className="text-base sm:text-lg font-black text-white truncate drop-shadow">
              {activeProposal.title}
            </div>
          </div>
        </div>
        <div
          className={`shrink-0 bg-black border-2 border-yellow-400 rounded-lg px-3 py-1 text-center ${
            endedSoon ? 'animate-pulse' : ''
          }`}
        >
          <div className="text-[9px] uppercase tracking-widest text-yellow-400 leading-tight">
            Ends in
          </div>
          <div className="text-sm sm:text-base font-mono font-bold tabular-nums text-yellow-300">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
