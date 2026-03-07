'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { WIZARD_RITUAL_DURATION, WIZARD_RITUAL_BUFF_MULTIPLIER } from '@/types/game';

interface WizardTowerModalProps {
  onClose: () => void;
}

const WIZARD_RITUAL_MINER_COST = 367;

// Sacrifice buff descriptions
const SACRIFICE_BUFF_INFO: Record<number, { name: string; effects: string[]; duration: string }> = {
  1: { name: 'Minor Blood Pact', effects: ['+10% damage', '+5% money'], duration: '30s' },
  5: { name: 'Blood Offering', effects: ['+25% damage', '+15% money', '+10% miner speed'], duration: '1 min' },
  10: { name: 'Dark Tribute', effects: ['+50% damage', '+30% money', '+25% miner speed'], duration: '2 min' },
  25: { name: 'Soul Harvest', effects: ['+100% damage', '+75% money', '+50% all stats'], duration: '3 min' },
  50: { name: 'Mass Sacrifice', effects: ['+200% damage', '+150% money', '+100% all stats'], duration: '5 min' },
  100: { name: 'Apocalyptic Ritual', effects: ['+500% ALL stats', 'Summon shadow miners'], duration: '10 min' },
};

export default function WizardTowerModal({ onClose }: WizardTowerModalProps) {
  const { 
    gameState, 
    startWizardRitual, 
    isWizardRitualActive,
    sacrificeMiners,
    getSacrificeBuffForCount,
  } = useGame();
  
  const [ritualTimeLeft, setRitualTimeLeft] = useState(0);
  const [sacrificeAmount, setSacrificeAmount] = useState(1);

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

  // Update ritual timer
  useEffect(() => {
    if (gameState.buildings.wizard_tower.ritualActive && gameState.buildings.wizard_tower.ritualEndTime) {
      const interval = setInterval(() => {
        const remaining = gameState.buildings.wizard_tower.ritualEndTime! - Date.now();
        setRitualTimeLeft(Math.max(0, remaining));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setRitualTimeLeft(0);
    }
  }, [gameState.buildings.wizard_tower.ritualActive, gameState.buildings.wizard_tower.ritualEndTime]);

  const ritualActive = isWizardRitualActive();
  const shadowMiners = gameState.buildings.wizard_tower.shadowMiners;
  const canPerformRitual = gameState.minerCount >= WIZARD_RITUAL_MINER_COST && !ritualActive;
  const canSacrifice = gameState.minerCount >= sacrificeAmount;

  // Get current sacrifice buff preview
  const sacrificePreview = getSacrificeBuffForCount(sacrificeAmount);

  // Current sacrifice buff active
  const activeSacrificeBuff = gameState.sacrificeBuff;
  const sacrificeTimeLeft = activeSacrificeBuff ? Math.max(0, activeSacrificeBuff.endsAt - Date.now()) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-purple-900/90 to-indigo-900/90 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto border-2 border-purple-500/50 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-500 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Image 
              src="/game/buildings/wizard_tower.png"
              alt="Wizard Tower"
              width={48}
              height={48}
              style={{ imageRendering: 'pixelated' }}
            />
            <div>
              <h2 className="text-2xl font-bold text-white">🗼 Wizard Tower</h2>
              <p className="text-purple-200 text-sm">Channel the darkness</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-3xl leading-none p-2"
          >
            ×
          </button>
        </div>

        {/* Miner count display */}
        <div className="bg-black/30 px-6 py-3 flex justify-center">
          <div className="bg-black/50 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-xl">⛏️</span>
            <span className="text-purple-400 font-bold text-lg">{gameState.minerCount} Miners</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dark Ritual */}
          <div className={`rounded-xl p-4 border-2 transition-all ${
            ritualActive 
              ? 'bg-purple-600/30 border-purple-400 animate-pulse' 
              : 'bg-black/30 border-purple-600/30'
          }`}>
            <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
              <span>🔮</span> Dark Ritual
              <span className="text-xs text-gray-500 ml-auto">Requires {WIZARD_RITUAL_MINER_COST} miners</span>
            </h3>
            
            {ritualActive ? (
              <div className="space-y-3">
                <div className="text-2xl font-bold text-purple-300">
                  RITUAL ACTIVE
                </div>
                <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                    style={{ width: `${(ritualTimeLeft / WIZARD_RITUAL_DURATION) * 100}%` }}
                  />
                </div>
                <p className="text-gray-300 text-sm">
                  {(ritualTimeLeft / 1000).toFixed(1)}s remaining • {WIZARD_RITUAL_BUFF_MULTIPLIER}x ALL stats!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">
                  Channel dark energy for {WIZARD_RITUAL_BUFF_MULTIPLIER}x ALL stats for {WIZARD_RITUAL_DURATION / 1000}s!
                </p>
                <button
                  onClick={() => startWizardRitual()}
                  disabled={!canPerformRitual}
                  className={`w-full py-3 rounded-lg font-bold transition-all ${
                    canPerformRitual
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  🔮 Begin Dark Ritual {!canPerformRitual && `(Need ${WIZARD_RITUAL_MINER_COST - gameState.minerCount} more miners)`}
                </button>
              </div>
            )}
          </div>

          {/* Miner Sacrifice */}
          <div className="rounded-xl p-4 border-2 border-red-600/30 bg-red-900/20">
            <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
              <span>🩸</span> Blood Sacrifice
            </h3>

            {/* Active sacrifice buff */}
            {activeSacrificeBuff && sacrificeTimeLeft > 0 && (
              <div className="bg-red-600/20 rounded-lg p-3 mb-4 border border-red-500/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-red-300 font-bold">Active Buff</span>
                  <span className="text-red-400 text-sm">{(sacrificeTimeLeft / 1000).toFixed(0)}s left</span>
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <p>• +{(activeSacrificeBuff.pcxDamageBonus * 100).toFixed(0)}% Damage</p>
                  <p>• +{(activeSacrificeBuff.moneyBonus * 100).toFixed(0)}% Money</p>
                  {activeSacrificeBuff.minerDamageBonus > 0 && (
                    <p>• +{(activeSacrificeBuff.minerDamageBonus * 100).toFixed(0)}% Miner Damage</p>
                  )}
                  {activeSacrificeBuff.allBonus > 0 && (
                    <p>• +{(activeSacrificeBuff.allBonus * 100).toFixed(0)}% All Stats</p>
                  )}
                </div>
              </div>
            )}

            {/* Sacrifice amount selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Sacrifice:</span>
                <input
                  type="range"
                  min="1"
                  max={Math.min(gameState.minerCount, 100)}
                  value={sacrificeAmount}
                  onChange={(e) => setSacrificeAmount(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <span className="text-red-400 font-bold w-12 text-right">{sacrificeAmount}</span>
              </div>

              {/* Preview buff */}
              {sacrificePreview && (
                <div className="bg-black/30 rounded-lg p-3 text-xs">
                  <div className="text-red-400 font-bold mb-1">
                    {sacrificeAmount >= 100 ? '💀 Apocalyptic Ritual!' : sacrificePreview.buff.allBonus > 0 ? 'Powerful Buff!' : 'Buff Preview:'}
                  </div>
                  <div className="text-gray-300 space-y-0.5">
                    <p>+{(sacrificePreview.buff.pcxDamageBonus * 100).toFixed(0)}% Damage</p>
                    <p>+{(sacrificePreview.buff.moneyBonus * 100).toFixed(0)}% Money</p>
                    {sacrificePreview.buff.minerDamageBonus > 0 && (
                      <p>+{(sacrificePreview.buff.minerDamageBonus * 100).toFixed(0)}% Miner Damage</p>
                    )}
                    {sacrificePreview.buff.allBonus > 0 && (
                      <p>+{(sacrificePreview.buff.allBonus * 100).toFixed(0)}% All Stats</p>
                    )}
                    <p className="text-gray-500">Duration: {(sacrificePreview.duration / 1000).toFixed(0)}s</p>
                    {sacrificeAmount >= 100 && (
                      <p className="text-purple-400 font-bold mt-1">
                        👻 +{Math.max(10, Math.floor(sacrificeAmount / 10))} Shadow Miners!
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => sacrificeMiners(sacrificeAmount)}
                disabled={!canSacrifice}
                className={`w-full py-3 rounded-lg font-bold transition-all ${
                  canSacrifice
                    ? 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                🩸 Sacrifice {sacrificeAmount} Miner{sacrificeAmount > 1 ? 's' : ''}
              </button>
            </div>
          </div>

          {/* Shadow Miners */}
          <div className="bg-black/30 rounded-xl p-4 border border-purple-600/30">
            <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
              <span>👻</span> Shadow Miners
            </h3>
            <div className="text-3xl font-bold text-white mb-1">{shadowMiners}</div>
            <p className="text-gray-400 text-sm">
              Shadow miners deal {formatNumber(shadowMiners * 1000)} bonus damage/sec.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
