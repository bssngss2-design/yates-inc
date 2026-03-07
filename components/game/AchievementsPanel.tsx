'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { ACHIEVEMENTS, checkAchievementUnlocked, TRINKETS, TITLES, TITLE_NAME_STYLES, PRESTIGE_UPGRADES } from '@/types/game';
import { supabase } from '@/lib/supabase';

interface AchievementsPanelProps {
  isTrinketIndexOpen: boolean;
  setIsTrinketIndexOpen: (open: boolean) => void;
  forceOpen?: boolean;
  onForceOpenHandled?: () => void;
  hidden?: boolean;
}

export default function AchievementsPanel({ isTrinketIndexOpen, setIsTrinketIndexOpen, forceOpen, onForceOpenHandled, hidden }: AchievementsPanelProps) {
  const { gameState, equipTitle, unequipTitle } = useGame();
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [titleCounts, setTitleCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle forceOpen from parent (bottom action bar)
  useEffect(() => {
    if (forceOpen) {
      setIsAchievementsOpen(true);
      onForceOpenHandled?.();
    }
  }, [forceOpen, onForceOpenHandled]);

  // Fetch title counts when panel opens
  useEffect(() => {
    if (!isAchievementsOpen) return;
    
    const fetchTitleCounts = async () => {
      try {
        // Get all users' owned_title_ids
        const { data, error } = await supabase
          .from('user_game_data')
          .select('owned_title_ids');
        
        if (error || !data) return;
        
        // Count how many users have each title
        const counts: Record<string, number> = {};
        data.forEach(row => {
          const titles = row.owned_title_ids || [];
          titles.forEach((titleId: string) => {
            counts[titleId] = (counts[titleId] || 0) + 1;
          });
        });
        
        setTitleCounts(counts);
      } catch (err) {
        console.error('Error fetching title counts:', err);
      }
    };
    
    fetchTitleCounts();
  }, [isAchievementsOpen]);
  
  const unlockedCount = ACHIEVEMENTS.filter(a => checkAchievementUnlocked(a, gameState)).length;
  const totalCount = ACHIEVEMENTS.length;
  const trinketOwnedCount = gameState.ownedTrinketIds.length;
  const trinketTotalCount = TRINKETS.length;
  
  const categoryOrder = ['pickaxe', 'rock', 'money', 'prestige', 'miner', 'trinket'] as const;
  const categoryNames: Record<string, string> = {
    pickaxe: '⛏️ Pickaxes',
    rock: '🪨 Rocks',
    money: '💰 Money',
    prestige: '✨ Prestige',
    miner: '👷 Miners',
    trinket: '💍 Trinkets',
  };

  return (
    <>
      {/* Split button - Achievements & Trinket Index (hidden when accessed via bottom bar) */}
      {!hidden && (
        <div className="flex rounded-lg overflow-hidden shadow-lg lg:w-full">
          <button
            onClick={() => setIsAchievementsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all border-r border-amber-800 flex-1 lg:flex-initial justify-center"
          >
            <span className="text-base sm:text-xl">🏆</span>
            <span className="text-[10px] sm:text-sm">{unlockedCount}/{totalCount}</span>
          </button>
          <button
            onClick={() => setIsTrinketIndexOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all flex-1 lg:flex-initial justify-center"
          >
            <span className="text-base sm:text-xl">💎</span>
            <span className="text-[10px] sm:text-sm">{trinketOwnedCount}/{trinketTotalCount}</span>
          </button>
        </div>
      )}

      {/* Achievements Modal - via portal */}
      {isAchievementsOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsAchievementsOpen(false)}
        >
          <div 
            className="bg-gray-900/95 backdrop-blur-sm rounded-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-amber-500/40 z-[9999] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg sm:text-xl font-bold text-amber-400 flex items-center gap-2">
                  🏆 Achievements
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-white">{unlockedCount}/{totalCount}</span>
                  <span className="text-[10px] text-gray-500">({Math.round((unlockedCount / totalCount) * 100)}%)</span>
                  <button 
                    onClick={() => setIsAchievementsOpen(false)}
                    className="text-gray-400 hover:text-white text-lg ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex border-b border-gray-700/50 overflow-x-auto px-2 sm:px-4">
              {gameState.ownedTitleIds && gameState.ownedTitleIds.length > 0 && (
                <button
                  className="flex-shrink-0 py-1.5 px-2 sm:px-3 text-[10px] sm:text-xs font-bold text-purple-400 border-b-2 border-transparent hover:border-purple-400/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    const el = document.getElementById('titles-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  👑 Titles
                </button>
              )}
              {categoryOrder.map(cat => (
                <button
                  key={cat}
                  className="flex-shrink-0 py-1.5 px-2 sm:px-3 text-[10px] sm:text-xs font-bold text-gray-400 hover:text-amber-400 border-b-2 border-transparent hover:border-amber-400/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    const el = document.getElementById(`cat-${cat}`);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {categoryNames[cat]}
                </button>
              ))}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">

            {/* Pro Player Titles — compact rows */}
            {gameState.ownedTitleIds && gameState.ownedTitleIds.length > 0 && (
              <div id="titles-section" className="mb-4 p-3 rounded-xl bg-purple-950/30 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-purple-300">👑 Titles</h3>
                  <span className="text-[10px] text-gray-500">
                    {gameState.equippedTitleIds?.length || 0}/{gameState.ownedPrestigeUpgradeIds?.includes('title_master') ? 2 : 1} equipped
                  </span>
                </div>
                <div className="space-y-1">
                  {TITLES.filter(title => gameState.ownedTitleIds?.includes(title.id)).map(title => {
                    const isEquipped = gameState.equippedTitleIds?.includes(title.id);
                    const hasTitleMaster = gameState.ownedPrestigeUpgradeIds?.includes('title_master');
                    const maxEquipped = hasTitleMaster ? 2 : 1;
                    const canEquip = !isEquipped && (gameState.equippedTitleIds?.length || 0) < maxEquipped;
                    
                    return (
                      <button
                        key={title.id}
                        onClick={() => {
                          if (isEquipped) unequipTitle(title.id);
                          else equipTitle(title.id);
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                          isEquipped 
                            ? 'bg-purple-600/20 border-purple-400/40' 
                            : canEquip
                              ? 'bg-gray-800/30 border-gray-700/30 hover:border-purple-500/30'
                              : 'bg-gray-800/20 border-gray-800/20 opacity-50'
                        }`}
                      >
                        <span className="text-lg flex-shrink-0">{title.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-xs ${TITLE_NAME_STYLES[title.nameStyle]}`}>{title.name}</span>
                            {isEquipped && <span className="text-[8px] bg-purple-500/30 text-purple-300 px-1 py-0.5 rounded font-bold">EQUIP</span>}
                          </div>
                          <span className="text-[10px] text-green-400/80">
                            {title.buffs.moneyBonus ? `+${Math.round(title.buffs.moneyBonus * 100)}% money ` : ''}
                            {title.buffs.allBonus ? `+${Math.round(title.buffs.allBonus * 100)}% all ` : ''}
                            {title.buffs.speedBonus ? `+${Math.round(title.buffs.speedBonus * 100)}% speed ` : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Achievements by category — compact rows */}
            {categoryOrder.map(category => {
              const categoryAchievements = ACHIEVEMENTS.filter(a => a.category === category);
              const catUnlocked = categoryAchievements.filter(a => checkAchievementUnlocked(a, gameState)).length;
              return (
                <div key={category} id={`cat-${category}`} className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-300">
                      {categoryNames[category]}
                    </h3>
                    <span className="text-[10px] text-gray-500">{catUnlocked}/{categoryAchievements.length}</span>
                  </div>
                  <div className="space-y-1">
                    {categoryAchievements.map(achievement => {
                      const isUnlocked = checkAchievementUnlocked(achievement, gameState);
                      return (
                        <div
                          key={achievement.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                            isUnlocked 
                              ? 'bg-amber-900/20 border-amber-500/30' 
                              : 'bg-gray-800/20 border-gray-800/20 opacity-40'
                          }`}
                        >
                          <span className={`text-lg sm:text-xl flex-shrink-0 ${isUnlocked ? '' : 'grayscale'}`}>
                            {isUnlocked ? achievement.icon : '🔒'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className={`font-bold text-xs sm:text-sm ${isUnlocked ? 'text-amber-400' : 'text-gray-600'}`}>
                              {achievement.name}
                            </span>
                            <p className={`text-[10px] sm:text-xs truncate ${isUnlocked ? 'text-gray-400' : 'text-gray-700'}`}>
                              {achievement.description}
                            </p>
                          </div>
                          {isUnlocked && (
                            <span className="text-green-400 text-xs flex-shrink-0">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
