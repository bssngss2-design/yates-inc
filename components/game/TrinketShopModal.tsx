'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { 
  RARITY_COLORS, Trinket, getPrestigePriceMultiplier, TRINKETS,
  RELIC_CONVERSION_COSTS, TALISMAN_CONVERSION_COSTS, RELIC_MULTIPLIERS, TALISMAN_MULTIPLIERS 
} from '@/types/game';

interface TrinketShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatMoney(amount: number): string {
  if (!isFinite(amount)) return '∞';
  if (amount >= 1e42) return `${(amount / 1e42).toFixed(1)}Tr`;
  if (amount >= 1e39) return `${(amount / 1e39).toFixed(1)}Dr`;
  if (amount >= 1e36) return `${(amount / 1e36).toFixed(1)}Un`;
  if (amount >= 1e33) return `${(amount / 1e33).toFixed(1)}Dc`;
  if (amount >= 1e30) return `${(amount / 1e30).toFixed(1)}No`;
  if (amount >= 1e27) return `${(amount / 1e27).toFixed(1)}Oc`;
  if (amount >= 1e24) return `${(amount / 1e24).toFixed(1)}Sp`;
  if (amount >= 1e21) return `${(amount / 1e21).toFixed(1)}Sx`;
  if (amount >= 1e18) return `${(amount / 1e18).toFixed(1)}Qi`;
  if (amount >= 1e15) return `${(amount / 1e15).toFixed(1)}Q`;
  if (amount >= 1e12) return `${(amount / 1e12).toFixed(1)}T`;
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toString();
}

function TrinketCard({ trinket, onBuy, owned, canAfford, scaledCost, onClickOwned }: { 
  trinket: Trinket; 
  onBuy: () => void; 
  owned: boolean;
  canAfford: boolean;
  scaledCost: number;
  onClickOwned?: () => void;
}) {
  const rarityColor = RARITY_COLORS[trinket.rarity];
  
  return (
    <div 
      className={`relative bg-gray-900/90 rounded-xl p-2 sm:p-4 border-2 transition-all hover:scale-[1.02] ${owned ? 'cursor-pointer' : ''}`}
      style={{ borderColor: rarityColor, boxShadow: `0 0 15px ${rarityColor}40` }}
      onClick={owned ? onClickOwned : undefined}
    >
      {/* Rarity Badge */}
      <div 
        className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase"
        style={{ backgroundColor: rarityColor, color: 'white' }}
      >
        {trinket.rarity}
      </div>
      
      {/* Image */}
      <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 relative">
        <Image
          src={trinket.image}
          alt={trinket.name}
          fill
          className="object-contain drop-shadow-lg"
        />
      </div>
      
      {/* Name */}
      <h3 className="text-white font-bold text-center text-sm sm:text-base mb-1" style={{ color: rarityColor }}>
        {trinket.name}
      </h3>
      
      {/* Description */}
      <p className="text-gray-400 text-[10px] sm:text-xs text-center mb-2 sm:mb-3">
        {trinket.description}
      </p>
      
      {/* Price & Buy Button */}
      <div className="flex items-center justify-between">
        <span className="text-yellow-400 font-bold">
          ${formatMoney(scaledCost)}
        </span>
        
        {owned ? (
          <span className="text-green-400 text-sm flex items-center gap-1">
            ✓ Owned
            <span className="text-purple-400 text-xs">(tap to convert)</span>
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuy();
            }}
            disabled={!canAfford}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
              canAfford 
                ? 'bg-green-600 hover:bg-green-500 text-white' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Buy
          </button>
        )}
      </div>
    </div>
  );
}

export default function TrinketShopModal({ isOpen, onClose }: TrinketShopModalProps) {
  const { 
    trinketShopItems, 
    buyTrinket, 
    ownsTrinket, 
    gameState,
    getTrinketShopTimeLeft,
    resetTrinketShop,
    convertToRelic,
    convertToTalisman,
    ownsRelic,
    ownsTalisman,
  } = useGame();
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedTrinket, setSelectedTrinket] = useState<string | null>(null);
  
  // Update timer every second when modal is open
  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(getTrinketShopTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(getTrinketShopTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, getTrinketShopTimeLeft]);
  
  if (!isOpen) return null;
  
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollable-touch border border-gray-600"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              💎 Trinket Shop
            </h2>
            <p className="text-gray-400 text-sm">
              Refreshes in {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-yellow-400 font-bold text-lg">
              ${formatMoney(gameState.yatesDollars)}
            </p>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Reset Shop Button */}
        <div className="mb-4 p-3 bg-purple-900/30 border border-purple-600/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 font-bold text-sm">🔄 Refresh Shop Now</p>
              <p className="text-gray-400 text-xs">Cost: 40% of your money (${formatMoney(Math.floor(gameState.yatesDollars * 0.4))})</p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={gameState.yatesDollars <= 0}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                gameState.yatesDollars > 0
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Reset Shop
            </button>
          </div>
        </div>
        
        {/* Trinket Grid */}
        {trinketShopItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No trinkets available right now...</p>
            <p className="text-gray-500 text-sm">Check back when the shop refreshes!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {trinketShopItems.map(trinket => {
              const scaledCost = Math.floor(trinket.cost * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode));
              const isOwned = ownsTrinket(trinket.id);
              return (
                <TrinketCard
                  key={trinket.id}
                  trinket={trinket}
                  onBuy={() => buyTrinket(trinket.id)}
                  owned={isOwned}
                  canAfford={gameState.yatesDollars >= scaledCost}
                  scaledCost={scaledCost}
                  onClickOwned={isOwned ? () => setSelectedTrinket(trinket.id) : undefined}
                />
              );
            })}
          </div>
        )}
        
        {/* ALL Owned Trinkets - Click to Convert */}
        <div className="mt-6 pt-6 border-t border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">
              Your Collection ({gameState.ownedTrinketIds.length})
            </h3>
            <div className="flex gap-2 text-sm">
              {(gameState.ownedRelicIds?.length || 0) > 0 && (
                <span className="text-yellow-400">✦ {gameState.ownedRelicIds.length}</span>
              )}
              {(gameState.ownedTalismanIds?.length || 0) > 0 && (
                <span className="text-purple-400">✧ {gameState.ownedTalismanIds.length}</span>
              )}
            </div>
          </div>
          
          {gameState.ownedTrinketIds.length === 0 ? (
            <p className="text-gray-500 text-sm">You don&apos;t own any trinkets yet.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto scrollable-touch pr-2">
              <div className="flex flex-wrap gap-2">
                {gameState.ownedTrinketIds.map(id => {
                  const trinket = TRINKETS.find(t => t.id === id);
                  const hasRelic = ownsRelic(id);
                  const hasTalisman = ownsTalisman(id);
                  
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedTrinket(id)}
                      className="px-3 py-1.5 rounded-lg text-sm transition-all hover:scale-105 hover:brightness-125 flex items-center gap-1"
                      style={{ 
                        backgroundColor: trinket ? `${RARITY_COLORS[trinket.rarity]}25` : '#374151',
                        color: trinket ? RARITY_COLORS[trinket.rarity] : '#9ca3af',
                        border: `2px solid ${trinket ? RARITY_COLORS[trinket.rarity] + '60' : '#4b5563'}`,
                      }}
                    >
                      {trinket?.name || id.replace(/_/g, ' ')}
                      {hasRelic && <span className="text-yellow-400">✦</span>}
                      {hasTalisman && <span className="text-purple-400">✧</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          <p className="text-gray-400 text-xs mt-2">
            👆 Click any trinket to convert → {gameState.chosenPath === 'light' ? 'Relic ✦' : gameState.chosenPath === 'darkness' ? 'Talisman ✧' : 'Choose a path first'}
          </p>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80"
          onClick={() => setShowResetConfirm(false)}
        >
          <div 
            className="bg-gray-900 border-2 border-purple-500 rounded-xl p-6 max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">🔄</div>
            <h3 className="text-xl font-bold text-purple-400 mb-2">Reset Trinket Shop?</h3>
            <p className="text-gray-300 text-sm mb-4">
              This will cost <span className="text-yellow-400 font-bold">${formatMoney(Math.floor(gameState.yatesDollars * 0.4))}</span>
              <br />
              <span className="text-gray-500">(40% of your money)</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetTrinketShop();
                  setShowResetConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trinket Detail Modal with Conversion */}
      {selectedTrinket && (() => {
        const trinket = TRINKETS.find(t => t.id === selectedTrinket);
        if (!trinket) return null;
        
        const hasRelic = ownsRelic(selectedTrinket);
        const hasTalisman = ownsTalisman(selectedTrinket);
        const relicCost = RELIC_CONVERSION_COSTS[selectedTrinket];
        const talismanCost = TALISMAN_CONVERSION_COSTS[selectedTrinket];
        // Use different multipliers based on path
        const relicMultiplier = RELIC_MULTIPLIERS[trinket.rarity];
        const talismanMultiplier = TALISMAN_MULTIPLIERS[trinket.rarity];
        const rarityColor = RARITY_COLORS[trinket.rarity];
        
        // Check affordability - Relics can be paid with tokens OR money
        const canAffordRelicWithTokens = relicCost && gameState.prestigeTokens >= relicCost.prestigeTokens;
        const canAffordRelicWithMoney = relicCost && gameState.yatesDollars >= relicCost.money;
        const canAffordTalisman = talismanCost && 
          gameState.minerCount >= talismanCost.miners && 
          gameState.yatesDollars >= talismanCost.money;
        
        return (
          <div 
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80"
            onClick={() => setSelectedTrinket(null)}
          >
            <div 
              className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border-2"
              style={{ borderColor: rarityColor, boxShadow: `0 0 30px ${rarityColor}40` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-20 h-20 relative shrink-0">
                  <Image
                    src={trinket.image}
                    alt={trinket.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold" style={{ color: rarityColor }}>
                    {trinket.name}
                  </h3>
                  <p className="text-xs uppercase font-bold" style={{ color: rarityColor }}>
                    {trinket.rarity}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">{trinket.description}</p>
                </div>
                <button
                  onClick={() => setSelectedTrinket(null)}
                  className="text-gray-500 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Status badges */}
              <div className="flex gap-2 mb-4">
                <span className="px-2 py-1 bg-green-600/30 text-green-400 text-xs rounded">
                  ✓ Owned
                </span>
                {hasRelic && (
                  <span className="px-2 py-1 bg-yellow-600/30 text-yellow-400 text-xs rounded flex items-center gap-1">
                    ✦ Relic Converted
                  </span>
                )}
                {hasTalisman && (
                  <span className="px-2 py-1 bg-purple-600/30 text-purple-400 text-xs rounded flex items-center gap-1">
                    ✧ Talisman Converted
                  </span>
                )}
              </div>
              
              {/* Conversion info - show both paths */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
                {/* Relic preview (Light) */}
                <div className={`${gameState.chosenPath === 'light' ? '' : 'opacity-50'}`}>
                  <h4 className="text-yellow-400 font-bold text-sm mb-1">
                    ✦ Relic ({relicMultiplier}x) {gameState.chosenPath === 'light' && '← Your path'}
                  </h4>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(trinket.effects).map(([key, value]) => {
                      if (typeof value !== 'number') return null;
                      return (
                        <div key={`relic-${key}`} className="text-gray-400">
                          <span className="text-gray-300">+{(value * 100).toFixed(0)}%</span>
                          <span className="text-yellow-400"> → +{(value * relicMultiplier * 100).toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Talisman preview (Dark) */}
                <div className={`${gameState.chosenPath === 'darkness' ? '' : 'opacity-50'}`}>
                  <h4 className="text-purple-400 font-bold text-sm mb-1">
                    ✧ Talisman ({talismanMultiplier}x) {gameState.chosenPath === 'darkness' && '← Your path'}
                  </h4>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(trinket.effects).map(([key, value]) => {
                      if (typeof value !== 'number') return null;
                      return (
                        <div key={`talisman-${key}`} className="text-gray-400">
                          <span className="text-gray-300">+{(value * 100).toFixed(0)}%</span>
                          <span className="text-purple-400"> → +{(value * talismanMultiplier * 100).toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Conversion buttons */}
              <div className="space-y-3">
                {/* Relic conversion - Light path only - Pay with Tokens OR Money */}
                {gameState.chosenPath === 'light' && relicCost && (
                  <div className={`p-3 rounded-lg border ${hasRelic ? 'border-yellow-600/30 bg-yellow-900/20' : 'border-gray-600 bg-gray-800/50'}`}>
                    <p className="text-yellow-400 font-bold text-sm mb-2">
                      ✦ Convert to Relic
                    </p>
                    
                    {hasRelic ? (
                      <span className="text-yellow-400 text-sm">✓ Already Converted!</span>
                    ) : (
                      <div className="space-y-2">
                        {/* Option 1: Pay with Tokens */}
                        <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2">
                          <div>
                            <p className="text-gray-300 text-xs">Pay with Tokens</p>
                            <p className={`text-[10px] ${canAffordRelicWithTokens ? 'text-green-400' : 'text-red-400'}`}>
                              Cost: {relicCost.prestigeTokens} tokens (You have: {gameState.prestigeTokens})
                            </p>
                          </div>
                          <button
                            onClick={() => convertToRelic(selectedTrinket, true)}
                            disabled={!canAffordRelicWithTokens}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                              canAffordRelicWithTokens
                                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            🪙 Tokens
                          </button>
                        </div>
                        
                        {/* Option 2: Pay with Money */}
                        <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2">
                          <div>
                            <p className="text-gray-300 text-xs">Pay with Money</p>
                            <p className={`text-[10px] ${canAffordRelicWithMoney ? 'text-green-400' : 'text-red-400'}`}>
                              Cost: ${formatMoney(relicCost.money)} (You have: ${formatMoney(gameState.yatesDollars)})
                            </p>
                          </div>
                          <button
                            onClick={() => convertToRelic(selectedTrinket, false)}
                            disabled={!canAffordRelicWithMoney}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                              canAffordRelicWithMoney
                                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            💰 Money
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Talisman conversion - Dark path only */}
                {gameState.chosenPath === 'darkness' && talismanCost && (
                  <div className={`p-3 rounded-lg border ${hasTalisman ? 'border-purple-600/30 bg-purple-900/20' : 'border-gray-600 bg-gray-800/50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-400 font-bold text-sm flex items-center gap-1">
                          ✧ Convert to Talisman
                        </p>
                        <p className="text-gray-400 text-xs">
                          {talismanCost.miners} miners + ${formatMoney(talismanCost.money)}
                        </p>
                        <p className={`text-[10px] ${canAffordTalisman ? 'text-green-400' : 'text-red-400'}`}>
                          You have: {gameState.minerCount} miners, ${formatMoney(gameState.yatesDollars)}
                          {!canAffordTalisman && (
                            <span className="ml-1 font-bold">
                              {gameState.minerCount < talismanCost.miners ? '(need more miners!)' : '(need more money!)'}
                            </span>
                          )}
                        </p>
                      </div>
                      {hasTalisman ? (
                        <span className="text-purple-400 text-sm">✓ Converted</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (convertToTalisman(selectedTrinket)) {
                              // Success - keep modal open to show result
                            }
                          }}
                          disabled={!canAffordTalisman}
                          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            canAffordTalisman
                              ? 'bg-purple-600 hover:bg-purple-500 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Convert
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Path info - smaller, less confusing */}
                {!gameState.chosenPath && (
                  <p className="text-gray-500 text-xs text-center">
                    Choose a path after prestiging to unlock conversions
                  </p>
                )}
                {gameState.chosenPath && (
                  <p className="text-gray-600 text-[10px] text-center mt-2">
                    {gameState.chosenPath === 'light' 
                      ? '☀️ Light path = Relics only (Talismans are for Darkness)' 
                      : '🌙 Darkness path = Talismans only (Relics are for Light)'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

