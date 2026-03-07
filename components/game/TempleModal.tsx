'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { TempleUpgradeRank } from '@/types/game';

interface TempleModalProps {
  onClose: () => void;
}

// Temple ranks - you can only EQUIP one at a time
// Each rank has pros and cons
const TEMPLE_RANKS: Record<TempleUpgradeRank, {
  name: string;
  unlockCost: number;
  pros: string[];
  cons: string[];
  bonuses: {
    money: number;
    pcxDamage: number;
    prestigePower: number;
    trinketPower: number;
  };
}> = {
  1: {
    name: 'Initiate',
    unlockCost: 50_000_000_000_000, // 50T
    pros: ['+27% Money', '+36% Pickaxe DMG', '+15% Prestige Power', '+24% Trinket Power'],
    cons: ['5% of money taxed every 5 min', '5% rotten cookie chance'],
    bonuses: { money: 0.27, pcxDamage: 0.36, prestigePower: 0.15, trinketPower: 0.24 },
  },
  2: {
    name: 'Devoted',
    unlockCost: 250_000_000_000_000, // 250T
    pros: ['+55% Money', '+73% Pickaxe DMG', '+30% Prestige Power', '+49% Trinket Power'],
    cons: ['12% of money taxed every 12 min', '12% rotten cookie chance', "CAN'T BUY MINERS"],
    bonuses: { money: 0.55, pcxDamage: 0.73, prestigePower: 0.30, trinketPower: 0.49 },
  },
  3: {
    name: 'Ascended',
    unlockCost: 1_000_000_000_000_000, // 1Q
    pros: ['+90% Money', '+120% Pickaxe DMG', '+50% Prestige Power', '+81% Trinket Power'],
    cons: ['25% of money taxed every 25 min', '50% rotten cookie chance', "CAN'T BUY MINERS"],
    bonuses: { money: 0.90, pcxDamage: 1.20, prestigePower: 0.50, trinketPower: 0.81 },
  },
};

export default function TempleModal({ onClose }: TempleModalProps) {
  const { gameState, buyTempleUpgrade, equipTempleRank, prayAtTemple } = useGame();
  const [prayerMessage, setPrayerMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [prayerCooldown, setPrayerCooldown] = useState(0);
  const [isPraying, setIsPraying] = useState(false);

  // Update cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const lastPrayer = gameState.buildings.temple.lastPrayerTime;
      if (lastPrayer) {
        const remaining = Math.max(0, 3000 - (Date.now() - lastPrayer));
        setPrayerCooldown(Math.ceil(remaining / 1000));
      } else {
        setPrayerCooldown(0);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState.buildings.temple.lastPrayerTime]);

  const handlePray = () => {
    setIsPraying(true);
    
    // Small delay for dramatic effect
    setTimeout(() => {
      const result = prayAtTemple();
      setPrayerMessage({ text: result.message, success: result.success });
      setIsPraying(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setPrayerMessage(null), 3000);
    }, 500);
  };

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
    return num.toString();
  };

  // Get unlocked and equipped ranks
  const unlockedRanks = gameState.buildings.temple.upgrades.map(u => u.rank);
  const equippedRank = gameState.buildings.temple.equippedRank || null;

  const ranks: TempleUpgradeRank[] = [1, 2, 3];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-amber-900/90 to-yellow-900/90 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border-2 border-yellow-500/50 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-amber-500 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image 
              src="/game/buildings/temple.png"
              alt="Temple"
              width={48}
              height={48}
              style={{ imageRendering: 'pixelated' }}
            />
            <div>
              <h2 className="text-2xl font-bold text-white">⛪ Temple of Light</h2>
              <p className="text-yellow-100 text-sm">Choose your blessing wisely</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-3xl leading-none p-2"
          >
            ×
          </button>
        </div>

        {/* Money Display */}
        <div className="bg-black/30 px-6 py-3 flex justify-center">
          <div className="bg-black/50 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-yellow-400 font-bold text-lg">${formatNumber(gameState.yatesDollars)}</span>
          </div>
        </div>

        {/* Prayer Section */}
        <div className="bg-gradient-to-r from-amber-800/50 to-yellow-800/50 px-6 py-4 border-y border-yellow-500/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-yellow-300 font-bold flex items-center gap-2">
                🙏 Pray to the Gods of Yates
              </h3>
              <p className="text-yellow-100/60 text-xs mt-1">
                20% chance to spawn a Golden Cookie • Prayers: {gameState.buildings.temple.prayerCount || 0}
              </p>
              <p className="text-amber-400/80 text-[10px] mt-0.5 italic">
                ✨ Extra cookies! You still get automatic spawns too.
              </p>
            </div>
            <button
              onClick={handlePray}
              disabled={prayerCooldown > 0 || isPraying}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                prayerCooldown > 0 || isPraying
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black hover:scale-105'
              }`}
            >
              {isPraying ? (
                <span className="animate-pulse">🙏 Praying...</span>
              ) : prayerCooldown > 0 ? (
                <span>Wait {prayerCooldown}s</span>
              ) : (
                <span>🙏 PRAY</span>
              )}
            </button>
          </div>
          
          {/* Prayer Result Message */}
          {prayerMessage && (
            <div className={`mt-3 p-3 rounded-lg text-center font-bold text-sm animate-pulse ${
              prayerMessage.success 
                ? 'bg-green-600/50 text-green-200 border border-green-400/50'
                : 'bg-gray-700/50 text-gray-300 border border-gray-500/50'
            }`}>
              {prayerMessage.text}
            </div>
          )}
        </div>

        {/* Ranks */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {ranks.map(rank => {
            const rankData = TEMPLE_RANKS[rank];
            const isUnlocked = unlockedRanks.includes(rank);
            const isEquipped = equippedRank === rank;
            const canAfford = gameState.yatesDollars >= rankData.unlockCost;
            const prevRankUnlocked = rank === 1 || unlockedRanks.includes((rank - 1) as TempleUpgradeRank);

            return (
              <div 
                key={rank}
                className={`rounded-xl p-4 border-2 transition-all ${
                  isEquipped 
                    ? 'bg-yellow-600/30 border-yellow-400 ring-2 ring-yellow-400/50'
                    : isUnlocked
                      ? 'bg-amber-900/40 border-amber-500/50'
                      : 'bg-gray-900/40 border-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {rank === 1 ? '🌟' : rank === 2 ? '✨' : '👑'}
                      </span>
                      <h3 className="text-white font-bold text-lg">
                        Rank {rank}: {rankData.name}
                      </h3>
                      {isEquipped && (
                        <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
                          EQUIPPED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  {!isUnlocked ? (
                    <button
                      onClick={() => buyTempleUpgrade('all', rank)}
                      disabled={!canAfford || !prevRankUnlocked}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        canAfford && prevRankUnlocked
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <div>Unlock</div>
                      <div className="text-xs opacity-80">${formatNumber(rankData.unlockCost)}</div>
                    </button>
                  ) : isEquipped ? (
                    <button
                      onClick={() => equipTempleRank(null)}
                      className="px-4 py-2 rounded-lg font-bold text-sm bg-red-600/50 hover:bg-red-600 text-white transition-all"
                    >
                      Unequip
                    </button>
                  ) : (
                    <button
                      onClick={() => equipTempleRank(rank)}
                      className="px-4 py-2 rounded-lg font-bold text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white transition-all"
                    >
                      Equip
                    </button>
                  )}
                </div>

                {/* Pros & Cons */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Pros */}
                  <div className="bg-green-900/30 rounded-lg p-3 border border-green-600/30">
                    <h4 className="text-green-400 font-bold text-xs mb-2">✓ BONUSES</h4>
                    <ul className="text-green-300 text-xs space-y-1">
                      {rankData.pros.map((pro, i) => (
                        <li key={i}>• {pro}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div className="bg-red-900/30 rounded-lg p-3 border border-red-600/30">
                    <h4 className="text-red-400 font-bold text-xs mb-2">✗ DRAWBACKS</h4>
                    <ul className="text-red-300 text-xs space-y-1">
                      {rankData.cons.map((con, i) => (
                        <li key={i}>• {con}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Locked overlay */}
                {!isUnlocked && !prevRankUnlocked && (
                  <div className="mt-2 text-gray-500 text-xs text-center">
                    🔒 Unlock Rank {rank - 1} first
                  </div>
                )}
              </div>
            );
          })}

          {/* Info Box */}
          <div className="bg-black/30 rounded-xl p-4 border border-yellow-600/30">
            <h4 className="text-yellow-400 font-bold mb-2">☀️ How Temple Ranks Work</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Unlock ranks with money (one-time cost)</li>
              <li>• <span className="text-yellow-400">Equip ONE rank at a time</span> to get its bonuses</li>
              <li>• Higher ranks = better bonuses but worse drawbacks</li>
              <li>• Unequip anytime to remove both bonuses AND drawbacks</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
