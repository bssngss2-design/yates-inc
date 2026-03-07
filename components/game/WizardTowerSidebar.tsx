'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';

interface WizardTowerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Ritual {
  id: string;
  name: string;
  icon: string;
  cost: string;
  costCheck: () => boolean;
  backfireChance: number | ((count: number) => number);
  effect: string;
  backfireEffect: string;
  isOneTime?: boolean;
  isCompleted?: () => boolean;
  requiresInput?: boolean;
  onCast: (count?: number) => void;
}

export default function WizardTowerSidebar({ isOpen, onClose }: WizardTowerSidebarProps) {
  const { 
    gameState, 
    activateGoldenCookieRitual,
    startWizardRitual,
    sacrificeMiners,
    isWizardRitualActive,
  } = useGame();
  
  const [hoveredRitual, setHoveredRitual] = useState<string | null>(null);
  const [sacrificeAmount, setSacrificeAmount] = useState(100);
  const [showSacrificeInput, setShowSacrificeInput] = useState<string | null>(null);
  const [ritualTimeLeft, setRitualTimeLeft] = useState(0);

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

  const shadowMiners = gameState.buildings.wizard_tower.shadowMiners;
  const darkMiners = gameState.buildings.wizard_tower.darkMiners || 0;
  const ritualActive = isWizardRitualActive();

  const rituals: Ritual[] = [
    {
      id: 'dark_cookie',
      name: 'Dark Cookie Ritual',
      icon: '/game/rituals/dark_cookie.png',
      cost: '1T$ + 420 miners',
      costCheck: () => gameState.yatesDollars >= 1e12 && gameState.minerCount >= 420,
      backfireChance: 30,
      effect: 'Permanently unlock Golden Cookies. Dark energy attracts mysterious treats.',
      backfireEffect: 'Ritual fails! 420 miners consumed but no cookies unlocked.',
      isOneTime: true,
      isCompleted: () => gameState.goldenCookieRitualActive,
      onCast: () => activateGoldenCookieRitual(),
    },
    {
      id: 'apocalypse',
      name: 'Apocalypse',
      icon: '/game/rituals/apocalypse.png',
      cost: '100+ miners',
      costCheck: () => gameState.minerCount >= 100,
      backfireChance: 60,
      effect: 'Sacrifice miners to summon Shadow Miners (1000 dmg/s each).',
      backfireEffect: 'Some miners are devoured, never becoming shadow miners.',
      requiresInput: true,
      onCast: (count) => {
        if (count && count >= 100) {
          sacrificeMiners(count);
          setShowSacrificeInput(null);
        }
      },
    },
    {
      id: 'dark_ritual',
      name: 'Dark Ritual',
      icon: '/game/rituals/dark_ritual.png',
      cost: 'Need 367 miners',
      costCheck: () => gameState.minerCount >= 367 && !ritualActive,
      backfireChance: 41,
      effect: '3x ALL stats for 60 seconds!',
      backfireEffect: '+200 Dark Miners spawn, stealing 5% money every 2min.',
      onCast: () => startWizardRitual(),
    },
    {
      id: 'blood_ritual',
      name: 'Blood Ritual',
      icon: '/game/rituals/blood_ritual.png',
      cost: '1-99 miners',
      costCheck: () => gameState.minerCount >= 1,
      backfireChance: (count: number) => 0.5 + (count * 0.5),
      effect: 'Sacrifice miners for temporary buff. More miners = stronger.',
      backfireEffect: 'DEBUFF instead of buff! Effects are inverted.',
      requiresInput: true,
      onCast: (count) => {
        if (count && count >= 1 && count < 100) {
          sacrificeMiners(count);
          setShowSacrificeInput(null);
        }
      },
    },
  ];

  const handleRitualClick = (ritual: Ritual) => {
    if (ritual.isCompleted?.()) return;
    if (!ritual.costCheck()) return;
    
    if (ritual.requiresInput) {
      setShowSacrificeInput(showSacrificeInput === ritual.id ? null : ritual.id);
      // Set default values based on ritual
      if (ritual.id === 'apocalypse') {
        setSacrificeAmount(Math.min(Math.max(100, gameState.minerCount), 300));
      } else {
        setSacrificeAmount(Math.min(Math.max(1, gameState.minerCount), 99));
      }
    } else {
      ritual.onCast();
    }
  };

  const getBackfirePercent = (ritual: Ritual, count?: number): number => {
    if (typeof ritual.backfireChance === 'function') {
      return ritual.backfireChance(count || sacrificeAmount);
    }
    return ritual.backfireChance;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[140]"
        onClick={onClose}
      />

      {/* Compact Panel - positioned near buildings on right side */}
      <div className="fixed right-4 bottom-[220px] z-[150] w-80">
        {/* Main Panel */}
        <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-2 border-amber-600/70 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-3 py-2 flex justify-between items-center border-b border-amber-600/50">
            <div className="flex items-center gap-2">
              <Image 
                src="/game/buildings/wizard_tower.png"
                alt="Wizard Tower"
                width={28}
                height={28}
                style={{ imageRendering: 'pixelated' }}
              />
              <div>
                <h2 className="text-sm font-bold text-white">Wizard Tower</h2>
                <p className="text-purple-300 text-[10px]">{gameState.minerCount} miners available</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl leading-none px-1"
            >
              ×
            </button>
          </div>

          {/* Shadow/Dark Miners Status */}
          <div className="px-3 py-2 bg-black/30 flex gap-3 text-xs border-b border-gray-700/50">
            <div className="flex items-center gap-1">
              <span>👻</span>
              <span className="text-purple-300">{shadowMiners} Shadow</span>
              <span className="text-gray-500">({formatNumber(shadowMiners * 1000)}/s)</span>
            </div>
            {darkMiners > 0 && (
              <div className="flex items-center gap-1 text-red-400">
                <span>😈</span>
                <span>{darkMiners} Dark</span>
              </div>
            )}
          </div>

          {/* Ritual Icons - Horizontal Row */}
          <div className="p-3 flex justify-center gap-2 relative">
            {rituals.map((ritual) => {
              const isCompleted = ritual.isCompleted?.();
              const canCast = ritual.costCheck() && !isCompleted;
              const isHovered = hoveredRitual === ritual.id;
              const isActive = ritual.id === 'dark_ritual' && ritualActive;
              
              return (
                <div key={ritual.id} className="relative">
                  {/* Icon Button */}
                  <button
                    onClick={() => handleRitualClick(ritual)}
                    onMouseEnter={() => setHoveredRitual(ritual.id)}
                    onMouseLeave={() => setHoveredRitual(null)}
                    className={`w-14 h-14 rounded border-2 p-1 transition-all relative overflow-hidden ${
                      isCompleted
                        ? 'border-green-500/70 bg-green-900/30'
                        : isActive
                          ? 'border-purple-400 bg-purple-600/30 animate-pulse'
                          : canCast
                            ? 'border-amber-600/70 bg-gray-800 hover:border-amber-400 hover:bg-gray-700 cursor-pointer'
                            : 'border-gray-600/50 bg-gray-900/50 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <Image
                      src={ritual.icon}
                      alt={ritual.name}
                      fill
                      className="object-contain p-0.5"
                      unoptimized
                    />
                    
                    {isCompleted && (
                      <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                        <span className="text-lg">✓</span>
                      </div>
                    )}
                    
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-center text-purple-300">
                        {(ritualTimeLeft / 1000).toFixed(0)}s
                      </div>
                    )}
                  </button>

                  {/* Floating Tooltip - Above Icon (Cookie Clicker Style) */}
                  {isHovered && (
                    <div 
                      className="fixed z-[250] pointer-events-none"
                      style={{
                        bottom: '340px',
                        right: '50px',
                        width: '280px',
                      }}
                    >
                      <div className="bg-gray-900/95 border-2 border-amber-500 rounded-lg p-3 shadow-2xl backdrop-blur-sm">
                        {/* Header with icon and name */}
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                          <Image
                            src={ritual.icon}
                            alt={ritual.name}
                            width={32}
                            height={32}
                            className="object-contain"
                            unoptimized
                          />
                          <div>
                            <div className="text-white font-bold text-sm">{ritual.name}</div>
                            <div className="text-gray-400 text-xs">Cost: {ritual.cost}</div>
                          </div>
                        </div>
                        
                        {/* Backfire chance */}
                        <div className="text-xs mb-2">
                          <span className="text-gray-400">Chance to backfire: </span>
                          <span className="text-red-400 font-bold">{getBackfirePercent(ritual).toFixed(1)}%</span>
                        </div>
                        
                        {/* Effect - Green */}
                        <div className="text-xs mb-2">
                          <span className="text-gray-500">Effect: </span>
                          <span className="text-green-400">{ritual.effect}</span>
                        </div>
                        
                        {/* Backfire - Red */}
                        <div className="text-xs">
                          <span className="text-gray-500">Backfire: </span>
                          <span className="text-red-400">{ritual.backfireEffect}</span>
                        </div>

                        {isCompleted && (
                          <div className="mt-2 pt-2 border-t border-gray-700 text-green-400 text-xs font-bold">
                            ✓ Already completed
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sacrifice Input (when needed) */}
          {showSacrificeInput && (
            <div className="px-3 pb-3 border-t border-gray-700/50 pt-2">
              <div className="bg-black/40 rounded-lg p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-xs">
                    Sacrifice: <span className="text-purple-400 font-bold">{sacrificeAmount}</span> miners
                  </span>
                  <span className="text-red-400 text-xs">
                    Backfire: {getBackfirePercent(rituals.find(r => r.id === showSacrificeInput)!, sacrificeAmount).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={showSacrificeInput === 'apocalypse' ? 100 : 1}
                  max={showSacrificeInput === 'apocalypse' ? Math.min(gameState.minerCount, 300) : Math.min(gameState.minerCount, 99)}
                  value={sacrificeAmount}
                  onChange={(e) => setSacrificeAmount(Number(e.target.value))}
                  className="w-full accent-purple-500 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const ritual = rituals.find(r => r.id === showSacrificeInput);
                      ritual?.onCast(sacrificeAmount);
                    }}
                    className="flex-1 py-1.5 rounded bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold"
                  >
                    Cast Ritual
                  </button>
                  <button
                    onClick={() => setShowSacrificeInput(null)}
                    className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
