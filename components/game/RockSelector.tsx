'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { ROCKS, getScaledUnlockThreshold } from '@/lib/gameData';
import { getScaledRockHP } from '@/types/game';
import WanderingTraderDialog from './WanderingTraderDialog';

interface RockSelectorProps {
  onClose: () => void;
}

export default function RockSelector({ onClose }: RockSelectorProps) {
  const { gameState, selectRock, currentRock } = useGame();
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden border border-gray-600/30 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-2xl font-bold text-white">🪨 Select Rock</h2>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="bg-black/30 rounded-lg px-2 sm:px-4 py-1 sm:py-2">
              <span className="text-gray-300 text-xs sm:text-sm hidden xs:inline">Total Clicks: </span>
              <span className="text-white font-bold text-xs sm:text-base">{formatNumber(gameState.totalClicks)}</span>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl sm:text-3xl leading-none touch-manipulation p-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Rock Grid */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[75vh] sm:max-h-[70vh]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
            {ROCKS.map((rock) => {
              const scaledThreshold = getScaledUnlockThreshold(rock.unlockAtClicks, gameState.prestigeCount);
              const isUnlocked = gameState.totalClicks >= scaledThreshold;
              const isSelected = currentRock.id === rock.id;
              const clicksNeeded = scaledThreshold - gameState.totalClicks;

              return (
                <button
                  key={rock.id}
                  onClick={() => {
                    if (isUnlocked) {
                      selectRock(rock.id);
                      onClose();
                    }
                  }}
                  disabled={!isUnlocked}
                  className={`relative rounded-lg sm:rounded-xl p-2 sm:p-4 border transition-all touch-manipulation ${
                    isSelected
                      ? 'bg-emerald-600/20 border-emerald-400 scale-105'
                      : isUnlocked
                        ? 'bg-gray-800/50 border-gray-700/50 hover:border-gray-500/50 hover:bg-gray-700/50 active:bg-gray-700'
                        : 'bg-gray-900/50 border-gray-800/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-emerald-500 text-black text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                      MINING
                    </div>
                  )}

                  {/* Lock Icon */}
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <div className="text-center">
                        <span className="text-2xl sm:text-3xl">🔒</span>
                        <p className="text-gray-400 text-[10px] sm:text-xs mt-1">
                          {formatNumber(clicksNeeded)} clicks
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rock Image */}
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-1 sm:mb-2">
                    <Image
                      src={rock.image}
                      alt={rock.name}
                      fill
                      className={`object-contain ${!isUnlocked ? 'grayscale' : ''}`}
                    />
                  </div>

                  {/* Info */}
                  <h3 className="text-white font-bold text-center text-xs sm:text-sm">{rock.name}</h3>
                  <p className="text-gray-400 text-[10px] sm:text-xs text-center">
                    ${formatNumber(rock.moneyPerBreak)}/break
                  </p>
                  {/* HP - clickable for redemption when banned */}
                  <p 
                    className={`text-gray-500 text-[10px] sm:text-xs text-center ${
                      gameState.wtBanned && !gameState.wtRedeemed 
                        ? 'cursor-pointer hover:text-purple-400 transition-colors' 
                        : ''
                    }`}
                    onClick={(e) => {
                      if (gameState.wtBanned && !gameState.wtRedeemed) {
                        e.stopPropagation();
                        setShowRedemptionDialog(true);
                      }
                    }}
                    title={gameState.wtBanned && !gameState.wtRedeemed ? '🧙 A familiar presence...' : undefined}
                  >
                    {formatNumber(getScaledRockHP(rock.clicksToBreak, gameState.prestigeCount))} HP
                  </p>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-700">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-400">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full" />
                <span>Mining</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-600 rounded-full" />
                <span>Unlocked</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span>🔒</span>
                <span>Locked</span>
              </div>
            </div>
          </div>

          {/* Hint when banned - shows that HP can be clicked */}
          {gameState.wtBanned && !gameState.wtRedeemed && (
            <div className="mt-3 text-center">
              <p className="text-purple-400/60 text-xs italic animate-pulse">
                💀 A familiar presence lingers... perhaps click on a rock&apos;s HP?
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Wandering Trader Redemption Dialog */}
      {showRedemptionDialog && (
        <WanderingTraderDialog
          isOpen={showRedemptionDialog}
          onClose={() => setShowRedemptionDialog(false)}
          isRedemption={true}
        />
      )}
    </div>
  );
}

