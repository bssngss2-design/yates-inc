'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { useBudget } from '@/contexts/BudgetContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { PRESTIGE_REQUIREMENTS, getPrestigeRockRequirement, getPrestigePickaxeRequirement } from '@/types/game';
import { ROCKS, PICKAXES } from '@/lib/gameData';

export default function PrestigeButton() {
  const { gameState, canPrestige, prestige } = useGame();
  const { addToActiveBudget } = useBudget();
  const { employee } = useAuth();
  const { client } = useClient();
  
  // Get player name
  const playerName = employee?.name || client?.username || 'Unknown Player';
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPrestiging, setIsPrestiging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  // For portal - need to wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isReady = canPrestige();
  
  // Calculate requirements for display
  const rockRequired = getPrestigeRockRequirement(gameState.prestigeCount);
  const pickaxeRequired = getPrestigePickaxeRequirement(gameState.prestigeCount);
  const hasRequiredRock = gameState.currentRockId >= rockRequired;
  const hasRequiredPickaxe = gameState.ownedPickaxeIds.includes(pickaxeRequired);
  
  // Get names for display
  const requiredRockName = ROCKS.find(r => r.id === rockRequired)?.name || `Rock #${rockRequired}`;
  const requiredPickaxeName = PICKAXES.find(p => p.id === pickaxeRequired)?.name || `Pickaxe #${pickaxeRequired}`;
  const currentRockName = ROCKS.find(r => r.id === gameState.currentRockId)?.name || `Rock #${gameState.currentRockId}`;

  const formatMoney = (amount: number): string => {
    if (!isFinite(amount)) return '$∞';
    if (amount >= 1e42) return `$${(amount / 1e42).toFixed(2)}Tr`;
    if (amount >= 1e39) return `$${(amount / 1e39).toFixed(2)}Dr`;
    if (amount >= 1e36) return `$${(amount / 1e36).toFixed(2)}Un`;
    if (amount >= 1e33) return `$${(amount / 1e33).toFixed(2)}Dc`;
    if (amount >= 1e30) return `$${(amount / 1e30).toFixed(2)}No`;
    if (amount >= 1e27) return `$${(amount / 1e27).toFixed(2)}Oc`;
    if (amount >= 1e24) return `$${(amount / 1e24).toFixed(2)}Sp`;
    if (amount >= 1e21) return `$${(amount / 1e21).toFixed(2)}Sx`;
    if (amount >= 1e18) return `$${(amount / 1e18).toFixed(2)}Qi`;
    if (amount >= 1e15) return `$${(amount / 1e15).toFixed(2)}Q`;
    if (amount >= 1e12) return `$${(amount / 1e12).toFixed(2)}T`;
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const nextMultiplier = 1.0 + ((gameState.prestigeCount + 1) * 0.1);
  const contributionAmount = Math.floor(gameState.yatesDollars / 32);

  const handlePrestige = async () => {
    setIsPrestiging(true);
    
    const result = prestige();
    
    if (result && result.amountToCompany > 0) {
      // Add contribution to active budget (money in circulation)
      await addToActiveBudget(
        result.amountToCompany,
        `Prestige contribution from ${playerName}`,
        'prestige'
      );
    }
    
    setIsPrestiging(false);
    setShowConfirm(false);
  };

  // Modal content - rendered via portal to escape stacking context
  const modalContent = showConfirm && mounted ? createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[9998]"
        onClick={() => setShowConfirm(false)}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-xl p-6 z-[9999] w-[400px] max-w-[90vw] shadow-2xl border border-purple-500">
        <div className="text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to Prestige?
          </h2>
          <p className="text-gray-300 mb-4">
            This will reset your rocks and pickaxes!
          </p>
        </div>

        <div className="space-y-3 mb-6 bg-black/30 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Current Multiplier:</span>
            <span className="text-yellow-400 font-bold">
              {gameState.prestigeMultiplier.toFixed(1)}x
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">New Multiplier:</span>
            <span className="text-green-400 font-bold">
              {nextMultiplier.toFixed(1)}x 🎉
            </span>
          </div>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Current Money:</span>
              <span className="text-yellow-400">
                {formatMoney(gameState.yatesDollars)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">To Company Budget:</span>
              <span className="text-emerald-400">
                {formatMoney(contributionAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 mb-4 text-center">
          <p>✅ Keeps: Coupons, Autoclicker, Cutscene</p>
          <p>❌ Resets: Rocks, Pickaxes, Clicks, Money</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrestige}
            disabled={isPrestiging}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
          >
            {isPrestiging ? 'Prestiging...' : 'PRESTIGE!'}
          </button>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  // Not ready popup content
  const requirementsPopup = showRequirements && mounted && !isReady ? createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={() => setShowRequirements(false)}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-xl p-6 z-[9999] w-[350px] max-w-[90vw] shadow-2xl border border-gray-700">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-xl font-bold text-white">Prestige Requirements</h2>
          <p className="text-sm text-gray-400">For prestige #{gameState.prestigeCount + 1}</p>
        </div>
        
        <div className="space-y-3">
          <div className={`flex items-center justify-between p-3 rounded-lg ${hasRequiredRock ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
            <div>
              <p className="text-sm text-gray-300">⛏️ Rock Required:</p>
              <p className="font-bold text-white">{requiredRockName}</p>
            </div>
            <div className="text-right">
              {hasRequiredRock ? (
                <span className="text-green-400 text-2xl">✓</span>
              ) : (
                <span className="text-red-400 text-sm">Current: {currentRockName}</span>
              )}
            </div>
          </div>
          
          <div className={`flex items-center justify-between p-3 rounded-lg ${hasRequiredPickaxe ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
            <div>
              <p className="text-sm text-gray-300">🔨 Pickaxe Required:</p>
              <p className="font-bold text-white">{requiredPickaxeName}</p>
            </div>
            <div>
              {hasRequiredPickaxe ? (
                <span className="text-green-400 text-2xl">✓</span>
              ) : (
                <span className="text-red-400 text-2xl">✗</span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowRequirements(false)}
          className="w-full mt-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Got it
        </button>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      {isReady ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="relative bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all animate-pulse"
        >
          <span className="flex items-center gap-2">
            🌟 PRESTIGE {gameState.prestigeCount + 1}
          </span>
          <span className="block text-xs opacity-80">
            Get {nextMultiplier.toFixed(1)}x multiplier
          </span>
        </button>
      ) : (
        <button
          onClick={() => setShowRequirements(true)}
          className="relative bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-600 transition-all"
        >
          <span className="flex items-center gap-2">
            🔒 PRESTIGE {gameState.prestigeCount + 1}
          </span>
          <span className="block text-xs opacity-80">
            Click to see requirements
          </span>
        </button>
      )}

      {/* Modal rendered via portal to document.body */}
      {modalContent}
      {requirementsPopup}
    </>
  );
}
