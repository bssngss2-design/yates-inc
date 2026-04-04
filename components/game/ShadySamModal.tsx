'use client';

import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import {
  ShadySamStat,
  SHADY_SAM_STAT_LABELS,
  SHADY_SAM_STAT_ICONS,
  SHADY_SAM_SWAP_COST,
} from '@/types/game';

interface ShadySamModalProps {
  onClose: () => void;
}

const ALL_STATS: ShadySamStat[] = ['couponLuck', 'minerSpeed', 'clickDamage', 'pcxDamage', 'moneyMultiplier', 'minerDamage'];

export default function ShadySamModal({ onClose }: ShadySamModalProps) {
  const { gameState, addShadySamSwap, removeShadySamSwap } = useGame();
  const [debuffStat, setDebuffStat] = useState<ShadySamStat>('couponLuck');
  const [buffStat, setBuffStat] = useState<ShadySamStat>('minerSpeed');
  const [swapAmount, setSwapAmount] = useState(50);

  const formatNumber = (num: number): string => {
    if (num >= 1e18) return `${(num / 1e18).toFixed(1)}Qi`;
    if (num >= 1e15) return `${(num / 1e15).toFixed(1)}Q`;
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return Math.floor(num).toString();
  };

  const canAfford = gameState.yatesDollars >= SHADY_SAM_SWAP_COST;
  const isValid = debuffStat !== buffStat && swapAmount > 0;

  const handleSwap = () => {
    if (!isValid || !canAfford) return;
    addShadySamSwap(debuffStat, buffStat, swapAmount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gradient-to-br from-gray-900/95 to-purple-950/95 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border-2 border-purple-500/40 shadow-2xl">
        {/* Header */}
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
          {/* Cash display */}
          <div className="bg-black/30 rounded-xl p-3 border border-yellow-600/30 flex justify-between items-center">
            <span className="text-yellow-400 font-bold text-sm">💵 Your Cash</span>
            <span className="text-white font-bold">${formatNumber(gameState.yatesDollars)}</span>
          </div>

          {/* New Swap */}
          <div className="bg-black/30 rounded-xl p-4 border border-purple-600/30 space-y-4">
            <h3 className="text-purple-400 font-bold text-sm">New Swap — ${formatNumber(SHADY_SAM_SWAP_COST)} per swap</h3>

            {/* Amount slider */}
            <div>
              <span className="text-gray-300 text-xs font-bold mb-1 block">AMOUNT: {swapAmount}%</span>
              <input
                type="range"
                min="5"
                max="500"
                step="5"
                value={swapAmount}
                onChange={(e) => setSwapAmount(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>5%</span>
                <span>250%</span>
                <span>500%</span>
              </div>
            </div>

            {/* Debuff picker */}
            <div>
              <span className="text-red-400 text-xs font-bold mb-1 block">SACRIFICE (-{swapAmount}%)</span>
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_STATS.map(stat => (
                  <button
                    key={`d_${stat}`}
                    onClick={() => setDebuffStat(stat)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-all ${
                      debuffStat === stat
                        ? 'bg-red-600/30 border border-red-500 text-red-300'
                        : 'bg-black/20 border border-gray-700/30 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span>{SHADY_SAM_STAT_ICONS[stat]}</span>
                    <span className="text-[10px]">{SHADY_SAM_STAT_LABELS[stat]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="text-center text-2xl text-purple-400">↓</div>

            {/* Buff picker */}
            <div>
              <span className="text-green-400 text-xs font-bold mb-1 block">GAIN (+{swapAmount}%)</span>
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_STATS.map(stat => (
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
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {isValid && (
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
              {!canAfford ? `Need $${formatNumber(SHADY_SAM_SWAP_COST)}` : !isValid ? 'Pick different stats' : `Swap — $${formatNumber(SHADY_SAM_SWAP_COST)}`}
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

          {/* Info */}
          <div className="bg-black/20 rounded-lg p-3 text-gray-500 text-xs">
            <p>🕶️ Each swap costs ${formatNumber(SHADY_SAM_SWAP_COST)}. Swaps stack — buy multiple to specialize. Remove anytime for free.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
