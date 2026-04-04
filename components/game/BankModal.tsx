'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { useBudget } from '@/contexts/BudgetContext';
import { BANK_BASE_INTEREST_RATE, BANK_TIERS, BANK_MAX_TIER, getBankDepositCap, TRINKETS, YATES_TOTEM_RELIC_EFFECTS, YATES_TOTEM_TALISMAN_EFFECTS, LOAN_MAX_AMOUNT, LOAN_DAILY_INTEREST_RATE, LOAN_OPEN_TAB_BONUS_RATE } from '@/types/game';

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
    takeLoan,
    repayLoan,
    getLoanStatus,
  } = useGame();
  
  const { subtractFromActiveBudget, addToActiveBudget } = useBudget();

  const [depositPercent, setDepositPercent] = useState(50);
  const [activeTab, setActiveTab] = useState<'bank' | 'loans'>('bank');
  const [loanPercent, setLoanPercent] = useState(50);
  const [repayPercent, setRepayPercent] = useState(100);

  const handleTakeLoan = async (amount: number) => {
    const success = takeLoan(amount);
    if (success) {
      await subtractFromActiveBudget(amount, `Game loan: $${amount.toExponential(2)} borrowed`, 'manual_subtract');
    }
  };

  const handleRepayLoan = async (amount: number) => {
    const success = repayLoan(amount);
    if (success) {
      await addToActiveBudget(amount, `Game loan repayment: $${amount.toExponential(2)}`, 'manual_add');
    }
  };

  const getBankInterestMultiplier = (): number => {
    let multiplier = 1;
    for (const trinketId of gameState.equippedTrinketIds) {
      const isRelic = trinketId.endsWith('_relic');
      const isTalisman = trinketId.endsWith('_talisman');
      const baseId = trinketId.replace('_relic', '').replace('_talisman', '');

      if (baseId === 'yates_totem' && (isRelic || isTalisman)) {
        const override = isRelic ? YATES_TOTEM_RELIC_EFFECTS : YATES_TOTEM_TALISMAN_EFFECTS;
        if (override.bankInterestBonus) multiplier *= override.bankInterestBonus;
        continue;
      }

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

        {/* Tab Selector */}
        <div className="flex border-b border-emerald-700/50">
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
              activeTab === 'bank'
                ? 'text-emerald-300 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            💰 Deposits
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
              activeTab === 'loans'
                ? 'text-red-300 border-b-2 border-red-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🏷️ Loans {gameState.loanAmount > 0 && <span className="text-red-400 ml-1">(${formatNumber(gameState.loanAmount)})</span>}
          </button>
        </div>

        {activeTab === 'bank' ? (
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
              {(() => {
                const withdrawCap = Math.max(gameState.yatesDollars, (gameState.totalMoneyEarned || 0) / 2);
                const withdrawAmount = Math.min(currentBalance, withdrawCap);
                const isCapped = withdrawAmount < currentBalance;
                return (
                  <>
                    <button
                      onClick={() => withdrawFromBank()}
                      className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white transition-all"
                    >
                      Withdraw ${formatNumber(withdrawAmount)}
                    </button>
                    {isCapped && (
                      <p className="text-orange-400 text-xs text-center">
                        Capped — max withdrawal is your balance (${formatNumber(gameState.yatesDollars)}) or half your leaderboard score (${formatNumber((gameState.totalMoneyEarned || 0) / 2)}), whichever is higher.
                      </p>
                    )}
                    <p className="text-gray-400 text-xs text-center">
                      Leave your money longer for more interest!
                    </p>
                  </>
                );
              })()}
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
        ) : (
        <div className="p-6 space-y-5">
          {/* Loan Overview */}
          {(() => {
            const loanStatus = getLoanStatus();
            const hasLoan = loanStatus.debt > 0;
            const loanSliderValue = Math.floor(LOAN_MAX_AMOUNT * (loanPercent / 100));
            const repayMax = Math.min(gameState.yatesDollars, loanStatus.debt);
            const repayValue = hasLoan ? Math.floor(repayMax * (repayPercent / 100)) : 0;
            const timeSinceLoan = gameState.loanTakenAt ? Date.now() - gameState.loanTakenAt : 0;
            const loanHours = Math.floor(timeSinceLoan / (1000 * 60 * 60));
            const loanMinutes = Math.floor((timeSinceLoan % (1000 * 60 * 60)) / (1000 * 60));
            const loanTimeStr = loanHours > 0 ? `${loanHours}h ${loanMinutes}m` : `${loanMinutes}m`;

            return (
              <>
                {/* Your Cash */}
                <div className="bg-black/30 rounded-xl p-4 border border-yellow-600/30">
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-400 font-bold">💵 Your Cash</span>
                    <span className="text-white font-bold text-xl">${formatNumber(gameState.yatesDollars)}</span>
                  </div>
                </div>

                {hasLoan ? (
                  <>
                    {/* Current Debt */}
                    <div className="bg-black/30 rounded-xl p-4 border border-red-600/30">
                      <h3 className="text-red-400 font-bold mb-3">💀 Outstanding Debt</h3>
                      <div className="text-3xl font-bold text-red-300 mb-2">${formatNumber(loanStatus.debt)}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-400">
                          <span>Base rate (25%/day):</span>
                          <span className="text-red-400">+${formatNumber(loanStatus.dailyInterest)}/day</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Playing bonus:</span>
                          <span className="text-green-400">-12%/hr while tab is open</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Loan taken:</span>
                          <span>{loanTimeStr} ago</span>
                        </div>
                      </div>
                      {loanStatus.isAutoRepaying && (
                        <div className="mt-3 bg-red-900/30 rounded-lg p-2 border border-red-600/40">
                          <p className="text-red-300 text-xs font-bold">⚠️ AUTO-REPAY ACTIVE</p>
                          <p className="text-red-400/80 text-xs">Debt exceeds 2× your cash — 10% of money is auto-routed to repayment each tick.</p>
                        </div>
                      )}
                    </div>

                    {/* Repay Loan */}
                    <div className="space-y-3">
                      <h3 className="text-white font-bold">Repay Loan</h3>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={repayPercent}
                          onChange={(e) => setRepayPercent(Number(e.target.value))}
                          className="w-full accent-red-500"
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{repayPercent}% — ${formatNumber(repayValue)}</span>
                          <span className="text-gray-500 text-xs">max ${formatNumber(repayMax)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRepayLoan(repayValue)}
                        disabled={repayValue <= 0}
                        className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all disabled:opacity-50"
                      >
                        Repay ${formatNumber(repayValue)}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Take a Loan */}
                    <div className="bg-black/30 rounded-xl p-4 border border-amber-600/30">
                      <h3 className="text-amber-400 font-bold mb-2">📋 Loan Terms</h3>
                      <div className="space-y-1 text-sm text-gray-400">
                        <div className="flex justify-between">
                          <span>Max loan:</span>
                          <span className="text-white">${formatNumber(LOAN_MAX_AMOUNT)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Base interest:</span>
                          <span className="text-red-400">{(LOAN_DAILY_INTEREST_RATE * 100).toFixed(0)}% of debt per day</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Playing bonus:</span>
                          <span className="text-green-400">-{(LOAN_OPEN_TAB_BONUS_RATE * 100).toFixed(0)}%/hr while tab open</span>
                        </div>
                        <div className="flex justify-between">
                          <span>One loan at a time</span>
                          <span className="text-gray-500">✓</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-white font-bold">Take a Loan</h3>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={loanPercent}
                          onChange={(e) => setLoanPercent(Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{loanPercent}%</span>
                          <span className="text-amber-400">${formatNumber(loanSliderValue)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTakeLoan(loanSliderValue)}
                        disabled={loanSliderValue <= 0 || !gameState.buildings.bank.owned}
                        className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white transition-all disabled:opacity-50"
                      >
                        {gameState.buildings.bank.owned ? `Borrow $${formatNumber(loanSliderValue)}` : 'Need Bank building'}
                      </button>
                    </div>
                  </>
                )}

                {/* Loan Info */}
                <div className="bg-black/20 rounded-lg p-3 text-gray-400 text-xs">
                  <p>⚠️ Your debt grows 25% per real day. Keeping the game tab open reduces interest by 5% per hour (so after 5 hours playing, interest drops to 0%). If debt hits 2× your cash, earnings auto-route to repayment.</p>
                </div>
              </>
            );
          })()}
        </div>
        )}
      </div>
    </div>
  );
}
