'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';

// Format money with K, M, B, T, Q, Qi suffixes
function formatMoney(amount: number): string {
  if (!isFinite(amount)) return '∞';
  if (amount >= 1e42) return `${(amount / 1e42).toFixed(2)}Tr`;
  if (amount >= 1e39) return `${(amount / 1e39).toFixed(2)}Dr`;
  if (amount >= 1e36) return `${(amount / 1e36).toFixed(2)}Un`;
  if (amount >= 1e33) return `${(amount / 1e33).toFixed(2)}Dc`;
  if (amount >= 1e30) return `${(amount / 1e30).toFixed(2)}No`;
  if (amount >= 1e27) return `${(amount / 1e27).toFixed(2)}Oc`;
  if (amount >= 1e24) return `${(amount / 1e24).toFixed(2)}Sp`;
  if (amount >= 1e21) return `${(amount / 1e21).toFixed(2)}Sx`;
  if (amount >= 1e18) return `${(amount / 1e18).toFixed(2)}Qi`;
  if (amount >= 1e15) return `${(amount / 1e15).toFixed(2)}Q`;
  if (amount >= 1e12) return `${(amount / 1e12).toFixed(2)}T`;
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toFixed(0);
}

export default function TaxPopup() {
  const [show, setShow] = useState(false);
  const [taxData, setTaxData] = useState<{
    originalAmount: number;
    taxRate: number;
    taxAmount: number;
    remainingAmount: number;
  } | null>(null);
  
  const { gameState } = useGame();

  // Listen for tax events (single source of truth - no localStorage)
  useEffect(() => {
    const handleTaxEvent = (e: CustomEvent) => {
      // Only show if not already showing to prevent duplicates
      if (!show) {
        setTaxData(e.detail);
        setShow(true);
      }
    };
    
    window.addEventListener('yates-tax-collected' as string, handleTaxEvent as EventListener);
    return () => {
      window.removeEventListener('yates-tax-collected' as string, handleTaxEvent as EventListener);
    };
  }, [show]);

  const handleDismiss = () => {
    setShow(false);
    setTaxData(null);
  };

  if (!show || !taxData) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" />

      {/* Popup */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 rounded-2xl shadow-2xl border-2 border-red-600 max-w-md w-full overflow-hidden animate-bounce-in">
          {/* Header - Evil IRS vibes */}
          <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              {/* Decorative evil symbols */}
              <span className="absolute top-2 left-4 text-4xl animate-pulse">💀</span>
              <span className="absolute top-4 right-6 text-3xl animate-pulse delay-100">🏛️</span>
              <span className="absolute bottom-2 left-1/4 text-2xl animate-pulse delay-200">📜</span>
              <span className="absolute bottom-3 right-1/4 text-3xl animate-pulse delay-300">⚖️</span>
            </div>
            <h2 className="text-3xl font-bold text-white relative z-10">
              🏦 YATES IRS
            </h2>
            <p className="text-red-100 text-lg relative z-10 mt-1">
              Wealth Tax Division
            </p>
          </div>

          {/* Tax details */}
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-2xl text-yellow-400 font-bold animate-pulse">
                &quot;Hehehe u have too much money.
              </p>
              <p className="text-2xl text-yellow-400 font-bold animate-pulse">
                Gimmme some!&quot;
              </p>
            </div>

            {/* Amount breakdown */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 border border-red-700">
              {/* Original amount */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Your Balance</span>
                <span className="text-xl font-bold text-green-400">
                  ${formatMoney(taxData.originalAmount)}
                </span>
              </div>

              {/* Tax rate */}
              <div className="flex justify-between items-center text-red-400">
                <span className="flex items-center gap-1">
                  <span>Wealth Tax</span>
                  <span className="text-xs text-gray-500">({Math.round(taxData.taxRate * 100)}%)</span>
                </span>
                <span className="font-bold">-${formatMoney(taxData.taxAmount)}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-red-600 my-2" />

              {/* Remaining */}
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold text-lg">Remaining</span>
                <span className="text-2xl font-bold text-yellow-400">
                  ${formatMoney(taxData.remainingAmount)}
                </span>
              </div>
            </div>

            {/* Warning note */}
            <div className="text-center">
              <span className="inline-block px-3 py-1 rounded-full text-sm bg-red-900/50 text-red-300 border border-red-700">
                ⚠️ You have 1 Quintillion+! Daily tax applies!
              </span>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="w-full mt-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              😭 Fine...
            </button>
          </div>

          {/* Footer note */}
          <div className="px-6 pb-4 text-center">
            <p className="text-xs text-gray-500">
              Being rich has its costs. Tax collected daily at 1Qi+ balance.
            </p>
          </div>
        </div>
      </div>

      {/* Custom animation */}
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-50px);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </>
  );
}
