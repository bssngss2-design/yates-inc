'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { PRESTIGE_UPGRADES } from '@/types/game';

export default function PrestigeStore() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { gameState, buyPrestigeUpgrade, ownsPrestigeUpgrade } = useGame();

  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (gameState.prestigeCount === 0) return null;

  return (
    <>
      {/* Prestige Store Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all"
      >
        <span className="text-xl">🌟</span>
        <div className="text-left">
          <p className="text-sm">Prestige Store</p>
          <p className="text-xs opacity-80">{gameState.prestigeTokens} tokens</p>
        </div>
      </button>
      
      {/* Prestige Store Modal - via portal */}
      {isOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 border border-purple-500 z-[9999]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  🌟 Prestige Store
                </h2>
                <p className="text-gray-400 text-sm">
                  Prestige Level: {gameState.prestigeCount} • Multiplier: {gameState.prestigeMultiplier.toFixed(1)}x
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-purple-400 font-bold text-lg flex items-center gap-1">
                  <span>🪙</span> {gameState.prestigeTokens} tokens
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            {/* Upgrades Grid - Scrollable (sorted by cost low to high) */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {[...PRESTIGE_UPGRADES].sort((a, b) => a.cost - b.cost).map(upgrade => {
                const owned = ownsPrestigeUpgrade(upgrade.id);
                const canAfford = gameState.prestigeTokens >= upgrade.cost;
                const missingRequirement = upgrade.requires && !ownsPrestigeUpgrade(upgrade.requires);
                const canBuy = canAfford && !missingRequirement;
                
                return (
                  <div
                    key={upgrade.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      owned 
                        ? 'border-green-500 bg-green-500/10' 
                        : missingRequirement
                          ? 'border-red-600 bg-red-500/10 opacity-60'
                          : canAfford
                            ? 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/20'
                            : 'border-gray-600 bg-gray-700/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold flex items-center gap-2">
                          {upgrade.id === 'dual_trinkets' && '💎'}
                          {upgrade.id === 'coupon_boost' && '🎟️'}
                          {upgrade.id === 'miner_speed_1' && '⛏️'}
                          {upgrade.id === 'miner_speed_2' && '⛏️⛏️'}
                          {upgrade.id === 'pcx_damage' && '💥'}
                          {upgrade.id === 'money_boost' && '💰'}
                          {upgrade.id === 'miner_sprint' && '🏃'}
                          {upgrade.id === 'money_printer' && '🖨️'}
                          {upgrade.id === 'rapid_clicker' && '👆'}
                          {upgrade.id === 'heavy_hitter' && '🔨'}
                          {upgrade.id === 'relic_hunter' && '🔮'}
                          {upgrade.id === 'mega_boost' && '🚀'}
                          {upgrade.id === 'miner_damage_1' && '💪'}
                          {upgrade.id === 'miner_damage_2' && '💪💪'}
                          {upgrade.id === 'coupon_master' && '🎰'}
                          {upgrade.id === 'supreme_clicker' && '⚡'}
                          {upgrade.id === 'rock_crusher' && '🪨'}
                          {upgrade.id === 'miner_overdrive' && '🔥'}
                          {upgrade.id === 'gold_rush' && '🤑'}
                          {upgrade.id === 'ultimate_miner' && '👷'}
                          {upgrade.id === 'trinket_amplifier' && '✨'}
                          {upgrade.id === 'yates_blessing' && '🙏'}
                          {upgrade.id === 'title_master' && '👑'}
                          {upgrade.id === 'triple_trinkets' && '💎💎💎'}
                          {upgrade.id === 'quad_trinkets' && '💎💎💎💎'}
                          {upgrade.name}
                        </h3>
                        <p className="text-gray-400 text-sm">{upgrade.description}</p>
                        {missingRequirement && (
                          <p className="text-red-400 text-xs mt-1">🔒 Requires: {PRESTIGE_UPGRADES.find(u => u.id === upgrade.requires)?.name}</p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {owned ? (
                          <span className="text-green-400 font-bold">✓ Owned</span>
                        ) : missingRequirement ? (
                          <span className="text-red-400 font-bold text-sm">🔒 Locked</span>
                        ) : (
                          <button
                            onClick={() => buyPrestigeUpgrade(upgrade.id)}
                            disabled={!canAfford}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${
                              canAfford
                                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            🪙 {upgrade.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Info */}
            <div className="mt-6 p-3 rounded-lg bg-gray-700/50 text-center">
              <p className="text-gray-400 text-sm">
                Earn {2} prestige tokens every time you prestige!
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

