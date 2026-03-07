'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { BANK_BASE_INTEREST_RATE, TRINKETS } from '@/types/game';

interface BankModalProps {
  onClose: () => void;
}

export default function BankModal({ onClose }: BankModalProps) {
  const { 
    gameState, 
    depositToBank, 
    withdrawFromBank, 
    getBankBalance,
  } = useGame();
  
  const [depositPercent, setDepositPercent] = useState(50);

  // Calculate bank interest multiplier from equipped trinkets
  const getBankInterestMultiplier = (): number => {
    let multiplier = 1;
    for (const trinketId of gameState.equippedTrinketIds) {
      const baseId = trinketId.replace('_relic', '').replace('_talisman', '');
      const trinket = TRINKETS.find(t => t.id === baseId);
      if (trinket?.effects.bankInterestBonus) {
        multiplier *= trinket.effects.bankInterestBonus;
      }
    }
    return multiplier;
  };

  const interestMultiplier = getBankInterestMultiplier();
  const effectiveInterestRate = BANK_BASE_INTEREST_RATE * interestMultiplier;

  const formatNumber = (num: number): string => {
    if (!isFinite(num)) return '∞';
    if (num >= 1e42) return `${(num / 1e42).toFixed(1)}Tr`;
    if (num >= 1e39) return `${(num / 1e39).toFixed(1)}Dr`;
    if (num >= 1e36) return `${(num / 1e36).toFixed(1)}Un`;
    if (num >= 1e33) return `${(num / 1e33).toFixed(1)}Dc`;
    if (num >= 1e30) return `${(num / 1e30).toFixed(1)}No`;
    if (num >= 1e27) return `${(num / 1e27).toFixed(1)}Oc`;
    if (num >= 1e24) return `${(num / 1e24).toFixed(1)}Sp`;
    if (num >= 1e21) return `${(num / 1e21).toFixed(1)}Sx`;
    if (num >= 1e18) return `${(num / 1e18).toFixed(1)}Qi`;
    if (num >= 1e15) return `${(num / 1e15).toFixed(1)}Q`;
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return Math.floor(num).toString();
  };

  const bankState = gameState.buildings.bank;
  const bankBalance = getBankBalance();
  const depositAmount = bankBalance.principal;
  const interest = bankBalance.interest;
  const currentBalance = depositAmount + interest;
  const depositValue = Math.floor(gameState.yatesDollars * (depositPercent / 100));

  // Calculate time since deposit
  const getTimeSinceDeposit = () => {
    if (!bankState.depositTimestamp) return 'N/A';
    const elapsed = Date.now() - bankState.depositTimestamp;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-emerald-900/90 to-teal-900/90 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden border-2 border-emerald-500/50 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image 
              src="/game/buildings/bank.png"
              alt="Bank"
              width={48}
              height={48}
              style={{ imageRendering: 'pixelated' }}
            />
            <div>
              <h2 className="text-2xl font-bold text-white">🏦 Yates Bank</h2>
              <p className="text-emerald-100 text-sm">
                {(effectiveInterestRate * 100).toFixed(1)}% interest per minute
                {interestMultiplier > 1 && <span className="text-yellow-300 ml-1">✨ ({interestMultiplier}x boosted!)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-3xl leading-none p-2"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Balance */}
          <div className="bg-black/30 rounded-xl p-4 border border-emerald-600/30">
            <h3 className="text-emerald-400 font-bold mb-3">💰 Account Balance</h3>
            <div className="text-3xl font-bold text-white mb-2">${formatNumber(currentBalance)}</div>
            {depositAmount > 0 && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Principal:</span>
                  <span>${formatNumber(depositAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Interest earned:</span>
                  <span>+${formatNumber(interest)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Time deposited:</span>
                  <span>{getTimeSinceDeposit()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Your Cash */}
          <div className="bg-black/30 rounded-xl p-4 border border-yellow-600/30">
            <div className="flex justify-between items-center">
              <span className="text-yellow-400 font-bold">💵 Your Cash</span>
              <span className="text-white font-bold text-xl">${formatNumber(gameState.yatesDollars)}</span>
            </div>
          </div>

          {/* Deposit Section */}
          {depositAmount === 0 ? (
            <div className="space-y-4">
              <h3 className="text-white font-bold">Make a Deposit</h3>
              
              {/* Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{depositPercent}% of your cash</span>
                  <span className="text-emerald-400">${formatNumber(depositValue)}</span>
                </div>
              </div>

              <button
                onClick={() => depositToBank(depositValue)}
                disabled={depositValue <= 0}
                className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all disabled:opacity-50"
              >
                Deposit ${formatNumber(depositValue)}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => withdrawFromBank()}
                className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white transition-all"
              >
                Withdraw ${formatNumber(currentBalance)}
              </button>
              <p className="text-gray-400 text-xs text-center">
                Leave your money longer for more interest!
              </p>
            </div>
          )}

          {/* Info */}
          <div className="bg-black/20 rounded-lg p-3 text-gray-400 text-xs">
            <p>💡 The bank earns {(effectiveInterestRate * 100).toFixed(1)}% interest per minute (compounds over time). You can only have one deposit at a time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
