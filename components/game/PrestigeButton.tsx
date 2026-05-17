'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { useBudget } from '@/contexts/BudgetContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import {
  getPrestigeRockRequirement,
  getPrestigePickaxeRequirement,
  getPrestigeMoneyRequirement,
  getPrestigePriceMultiplier,
} from '@/types/game';
import { ROCKS, PICKAXES } from '@/lib/gameData';

function formatPrestigeRunDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

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
  const [, setNowTick] = useState(0);

  // For portal - need to wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isReady = canPrestige();
  
  // Calculate requirements for display
  const rockRequired = getPrestigeRockRequirement(gameState.prestigeCount);
  const pickaxeRequired = getPrestigePickaxeRequirement(gameState.prestigeCount, gameState.chosenPath);
  const hasRequiredRock = gameState.currentRockId >= rockRequired;
  const pickaxeSkipped = pickaxeRequired === -1;
  const hasRequiredPickaxe = pickaxeSkipped || gameState.ownedPickaxeIds.includes(pickaxeRequired);
  
  // Get names for display
  const requiredRockName = ROCKS.find(r => r.id === rockRequired)?.name || `Rock #${rockRequired}`;
  const requiredPickaxeName = pickaxeSkipped ? 'Skipped (path-locked)' : (PICKAXES.find(p => p.id === pickaxeRequired)?.name || `Pickaxe #${pickaxeRequired}`);
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

  const nextPrestigeNum = gameState.prestigeCount + 1;

  const runDurationMs = Date.now() - (gameState.gameStartTime || Date.now());

  const hcPreviewLine = useMemo(() => {
    if (nextPrestigeNum < 10) return 'Heavenly chips: unlock at prestige 10 (+1 HC, Ascension tree).';
    if (nextPrestigeNum === 10) {
      return 'Heavenly chips: +1 (Ascension tree opens).';
    }
    const fromGems = Math.floor((gameState.gems || 0) / 25);
    const fromMoney = Math.floor(gameState.yatesDollars / 1_000_000_000_000);
    return `Heavenly chips: +${fromGems + fromMoney} (${fromGems} from gems · ${fromMoney} from $).`;
  }, [nextPrestigeNum, gameState.gems, gameState.yatesDollars]);

  /** Bottleneck progress toward next prestige: rock id, required pick (price/money), soft money gate. */
  const prestigeProgressPct = useMemo(() => {
    const rockReq = rockRequired;
    const rockPct =
      gameState.currentRockId >= rockReq ? 1 : Math.min(1, gameState.currentRockId / Math.max(1, rockReq));

    let pickPct = 1;
    if (pickaxeRequired !== -1 && !gameState.ownedPickaxeIds.includes(pickaxeRequired)) {
      const def = PICKAXES.find((p) => p.id === pickaxeRequired);
      if (!def) pickPct = 0;
      else {
        const scaled = Math.floor(
          def.price * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0),
        );
        pickPct = scaled <= 0 ? 1 : Math.min(1, gameState.yatesDollars / scaled);
      }
    }

    const moneyReq = getPrestigeMoneyRequirement(gameState.prestigeCount);
    const moneyPct = moneyReq <= 0 ? 1 : Math.min(1, gameState.yatesDollars / moneyReq);

    return Math.round(Math.min(rockPct, pickPct, moneyPct) * 1000) / 10;
  }, [
    rockRequired,
    pickaxeRequired,
    gameState.currentRockId,
    gameState.ownedPickaxeIds,
    gameState.yatesDollars,
    gameState.prestigeCount,
    gameState.isHardMode,
    gameState.sideLevel,
  ]);

  const conciseTitle = `×${gameState.prestigeMultiplier.toFixed(2)} · ${formatPrestigeRunDuration(runDurationMs)} · ${hcPreviewLine.replace(/^Heavenly chips: /, '')}`;

  const handlePrestige = async () => {
    setIsPrestiging(true);

    // Calculate HC that will be earned BEFORE prestiging (for display)
    const nextPrestigeCount = gameState.prestigeCount + 1;
    let hcPreview = 0;
    if (nextPrestigeCount >= 10) {
      if (nextPrestigeCount === 10) {
        hcPreview = 1;
      } else {
        const hcFromGems = Math.floor((gameState.gems || 0) / 25);
        const hcFromMoney = Math.floor(gameState.yatesDollars / 1_000_000_000_000);
        hcPreview = hcFromGems + hcFromMoney;
      }
    }

    const result = prestige();
    
    if (result && result.amountToCompany > 0) {
      await addToActiveBudget(
        result.amountToCompany,
        `Prestige contribution from ${playerName}`,
        'prestige'
      );
    }
    
    setIsPrestiging(false);
    setShowConfirm(false);

    if (nextPrestigeCount >= 10) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('yates-open-ascension-tree', { detail: { hcEarned: hcPreview } })
        );
      }
    }
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

        {gameState.prestigeCount + 1 >= 10 && (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
            <div className="text-center text-yellow-400 font-bold text-sm mb-1">Heavenly Chips Preview</div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">From Gems ({gameState.gems || 0}):</span>
              <span className="text-yellow-300">+{gameState.prestigeCount + 1 === 10 ? 0 : Math.floor((gameState.gems || 0) / 25)} HC</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">From Money:</span>
              <span className="text-yellow-300">+{gameState.prestigeCount + 1 === 10 ? 1 : Math.floor(gameState.yatesDollars / 1e12)} HC</span>
            </div>
            <div className="text-center text-yellow-400 text-xs mt-1">The Ascension Tree will open after prestige!</div>
          </div>
        )}
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
      <div className="relative z-[140] inline-flex flex-col items-stretch isolate w-full max-w-[13.5rem] group">
        <div
          className="pointer-events-none absolute z-[160] top-full left-1/2 mt-1.5 w-[min(17.5rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border-2 border-purple-500/80 bg-gray-950/95 px-3 py-2 text-left text-[10px] leading-snug text-gray-100 shadow-xl opacity-0 translate-y-0.5 transition-all duration-150 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0"
          role="tooltip"
        >
          <p className="font-black text-amber-200/95">
            Multiplier (now){' '}
            <span className="tabular-nums text-white">×{gameState.prestigeMultiplier.toFixed(2)}</span>
          </p>
          <p className="mt-1 text-gray-300">
            <span className="font-bold text-gray-400">This prestige: </span>
            {formatPrestigeRunDuration(runDurationMs)}
          </p>
          <p className="mt-1 text-amber-100/95">{hcPreviewLine}</p>
        </div>

        {isReady ? (
          <button
            type="button"
            title={conciseTitle}
            onClick={() => setShowConfirm(true)}
            className="relative w-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white px-3 py-2 rounded-t-md font-bold shadow-lg hover:shadow-xl hover:brightness-[1.03] transition-all border-2 border-b-0 border-purple-700/90"
          >
            <span className="flex items-center justify-center gap-1.5 text-sm">
              🌟 <span className="tracking-tight">Prestige</span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            title={conciseTitle}
            onClick={() => setShowRequirements(true)}
            className="relative w-full bg-gray-700 text-gray-200 px-3 py-2 rounded-t-md font-bold shadow-lg hover:bg-gray-600 transition-all border-2 border-b-0 border-gray-600"
          >
            <span className="flex items-center justify-center gap-1.5 text-sm">
              🔒 <span className="tracking-tight">Prestige</span>
            </span>
          </button>
        )}

        <div
          className={`h-1.5 w-full overflow-hidden rounded-b-md border-2 border-t-0 shadow-inner ${
            isReady ? 'border-purple-700/90 bg-purple-950/60' : 'border-gray-600 bg-gray-900'
          }`}
          aria-hidden
        >
          <div
            className={`h-full transition-[width] duration-300 ease-out ${
              isReady
                ? 'bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-200'
                : 'bg-gradient-to-r from-slate-500 to-slate-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, prestigeProgressPct))}%` }}
          />
        </div>
      </div>


      {/* Modal rendered via portal to document.body */}
      {modalContent}
      {requirementsPopup}
    </>
  );
}
