'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeShop } from '@/contexts/EmployeeShopContext';

const BOOST_DURATION_MS = 30 * 1000; // 30 seconds
const CRASH_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const BOOST_MULTIPLIER = 5; // 5x during boost
const CRASH_MULTIPLIER = 0.5; // 0.5x during crash

export default function CaffeineFloater() {
  const { employee } = useAuth();
  const { caffeineUsesRemaining, consumeCaffeineUse } = useEmployeeShop();
  const [boostUntil, setBoostUntil] = useState<number | null>(null);
  const [crashUntil, setCrashUntil] = useState<number | null>(null);
  const [showSlam, setShowSlam] = useState(false);
  const [showCrashText, setShowCrashText] = useState(false);
  const [, rerender] = useState(0);

  const uses = employee ? caffeineUsesRemaining(employee.id) : 0;

  useEffect(() => {
    try {
      const b = localStorage.getItem('yates-caffeine-boost-until');
      const c = localStorage.getItem('yates-caffeine-crash-until');
      if (b) {
        const n = parseInt(b, 10);
        if (!isNaN(n) && n > Date.now()) setBoostUntil(n);
      }
      if (c) {
        const n = parseInt(c, 10);
        if (!isNaN(n) && n > Date.now()) setCrashUntil(n);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!boostUntil && !crashUntil) return;
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      if (boostUntil && now >= boostUntil) {
        setBoostUntil(null);
        localStorage.removeItem('yates-caffeine-boost-until');
        // Boost just ended → show "CRASH" text briefly
        setShowCrashText(true);
        setTimeout(() => setShowCrashText(false), 4000);
        changed = true;
      }
      if (crashUntil && now >= crashUntil) {
        setCrashUntil(null);
        localStorage.removeItem('yates-caffeine-crash-until');
        changed = true;
      }
      if (!changed) rerender((x) => x + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [boostUntil, crashUntil]);

  if (!employee) return null;

  const now = Date.now();
  const isBoostActive = boostUntil !== null && now < boostUntil;
  const isCrashActive = crashUntil !== null && now < crashUntil;
  const isAnythingActive = isBoostActive || isCrashActive;

  const handleDrink = async () => {
    if (!employee || uses <= 0 || isAnythingActive) return;
    const res = await consumeCaffeineUse(employee.id);
    if (!res.success) return;
    const boostEnd = Date.now() + BOOST_DURATION_MS;
    const crashEnd = boostEnd + CRASH_DURATION_MS;
    setBoostUntil(boostEnd);
    setCrashUntil(crashEnd);
    localStorage.setItem('yates-caffeine-boost-until', String(boostEnd));
    localStorage.setItem('yates-caffeine-crash-until', String(crashEnd));
    window.dispatchEvent(
      new CustomEvent('yates-caffeine-boost', {
        detail: {
          boostUntil: boostEnd,
          crashUntil: crashEnd,
          boostMultiplier: BOOST_MULTIPLIER,
          crashMultiplier: CRASH_MULTIPLIER,
        },
      }),
    );
    setShowSlam(true);
    setTimeout(() => setShowSlam(false), 3500);
  };

  const secondsLeftBoost = boostUntil ? Math.max(0, Math.ceil((boostUntil - now) / 1000)) : 0;
  const secondsLeftCrash = crashUntil ? Math.max(0, Math.ceil((crashUntil - now) / 1000)) : 0;

  return (
    <>
      {/* Floating Caffeine cup (bottom-left, stacked above motivation pack with offset) */}
      {uses > 0 && !isAnythingActive && (
        <button
          onClick={handleDrink}
          className="fixed bottom-5 left-28 z-[120] hover:scale-110 active:scale-95 transition-transform drop-shadow-lg"
          title={`Caffeine Overdose (${uses} left) — click to drink`}
        >
          <div className="relative w-[80px] h-[80px] animate-shake-slow">
            <Image
              src="/shop/CaffeineOverdose.png"
              alt="Caffeine Overdose"
              fill
              className="object-contain"
              sizes="80px"
            />
          </div>
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
            {uses}
          </span>
        </button>
      )}

      {/* "5x BOOST" slam text */}
      {showSlam && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-caffeine-slam">
          <div className="bg-gradient-to-r from-amber-900 via-yellow-600 to-amber-900 text-white font-black text-2xl sm:text-3xl px-8 py-4 rounded-2xl shadow-2xl border-4 border-white text-center">
            ☠️ 5x CAFFEINE OVERDOSE ☠️
            <div className="text-xs font-semibold opacity-90 mt-1">
              30 seconds of pure chaos — crash incoming
            </div>
          </div>
        </div>
      )}

      {/* "CRASH" text when boost ends */}
      {showCrashText && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-caffeine-slam">
          <div className="bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 text-white font-black text-xl sm:text-2xl px-6 py-3 rounded-2xl shadow-2xl border-4 border-white text-center">
            💀 CRASH — 0.5x for 2 minutes
            <div className="text-xs font-semibold opacity-80 mt-1">should've thought about this</div>
          </div>
        </div>
      )}

      {/* Persistent boost badge */}
      {isBoostActive && !showSlam && (
        <div className="fixed bottom-5 right-5 z-[120] bg-gradient-to-r from-amber-700 to-yellow-500 text-white px-3 py-2 rounded-full text-sm font-black shadow-lg border-2 border-white">
          ☠️ 5x · {secondsLeftBoost}s
        </div>
      )}
      {!isBoostActive && isCrashActive && !showCrashText && (
        <div className="fixed bottom-5 right-5 z-[120] bg-gradient-to-r from-slate-700 to-slate-900 text-white px-3 py-2 rounded-full text-sm font-black shadow-lg border-2 border-white">
          💀 0.5x · {secondsLeftCrash}s
        </div>
      )}

      <style jsx>{`
        @keyframes shake-slow {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-4deg); }
          75% { transform: rotate(4deg); }
        }
        .animate-shake-slow { animation: shake-slow 0.8s ease-in-out infinite; }

        @keyframes caffeine-slam {
          0% { opacity: 0; transform: translate(-50%, -30px) scale(0.6); }
          12% { opacity: 1; transform: translate(-50%, 0) scale(1.1); }
          20% { transform: translate(-50%, 0) scale(1); }
          85% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -20px) scale(0.9); }
        }
        :global(.animate-caffeine-slam) { animation: caffeine-slam 3.5s ease-in-out forwards; }
      `}</style>
    </>
  );
}
