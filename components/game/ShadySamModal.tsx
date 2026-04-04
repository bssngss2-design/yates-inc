'use client';

import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import {
  ShadySamStat,
  SHADY_SAM_STAT_LABELS,
  SHADY_SAM_STAT_ICONS,
  getShadySamSwapCost,
} from '@/types/game';

interface ShadySamModalProps {
  onClose: () => void;
}

const ALL_STATS: ShadySamStat[] = ['couponLuck', 'minerSpeed', 'clickDamage', 'pcxDamage', 'moneyMultiplier', 'minerDamage'];

const SAM_STAT_TO_BONUS: Record<ShadySamStat, string> = {
  couponLuck: 'couponBonus',
  minerSpeed: 'minerSpeedBonus',
  clickDamage: 'clickSpeedBonus',
  pcxDamage: 'rockDamageBonus',
  moneyMultiplier: 'moneyBonus',
  minerDamage: 'minerDamageBonus',
};

export default function ShadySamModal({ onClose }: ShadySamModalProps) {
  const { gameState, addShadySamSwap, removeShadySamSwap, getTotalBonuses } = useGame();
  const [debuffStat, setDebuffStat] = useState<ShadySamStat>('couponLuck');
  const [buffStat, setBuffStat] = useState<ShadySamStat>('minerSpeed');
  const [swapAmount, setSwapAmount] = useState(1000);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1e18) return `${(num / 1e18).toFixed(1)}Qi`;
    if (num >= 1e15) return `${(num / 1e15).toFixed(1)}Q`;
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return Math.floor(num).toString();
  };

  const bonuses = getTotalBonuses();

  const getStatPercent = useCallback((stat: ShadySamStat): number => {
    const key = SAM_STAT_TO_BONUS[stat] as keyof typeof bonuses;
    return Math.round((bonuses[key] || 0) * 100);
  }, [bonuses]);

  const swapCost = getShadySamSwapCost(swapAmount);
  const canAfford = gameState.yatesDollars >= swapCost;
  const debuffStatPercent = getStatPercent(debuffStat);
  const debuffHasEnough = debuffStatPercent >= swapAmount;
  const isValid = debuffStat !== buffStat && swapAmount > 0 && debuffHasEnough;

  const handleSwap = () => {
    if (!isValid || !canAfford) return;
    const ok = addShadySamSwap(debuffStat, buffStat, swapAmount);
    if (ok) {
      setFeedback({ type: 'success', msg: `Swapped ${swapAmount}% ${SHADY_SAM_STAT_LABELS[debuffStat]} → ${SHADY_SAM_STAT_LABELS[buffStat]}` });
    } else {
      setFeedback({ type: 'error', msg: 'Swap failed!' });
    }
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gradient-to-br from-gray-900/95 to-purple-950/95 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border-2 border-purple-500/40 shadow-2xl">
        <div className="bg-gradient-to-r from-gray-800 to-purple-900 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">
              <span className="mr-2" style={{ fontSize: '1.5rem' }}>🕶️</span>
              Shady Sam
            </h2>
            <p className="text-purple-300 text-sm">Swap stats... for a price</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-3xl leading-none p-2">×</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-black/30 rounded-xl p-3 border border-yellow-600/30 flex justify-between items-center">
            <span className="text-yellow-400 font-bold text-sm">💵 Your Cash</span>
            <span className="text-white font-bold">${formatNumber(gameState.yatesDollars)}</span>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className={`rounded-lg px-4 py-2 text-sm font-bold text-center transition-all ${
              feedback.type === 'success' ? 'bg-green-600/30 border border-green-500 text-green-300' : 'bg-red-600/30 border border-red-500 text-red-300'
            }`}>
              {feedback.type === 'success' ? '✓' : '✕'} {feedback.msg}
            </div>
          )}

          <div className="bg-black/30 rounded-xl p-4 border border-purple-600/30 space-y-4">
            <h3 className="text-purple-400 font-bold text-sm">New Swap — ${formatNumber(swapCost)}</h3>

            <div>
              <span className="text-gray-300 text-xs font-bold mb-1 block">AMOUNT</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={swapAmount}
                  onChange={(e) => {
                    const v = Math.max(1, Math.floor(Number(e.target.value) || 1));
                    setSwapAmount(v);
                  }}
                  className="flex-1 bg-black/40 border border-purple-600/40 rounded-lg px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-purple-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="e.g. 5000"
                />
                <span className="text-purple-300 font-bold text-sm">%</span>
                <div className="flex gap-1 flex-wrap">
                  {[100, 1000, 5000, 10000, 50000].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setSwapAmount(preset)}
                      className={`px-2 py-1.5 rounded text-[10px] font-bold transition-all ${
                        swapAmount === preset
                          ? 'bg-purple-600/40 text-purple-200 border border-purple-500'
                          : 'bg-black/30 text-gray-400 border border-gray-700/30 hover:border-gray-500'
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Debuff picker */}
            <div>
              <span className="text-red-400 text-xs font-bold mb-1 block">SACRIFICE (-{swapAmount}%)</span>
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_STATS.map(stat => {
                  const pct = getStatPercent(stat);
                  const isEmpty = pct <= 0;
                  const selected = debuffStat === stat;
                  return (
                    <button
                      key={`d_${stat}`}
                      onClick={() => !isEmpty && setDebuffStat(stat)}
                      disabled={isEmpty}
                      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-all ${
                        isEmpty
                          ? 'bg-black/10 border border-gray-800/20 text-gray-700 cursor-not-allowed opacity-30'
                          : selected
                            ? 'bg-red-600/30 border border-red-500 text-red-300'
                            : 'bg-black/20 border border-gray-700/30 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span>{SHADY_SAM_STAT_ICONS[stat]}</span>
                      <span className="text-[10px]">{SHADY_SAM_STAT_LABELS[stat]}</span>
                      <span className={`text-[9px] font-bold ${isEmpty ? 'text-gray-700' : pct >= swapAmount ? 'text-gray-400' : 'text-red-400'}`}>
                        {pct > 0 ? `${pct}%` : '0%'}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!debuffHasEnough && debuffStatPercent > 0 && (
                <p className="text-red-400 text-[10px] mt-1">
                  Only {debuffStatPercent}% available — lower the amount or pick another stat
                </p>
              )}
              {debuffStatPercent <= 0 && (
                <p className="text-gray-600 text-[10px] mt-1">
                  Pick a stat that has more than 0%
                </p>
              )}
            </div>

            <div className="text-center text-2xl text-purple-400">↓</div>

            {/* Buff picker */}
            <div>
              <span className="text-green-400 text-xs font-bold mb-1 block">GAIN (+{swapAmount}%)</span>
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_STATS.map(stat => {
                  const pct = getStatPercent(stat);
                  return (
                    <button
                      key={`b_${stat}`}
                      onClick={() => setBuffStat(stat)}
                      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-all ${
                        buffStat === stat
                          ? 'bg-green-600/30 border border-green-500 text-green-300'
                          : stat === debuffStat
                            ? 'bg-black/10 border border-gray-800/30 text-gray-600 cursor-not-allowed opacity-40'
                            : 'bg-black/20 border border-gray-700/30 text-gray-400 hover:border-gray-500'
                      }`}
                      disabled={stat === debuffStat}
                    >
                      <span>{SHADY_SAM_STAT_ICONS[stat]}</span>
                      <span className="text-[10px]">{SHADY_SAM_STAT_LABELS[stat]}</span>
                      <span className="text-[9px] text-gray-500">{pct}%</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            {debuffStat !== buffStat && swapAmount > 0 && (
              <div className="bg-black/20 rounded-lg p-2 text-center text-xs">
                <span className="text-red-400">-{swapAmount}% {SHADY_SAM_STAT_LABELS[debuffStat]}</span>
                <span className="text-gray-500 mx-2">→</span>
                <span className="text-green-400">+{swapAmount}% {SHADY_SAM_STAT_LABELS[buffStat]}</span>
              </div>
            )}

            <button
              onClick={handleSwap}
              disabled={!isValid || !canAfford}
              className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!canAfford
                ? `Need $${formatNumber(swapCost)}`
                : !debuffHasEnough
                  ? `Not enough ${SHADY_SAM_STAT_LABELS[debuffStat]} (${debuffStatPercent}%)`
                  : debuffStat === buffStat
                    ? 'Pick different stats'
                    : `Swap — $${formatNumber(swapCost)}`}
            </button>
          </div>

          {/* Active Swaps */}
          {gameState.shadySamSwaps.length > 0 && (
            <div className="bg-black/30 rounded-xl p-4 border border-gray-600/30 space-y-2">
              <h3 className="text-white font-bold text-sm">Active Swaps ({gameState.shadySamSwaps.length})</h3>
              {gameState.shadySamSwaps.map(swap => (
                <div key={swap.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                  <div className="text-xs">
                    <span className="text-red-400">{SHADY_SAM_STAT_ICONS[swap.debuffStat]} -{(swap.amount * 100).toFixed(0)}%</span>
                    <span className="text-gray-500 mx-1.5">→</span>
                    <span className="text-green-400">{SHADY_SAM_STAT_ICONS[swap.buffStat]} +{(swap.amount * 100).toFixed(0)}%</span>
                  </div>
                  <button
                    onClick={() => removeShadySamSwap(swap.id)}
                    className="text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-black/20 rounded-lg p-3 text-gray-500 text-xs">
            <p>🕶️ Price scales with % swapped. You can only sacrifice stats you actually have. Remove anytime for free.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
