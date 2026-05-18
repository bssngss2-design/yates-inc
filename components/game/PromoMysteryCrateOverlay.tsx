'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import type { PromoMysteryCrateTier } from '@/types/game';

const BOX_META: Record<
  PromoMysteryCrateTier,
  { name: string; closedImage: string; openImage: string }
> = {
  sketchy: {
    name: 'Sketchy Box',
    closedImage: '/game/shadysam/sketchy_closed.png',
    openImage: '/game/shadysam/sketchy_open.png',
  },
  suspicious: {
    name: 'Suspicious Crate',
    closedImage: '/game/shadysam/suspicious_closed.png',
    openImage: '/game/shadysam/suspicious_open.png',
  },
  cursed: {
    name: 'Cursed Chest',
    closedImage: '/game/shadysam/cursed_closed.png',
    openImage: '/game/shadysam/cursed_open_good.png',
  },
};

type UiMode = 'idle' | 'animating' | 'result';

/**
 * Sequential promo-code mystery crates: same 2s opening beat as Shady Sam, one reward at a time.
 */
export default function PromoMysteryCrateOverlay() {
  const { gameState, openPendingPromoMysteryCrate } = useGame();
  const queue = gameState.pendingPromoMysteryCrates ?? [];
  const [mode, setMode] = useState<UiMode>('idle');
  const [openedTier, setOpenedTier] = useState<PromoMysteryCrateTier | null>(null);
  const [lastReward, setLastReward] = useState('');

  const visible = queue.length > 0 || mode === 'result';
  const displayTier = openedTier ?? queue[0] ?? null;

  useLayoutEffect(() => {
    if (mode === 'idle' && queue.length > 0) {
      setOpenedTier(queue[0]);
      setMode('animating');
    }
  }, [mode, queue.length, queue[0]]);

  useEffect(() => {
    if (mode !== 'animating') return;
    if (queue.length === 0) {
      setMode('idle');
      return;
    }
    const t = window.setTimeout(() => {
      const r = openPendingPromoMysteryCrate();
      setLastReward(r?.message ?? 'Reward applied!');
      setMode('result');
    }, 2000);
    return () => window.clearTimeout(t);
  }, [mode, queue.length, openPendingPromoMysteryCrate]);

  if (!visible || !displayTier) return null;

  const meta = BOX_META[displayTier];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative bg-gradient-to-br from-gray-900/95 to-amber-950/95 rounded-2xl w-full max-w-lg border-2 border-amber-500/40 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-900 to-amber-800 px-5 py-3">
          <h2 className="text-lg font-bold text-white">Promo mystery crate</h2>
          <p className="text-amber-200/80 text-xs">
            {mode === 'animating' && queue.length > 0
              ? `${queue.length} in queue · ${meta.name}`
              : mode === 'result'
                ? queue.length > 0
                  ? `${queue.length} more after this`
                  : 'Last crate opened'
                : ''}
          </p>
        </div>

        <div className="p-6">
          {mode === 'animating' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="animate-bounce">
                <Image
                  src={meta.closedImage}
                  alt={meta.name}
                  width={160}
                  height={160}
                  unoptimized
                  className="object-contain"
                />
              </div>
              <p className="text-amber-200 text-lg font-bold animate-pulse">Opening {meta.name}…</p>
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full bg-amber-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {mode === 'result' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Image
                src={meta.openImage}
                alt="Opened"
                width={180}
                height={180}
                unoptimized
                className="object-contain"
              />
              <p className="text-3xl mb-1">🎉</p>
              <p
                className={`text-center text-lg font-bold px-4 py-2 rounded-lg ${
                  lastReward.includes('trinket')
                    ? 'text-purple-200 bg-purple-900/40 border border-purple-500/30'
                    : lastReward.includes('Stokens')
                      ? 'text-blue-200 bg-blue-900/40 border border-blue-500/30'
                      : 'text-green-200 bg-green-900/40 border border-green-500/30'
                }`}
              >
                {lastReward}
              </p>
              <button
                type="button"
                onClick={() => {
                  setLastReward('');
                  if (queue.length > 0) {
                    setOpenedTier(queue[0]);
                    setMode('animating');
                  } else {
                    setOpenedTier(null);
                    setMode('idle');
                  }
                }}
                className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all"
              >
                {queue.length > 0 ? `Next crate (${queue.length} left)` : 'Done'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
