'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { BANK_BASE_INTEREST_RATE, BANK_TIERS, BANK_MAX_TIER, getBankDepositCap, TRINKETS } from '@/types/game';

interface BankModalProps {
  onClose: () => void;
}

export default function BankModal({ onClose }: BankModalProps) {
  const { 
    gameState, 
    depositToBank, 
    withdrawFromBank, 
    getBankBalance,
    unlockBankTier,
  } = useGame();
  
  const [depositPercent, setDepositPercent] = useState(50);

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
  const currentTier = bankState.bankTier ?? 0;
  const depositCap = getBankDepositCap(currentTier);
  const isMaxTier = currentTier > BANK_MAX_TIER;
  const hasNextTier = currentTier < BANK_MAX_TIER;
  const nextTierDef = hasNextTier ? BANK_TIERS[currentTier + 1] : null;

  const bankBalance = getBankBalance();
  const depositAmount = bankBalance.principal;
  const interest = bankBalance.interest;
  const currentBalance = depositAmount + interest;

  const rawDepositValue = Math.floor(gameState.yatesDollars * (depositPercent / 100));
  const depositValue = isMaxTier ? rawDepositValue : Math.min(rawDepositValue, depositCap);
  const isDepositCapped = !isMaxTier && rawDepositValue > depositCap;

  const canAffordNextTier = nextTierDef ? gameState.yatesDollars >= nextTierDef.unlockCost : false;

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
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-gradient-to-br from-emerald-900/90 to-teal-900/90 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border-2 border-emerald-500/50 shadow-2xl">
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

        <div className="p-6 space-y-5">
          {/* Deposit Cap / Tier Status */}
          <div className="bg-black/30 rounded-xl p-4 border border-cyan-600/30">
            <div className="flex justify-between items-center mb-1">
              <span className="text-cyan-400 font-bold text-sm">📊 Deposit Limit</span>
              <span className="text-xs text-gray-500">Tier {currentTier}/{BANK_TIERS.length}</span>
            </div>
            <div className="text-xl font-bold text-white">
              {isMaxTier || depositCap === Infinity ? 'Unlimited' : `$${formatNumber(depositCap)}`}
            </div>
            {isMaxTier && (
              <p className="text-emerald-400 text-xs mt-1">All tiers unlocked — no deposit cap.</p>
            )}
          </div>

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

          {/* Deposit / Withdraw Section */}
          {depositAmount === 0 ? (
            <div className="space-y-4">
              <h3 className="text-white font-bold">Make a Deposit</h3>
              
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
                  <span className={isDepositCapped ? 'text-orange-400' : 'text-emerald-400'}>
                    ${formatNumber(depositValue)}
                    {isDepositCapped && ' (capped)'}
                  </span>
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

          {/* Next Tier Unlock */}
          {hasNextTier && nextTierDef && (
            <div className="bg-black/30 rounded-xl p-4 border border-purple-600/30">
              <h3 className="text-purple-400 font-bold text-sm mb-2">🔓 Upgrade Deposit Limit</h3>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-white text-sm">Unlock </span>
                  <span className="text-cyan-300 font-bold">{nextTierDef.label}</span>
                  <span className="text-gray-400 text-xs block mt-0.5">
                    Cap → ${formatNumber(nextTierDef.maxDeposit === Infinity ? Infinity : nextTierDef.maxDeposit)}
                  </span>
                </div>
                <span className="text-yellow-400 font-bold">${formatNumber(nextTierDef.unlockCost)}</span>
              </div>
              <button
                onClick={() => unlockBankTier()}
                disabled={!canAffordNextTier}
                className="w-full py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {canAffordNextTier ? `Upgrade — $${formatNumber(nextTierDef.unlockCost)}` : `Need $${formatNumber(nextTierDef.unlockCost)}`}
              </button>
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
