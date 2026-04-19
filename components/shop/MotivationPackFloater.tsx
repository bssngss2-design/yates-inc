'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeShop } from '@/contexts/EmployeeShopContext';

const BOOST_DURATION_MS = 60 * 1000; // 1 minute
const BOOST_MULTIPLIER = 2; // +100% = 2x

export default function MotivationPackFloater() {
  const { employee } = useAuth();
  const { motivationUsesRemaining, consumeMotivationUse } = useEmployeeShop();
  const [showPill, setShowPill] = useState(false);
  const [boostUntil, setBoostUntil] = useState<number | null>(null);
  const [showBoostText, setShowBoostText] = useState(false);
  const [, rerender] = useState(0);

  const uses = employee ? motivationUsesRemaining(employee.id) : 0;

  useEffect(() => {
    const stored = localStorage.getItem('yates-motivation-boost-until');
    if (stored) {
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n > Date.now()) setBoostUntil(n);
    }
  }, []);

  useEffect(() => {
    if (!boostUntil) return;
    const interval = setInterval(() => {
      if (Date.now() >= boostUntil) {
        setBoostUntil(null);
        localStorage.removeItem('yates-motivation-boost-until');
      } else {
        rerender((x) => x + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [boostUntil]);

  if (!employee) return null;

  const isBoostActive = boostUntil !== null && Date.now() < boostUntil;

  const handleBoxClick = () => {
    if (uses <= 0) return;
    setShowPill(true);
  };

  const handlePillClick = async () => {
    if (!employee) return;
    const res = await consumeMotivationUse(employee.id);
    if (!res.success) return;
    setShowPill(false);
    const until = Date.now() + BOOST_DURATION_MS;
    setBoostUntil(until);
    localStorage.setItem('yates-motivation-boost-until', String(until));
    window.dispatchEvent(
      new CustomEvent('yates-motivation-boost', {
        detail: { until, multiplier: BOOST_MULTIPLIER },
      }),
    );
    setShowBoostText(true);
    setTimeout(() => setShowBoostText(false), 4000);
  };

  const secondsLeft = boostUntil ? Math.max(0, Math.ceil((boostUntil - Date.now()) / 1000)) : 0;

  return (
    <>
      {/* Floating Motivation Pack (bottom-left of screen, only if employee has uses) */}
      {uses > 0 && !showPill && (
        <button
          onClick={handleBoxClick}
          className="fixed bottom-5 left-5 z-[120] animate-bounce-slow hover:scale-110 transition-transform drop-shadow-lg"
          title={`Motivation Pack (${uses} pill${uses === 1 ? '' : 's'} left)`}
        >
          <div className="relative w-[88px] h-[88px]">
            <Image
              src="/shop/MotivationPack.png"
              alt="Motivation Pack"
              fill
              className="object-contain"
              sizes="88px"
            />
          </div>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
            {uses}
          </span>
        </button>
      )}

      {/* The Pill */}
      {showPill && (
        <button
          onClick={handlePillClick}
          className="fixed bottom-28 left-8 z-[121] animate-drop-in hover:scale-110 transition-transform"
          title="Pop the pill"
        >
          <svg width="64" height="28" viewBox="0 0 80 36" aria-label="Motivation Pill">
            <defs>
              <linearGradient id="pill-l" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fee2e2" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="pill-r" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <rect x="2" y="4" width="38" height="28" rx="14" fill="url(#pill-l)" stroke="#7f1d1d" strokeWidth="2" />
            <rect x="40" y="4" width="38" height="28" rx="14" fill="url(#pill-r)" stroke="#78350f" strokeWidth="2" />
            <ellipse cx="12" cy="12" rx="5" ry="3" fill="white" opacity="0.7" />
          </svg>
          <div className="absolute -top-2 -right-2 text-xs animate-spin-slow">✨</div>
        </button>
      )}

      {/* 4-second boost text */}
      {showBoostText && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-boost-pop">
          <div className="bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-400 text-white font-black text-xl sm:text-2xl px-6 py-3 rounded-2xl shadow-2xl border-4 border-white text-center">
            💥 +100% TO EVERYTHING IN THE GAME!
            <div className="text-xs font-semibold opacity-90 mt-1">for 1 minute — go nuts</div>
          </div>
        </div>
      )}

      {/* Persistent boost timer badge while active */}
      {isBoostActive && !showBoostText && (
        <div className="fixed bottom-5 right-5 z-[120] bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-2 rounded-full text-sm font-black shadow-lg">
          💊 x{BOOST_MULTIPLIER} · {secondsLeft}s
        </div>
      )}

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }

        @keyframes drop-in {
          0% { transform: translateY(-60px) scale(0.5); opacity: 0; }
          70% { transform: translateY(8px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-drop-in { animation: drop-in 0.5s ease-out; }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 2s linear infinite; display: inline-block; }

        @keyframes boost-pop {
          0% { opacity: 0; transform: translate(-50%, -20px) scale(0.8); }
          15% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
          25% { transform: translate(-50%, 0) scale(1); }
          85% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -20px) scale(0.9); }
        }
        .animate-boost-pop { animation: boost-pop 4s ease-in-out forwards; }
      `}</style>
    </>
  );
}
