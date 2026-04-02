'use client';

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { RARITY_COLORS } from '@/types/game';

interface TrinketShopButtonProps {
  hidden?: boolean;
  inline?: boolean; // Render as inline element instead of fixed-position floating button
  onOpen: () => void;
}

export default function TrinketShopButton({ hidden = false, inline = false, onOpen }: TrinketShopButtonProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const { trinketShopItems, getTrinketShopTimeLeft } = useGame();
  
  // Update timer every second
  useEffect(() => {
    setTimeLeft(getTrinketShopTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(getTrinketShopTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, [getTrinketShopTimeLeft]);
  
  // Don't render if hidden (e.g., when trinket index is open)
  if (hidden) return null;
  
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  // Get rarest trinket in shop for button color
  const rarityOrder = ['secret', 'mythic', 'legendary', 'epic', 'rare', 'common'];
  const rarestTrinket = trinketShopItems.sort((a, b) => 
    rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
  )[0];
  const buttonColor = rarestTrinket ? RARITY_COLORS[rarestTrinket.rarity] : '#9ca3af';

  return (
    <>
      {/* Trinket Shop Button */}
      <button
        onClick={onOpen}
        className={
          inline
            ? "w-full flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95"
            : "fixed bottom-[180px] sm:bottom-[200px] left-2 sm:left-4 z-30 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
        }
        style={{ 
          backgroundColor: buttonColor,
          boxShadow: `0 0 20px ${buttonColor}50`,
        }}
      >
        <span className={inline ? "text-2xl" : "text-lg sm:text-2xl"}>💎</span>
        <div className="text-left text-white">
          <p className={inline ? "font-bold text-sm" : "font-bold text-xs sm:text-sm"}>Trinkets</p>
          <p className={inline ? "text-xs opacity-80" : "text-[10px] sm:text-xs opacity-80"}>
            {trinketShopItems.length} • {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
        </div>
      </button>
    </>
  );
}
