'use client';

import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { SIDE_LEVEL_MAX, getMinerCost, MINER_MAX_COUNT } from '@/types/game';

interface SideLevelPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUFF_LABELS: Record<string, string> = {
  moneyBonus: 'Money',
  rockDamageBonus: 'Pickaxe Damage',
  clickSpeedBonus: 'Click Speed',
  couponBonus: 'Coupon Luck',
  minerSpeedBonus: 'Miner Speed',
  minerDamageBonus: 'Miner Damage',
};

function formatNumber(num: number): string {
  if (!isFinite(num)) return '∞';
  if (num >= 1e18) return `${(num / 1e18).toFixed(1)}Qi`;
  if (num >= 1e15) return `${(num / 1e15).toFixed(1)}Q`;
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return Math.floor(num).toString();
}

export default function SideLevelPanel({ isOpen, onClose }: SideLevelPanelProps) {
  const {
    gameState, getSideLevelProgress, canLevelUpSide, levelUpSide,
    sacrificeMiners, getSacrificeBuffForCount, buyMiners, getMinerCost: getMinerCostFn,
    prayAtTemple,
  } = useGame();

  const [sacrificeCount, setSacrificeCount] = useState(10);
  const [minerBuyCount, setMinerBuyCount] = useState(10);
  const [lastBuff, setLastBuff] = useState<{ stat: string; amount: number } | null>(null);
  const [prayMsg, setPrayMsg] = useState<string | null>(null);

  if (!isOpen || !gameState.chosenPath) return null;

  const progress = getSideLevelProgress();
  if (!progress) return null;

  const isDark = gameState.chosenPath === 'darkness';
  const isMaxLevel = progress.level >= SIDE_LEVEL_MAX;
  const canLevel = canLevelUpSide();
  const icon = isDark ? '🌑' : '☀️';
  const sideName = isDark ? 'Darkness' : 'Light';

  const handleLevelUp = () => {
    const result = levelUpSide();
    if (result.success && result.buff) {
      setLastBuff(result.buff);
      setTimeout(() => setLastBuff(null), 4000);
    }
  };

  const handlePray = () => {
    const result = prayAtTemple();
    setPrayMsg(result.message);
    setTimeout(() => setPrayMsg(null), 3000);
  };

  const minerCost = getMinerCostFn();
  const canBuyMiner = gameState.yatesDollars >= minerCost && gameState.minerCount < MINER_MAX_COUNT;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[140]" onClick={onClose} />
      <div className={`fixed right-0 top-0 h-full w-full max-w-sm bg-gray-900 z-[150] shadow-2xl border-l-2 ${
        isDark ? 'border-purple-500/50' : 'border-yellow-500/50'
      } flex flex-col overflow-hidden`}>

        <div className={`px-6 py-5 ${isDark ? 'bg-gradient-to-r from-purple-900/80 to-gray-900' : 'bg-gradient-to-r from-amber-900/80 to-gray-900'} border-b ${isDark ? 'border-purple-500/30' : 'border-yellow-500/30'}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">{icon}</span>
                {sideName} Path
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-purple-300' : 'text-yellow-300'}`}>
                Level {progress.level} / {SIDE_LEVEL_MAX}
              </p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-3xl leading-none p-1">×</button>
          </div>

          <div className="mt-3 bg-black/30 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isDark ? 'bg-purple-500' : 'bg-yellow-500'}`}
              style={{ width: `${(progress.level / SIDE_LEVEL_MAX) * 100}%` }}
            />
          </div>

          <p className="text-gray-500 text-[10px] mt-2 text-center">
            Reach level 100 to freely switch sides
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Level-up buff notification */}
          {lastBuff && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-3 text-center animate-pulse">
              <span className="text-green-300 text-sm font-bold">
                +10% {BUFF_LABELS[lastBuff.stat] || lastBuff.stat} (permanent)
              </span>
            </div>
          )}

          {/* Milestones info */}
          {progress.level < 45 && (
            <div className="bg-black/20 rounded-lg p-3 space-y-1">
              <p className="text-gray-500 text-[10px] font-bold uppercase">Upcoming Milestones</p>
              {progress.level < 25 && <p className="text-gray-400 text-[10px]">Lv.25 — Bank base interest 0.1% → 1%</p>}
              {progress.level < 30 && <p className="text-gray-400 text-[10px]">Lv.30 — Pickaxe prices +200%</p>}
              {progress.level < 45 && <p className="text-gray-400 text-[10px]">Lv.45 — Rock HP +50%</p>}
            </div>
          )}

          {/* Accumulated buffs from side levels */}
          {Object.keys(gameState.sideLevelBuffs || {}).length > 0 && (
            <div className="bg-black/20 rounded-lg p-3 space-y-1">
              <p className="text-gray-500 text-[10px] font-bold uppercase">Permanent Buffs</p>
              {Object.entries(gameState.sideLevelBuffs || {}).map(([stat, amount]) => (
                <p key={stat} className="text-green-400 text-[10px]">
                  +{Math.round(amount * 100)}% {BUFF_LABELS[stat] || stat}
                </p>
              ))}
            </div>
          )}

          {isMaxLevel ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">{isDark ? '👑' : '✨'}</div>
              <h3 className={`text-2xl font-bold ${isDark ? 'text-purple-300' : 'text-yellow-300'}`}>MAX LEVEL</h3>
              <p className="text-gray-400 text-sm mt-2">You have mastered the Path of {sideName}.</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Requirements for Level {progress.level + 1}
              </h3>

              {Object.entries(progress.requirements).map(([name, req]) => {
                const pct = req.required === 0
                  ? (req.met ? 100 : 0)
                  : Math.min(100, (req.current / req.required) * 100);
                const displayCurrent = name === 'Zero Miners' ? `${req.current} miners` : formatNumber(req.current);
                const displayRequired = name === 'Zero Miners' ? '0 miners' : formatNumber(req.required);

                return (
                  <div key={name} className="bg-black/30 rounded-xl p-4 border border-gray-700/40">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white text-sm font-medium">{name}</span>
                      {req.met ? (
                        <span className="text-green-400 text-xs font-bold">✓ Done</span>
                      ) : (
                        <span className="text-gray-400 text-xs">{displayCurrent} / {displayRequired}</span>
                      )}
                    </div>
                    <div className="bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${req.met ? 'bg-green-500' : isDark ? 'bg-purple-500' : 'bg-yellow-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Quick action buttons */}
          <div className="border-t border-gray-700/40 pt-4 space-y-3">
            <p className="text-gray-500 text-[10px] font-bold uppercase">Quick Actions</p>

            {isDark ? (
              <>
                {/* Sacrifice Miners */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={gameState.minerCount}
                    value={sacrificeCount}
                    onChange={(e) => setSacrificeCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-20 bg-black/40 border border-purple-600/40 rounded-lg px-2 py-1.5 text-white text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => sacrificeMiners(sacrificeCount)}
                    disabled={gameState.minerCount < sacrificeCount}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-900/40 border border-red-600/40 text-red-300 hover:bg-red-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    🩸 Sacrifice {sacrificeCount} Miners
                  </button>
                </div>

                {/* Buy Miners */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={MINER_MAX_COUNT - gameState.minerCount}
                    value={minerBuyCount}
                    onChange={(e) => setMinerBuyCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-20 bg-black/40 border border-orange-600/40 rounded-lg px-2 py-1.5 text-white text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => buyMiners(minerBuyCount)}
                    disabled={!canBuyMiner}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-orange-900/30 border border-orange-600/30 text-orange-300 hover:bg-orange-800/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    👷 Hire {minerBuyCount} — ${formatNumber(minerCost)}/ea ({gameState.minerCount}/{MINER_MAX_COUNT})
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Pray button */}
                <button
                  onClick={handlePray}
                  disabled={!gameState.buildings.temple.owned}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-yellow-900/30 border border-yellow-600/30 text-yellow-300 hover:bg-yellow-800/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  🙏 Pray at Temple
                  {gameState.buildings.temple.equippedRank === 3 && (
                    <span className="text-[9px] text-yellow-500 ml-1">(GC every 2 prayers)</span>
                  )}
                </button>
                {prayMsg && (
                  <p className={`text-xs text-center ${prayMsg.includes('blessed') ? 'text-yellow-300' : 'text-gray-500'}`}>
                    {prayMsg}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Level Up Button */}
        {!isMaxLevel && (
          <div className="p-6 border-t border-gray-700/40">
            <p className="text-gray-500 text-[9px] text-center mb-2">Level up grants +10% to a random stat (permanent)</p>
            <button
              onClick={handleLevelUp}
              disabled={!canLevel}
              className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                canLevel
                  ? isDark
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black shadow-lg shadow-yellow-500/20'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canLevel ? `Level Up to ${progress.level + 1}` : 'Complete all requirements'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
