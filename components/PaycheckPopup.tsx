'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePaycheck } from '@/contexts/PaycheckContext';

// Tax rate - because even fake money gets taxed lmao
const TAX_RATE = 0.15; // 15% taxes

// Format money with K, M, B, T, Q suffixes
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
  return amount.toFixed(2);
}

export default function PaycheckPopup() {
  const [show, setShow] = useState(false);
  const [paycheckData, setPaycheckData] = useState<{
    amount: number;
    currency: 'yates' | 'walters';
    taxes: number;
    total: number;
  } | null>(null);
  
  const { employee } = useAuth();
  const { currentUserPaycheck } = usePaycheck();

  // Check for pending paycheck notification on mount
  useEffect(() => {
    if (!employee) return;

    const pendingPaycheck = localStorage.getItem(`yates-paycheck-pending-${employee.id}`);
    if (pendingPaycheck) {
      const data = JSON.parse(pendingPaycheck);
      setPaycheckData(data);
      setShow(true);
      // Clear the pending notification
      localStorage.removeItem(`yates-paycheck-pending-${employee.id}`);
    }
  }, [employee]);

  // Expose test function to window for console testing
  useEffect(() => {
    // @ts-expect-error - Adding to window for testing
    window.testPaycheckPopup = (amount = 500, currency: 'yates' | 'walters' = 'yates') => {
      const taxes = amount * TAX_RATE;
      const total = amount - taxes;
      setPaycheckData({ amount, currency, taxes, total });
      setShow(true);
      console.log('🎉 Paycheck popup triggered!');
    };

    return () => {
      // @ts-expect-error - Cleanup
      delete window.testPaycheckPopup;
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setPaycheckData(null);
  };

  if (!show || !paycheckData) return null;

  const currencyLabel = paycheckData.currency === 'yates' ? 'Yates Dollars' : 'Walters Dollars';
  const currencySymbol = paycheckData.currency === 'yates' ? 'Y$' : 'W$';
  const currencyColor = paycheckData.currency === 'yates' 
    ? 'text-yellow-400' 
    : 'text-purple-400';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />

      {/* Popup */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full overflow-hidden animate-bounce-in">
          {/* Header with confetti vibes */}
          <div className="bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              {/* Decorative money symbols */}
              <span className="absolute top-2 left-4 text-4xl animate-pulse">💵</span>
              <span className="absolute top-4 right-6 text-3xl animate-pulse delay-100">💰</span>
              <span className="absolute bottom-2 left-1/4 text-2xl animate-pulse delay-200">🤑</span>
              <span className="absolute bottom-3 right-1/4 text-3xl animate-pulse delay-300">💸</span>
            </div>
            <h2 className="text-2xl font-bold text-white relative z-10">
              Thank you for your hard
            </h2>
            <p className="text-green-100 text-lg relative z-10">
              (maybe not) work!
            </p>
          </div>

          {/* Paycheck details */}
          <div className="p-6 space-y-4">
            <div className="text-center text-gray-400 text-sm uppercase tracking-wider">
              Here&apos;s your paycheck
            </div>

            {/* Amount breakdown */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 border border-gray-700">
              {/* Gross amount */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Gross Pay</span>
                <span className={`text-xl font-bold ${currencyColor}`}>
                  ${formatMoney(paycheckData.amount)} {currencySymbol}
                </span>
              </div>

              {/* Taxes */}
              <div className="flex justify-between items-center text-red-400">
                <span className="flex items-center gap-1">
                  <span>Taxes</span>
                  <span className="text-xs text-gray-500">(15%)</span>
                </span>
                <span>-${formatMoney(paycheckData.taxes)}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-600 my-2" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold text-lg">Total</span>
                <span className={`text-2xl font-bold ${currencyColor}`}>
                  ${formatMoney(paycheckData.total)} {currencySymbol}
                </span>
              </div>
            </div>

            {/* Currency type indicator */}
            <div className="text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                paycheckData.currency === 'yates' 
                  ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' 
                  : 'bg-purple-900/30 text-purple-400 border border-purple-700'
              }`}>
                Paid in {currencyLabel}
              </span>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Kay
            </button>
          </div>

          {/* Footer note */}
          <div className="px-6 pb-4 text-center">
            <p className="text-xs text-gray-500">
              This paycheck has been deposited to your account
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

