'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { SACRIFICE_BUFF_TIERS, RITUAL_MONEY_REQUIREMENT, RITUAL_MINER_SACRIFICE } from '@/types/game';

interface SacrificeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SacrificeModal({ isOpen, onClose }: SacrificeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [sacrificeCount, setSacrificeCount] = useState(1);
  const [showRitualConfirm, setShowRitualConfirm] = useState(false);
  const { 
    gameState, 
    sacrificeMiners, 
    getSacrificeBuffForCount,
    activateGoldenCookieRitual,
    canActivateRitual,
  } = useGame();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset count when modal opens
  useEffect(() => {
    if (isOpen) {
      setSacrificeCount(Math.min(1, gameState.minerCount));
    }
  }, [isOpen, gameState.minerCount]);

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

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes}min`;
    return `${minutes}min ${remainingSeconds}s`;
  };

  // Get current buff preview
  const currentBuff = getSacrificeBuffForCount(sacrificeCount);

  // Format buff display
  const formatBuff = (buff: typeof currentBuff) => {
    if (!buff) return 'No buff';
    const parts: string[] = [];
    if (buff.buff.moneyBonus > 0) parts.push(`+${Math.round(buff.buff.moneyBonus * 100)}% money`);
    if (buff.buff.pcxDamageBonus > 0) parts.push(`+${Math.round(buff.buff.pcxDamageBonus * 100)}% pcx dmg`);
    if (buff.buff.minerDamageBonus > 0) parts.push(`+${Math.round(buff.buff.minerDamageBonus * 100)}% miner dmg`);
    if (buff.buff.allBonus > 0) parts.push(`+${Math.round(buff.buff.allBonus * 100)}% EVERYTHING`);
    return parts.length > 0 ? parts.join(', ') : 'No buff';
  };

  const handleSacrifice = () => {
    if (sacrificeMiners(sacrificeCount)) {
      onClose();
    }
  };

  const handleActivateRitual = () => {
    if (activateGoldenCookieRitual()) {
      setShowRitualConfirm(false);
      onClose();
    }
  };

  // Check if active buff is present
  const hasActiveBuff = gameState.sacrificeBuff && Date.now() < gameState.sacrificeBuff.endsAt;
  const buffTimeRemaining = hasActiveBuff ? gameState.sacrificeBuff!.endsAt - Date.now() : 0;

  if (!isOpen || !mounted) return null;

  // Only show for darkness path
  if (gameState.chosenPath !== 'darkness') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-gray-900 to-red-950/50 rounded-xl p-4 max-w-sm w-full border-2 border-red-700 shadow-[0_0_30px_rgba(239,68,68,0.3)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Compact */}
        <div className="text-center mb-3">
          <div className="text-3xl">😈</div>
          <h2 className="text-xl font-bold text-red-400">Miner Sacrifice</h2>
        </div>

        {/* Active Buff Display */}
        {hasActiveBuff && (
          <div className="mb-3 p-2 bg-red-900/30 border border-red-600/50 rounded-lg text-sm">
            <div className="flex justify-between items-center">
              <span className="text-red-300 font-bold">🔥 Active</span>
              <span className="text-yellow-400 font-mono text-xs">{formatDuration(buffTimeRemaining)}</span>
            </div>
            <p className="text-gray-300 text-xs mt-1">
              {formatBuff({ buff: gameState.sacrificeBuff!, duration: buffTimeRemaining })}
            </p>
          </div>
        )}

        {/* Golden Cookie Ritual Section - Compact */}
        {!gameState.goldenCookieRitualActive && (
          <div className="mb-3 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🍪</span>
              <h3 className="text-yellow-400 font-bold text-sm">Golden Cookie Ritual</h3>
            </div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Money:</span>
              <span className={gameState.yatesDollars >= RITUAL_MONEY_REQUIREMENT ? 'text-green-400' : 'text-red-400'}>
                ${formatNumber(gameState.yatesDollars)} / ${formatNumber(RITUAL_MONEY_REQUIREMENT)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400">Miners:</span>
              <span className={gameState.minerCount >= RITUAL_MINER_SACRIFICE ? 'text-green-400' : 'text-red-400'}>
                {gameState.minerCount} / {RITUAL_MINER_SACRIFICE}
              </span>
            </div>
            <button
              onClick={() => setShowRitualConfirm(true)}
              disabled={!canActivateRitual()}
              className={`w-full py-1.5 rounded text-sm font-bold transition-all ${
                canActivateRitual()
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canActivateRitual() ? '🍪 Activate' : '🔒 Not Ready'}
            </button>
          </div>
        )}

        {/* Ritual Active Badge */}
        {gameState.goldenCookieRitualActive && (
          <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-center">
            <span className="text-yellow-400 font-bold text-sm">🍪 Ritual Active!</span>
          </div>
        )}

        {/* Sacrifice Section */}
        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300 text-sm font-bold">Sacrifice Miners</span>
            <span className="text-white font-bold">{gameState.minerCount} available</span>
          </div>
          
          {/* Slider + Input */}
          <div className="flex items-center gap-2 mb-2">
            <input
              type="range"
              min={1}
              max={Math.max(1, Math.min(300, gameState.minerCount))}
              value={sacrificeCount}
              onChange={(e) => setSacrificeCount(Number(e.target.value))}
              disabled={gameState.minerCount === 0}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <input
              type="number"
              min={1}
              max={Math.min(300, gameState.minerCount)}
              value={sacrificeCount}
              onChange={(e) => setSacrificeCount(Math.min(300, Math.min(gameState.minerCount, Math.max(1, Number(e.target.value)))))}
              disabled={gameState.minerCount === 0}
              className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-center text-sm"
            />
          </div>
          
          {/* Quick select - 2 rows */}
          <div className="grid grid-cols-6 gap-1">
            {[1, 10, 50, 100, 200, 300].map(n => (
              <button
                key={n}
                onClick={() => setSacrificeCount(Math.min(n, gameState.minerCount))}
                disabled={gameState.minerCount < n}
                className={`py-1 text-xs rounded transition-colors ${
                  gameState.minerCount >= n
                    ? 'bg-red-900/50 hover:bg-red-800/50 text-red-300'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Buff Preview - Inline */}
          <div className="mt-2 pt-2 border-t border-gray-700">
            {currentBuff ? (
              <div className="flex justify-between items-center text-xs">
                <span className="text-green-400">{formatBuff(currentBuff)}</span>
                <span className="text-yellow-400">{formatDuration(currentBuff.duration)}</span>
              </div>
            ) : (
              <p className="text-gray-500 text-xs text-center">Select miners to see buff</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSacrifice}
            disabled={gameState.minerCount === 0 || sacrificeCount <= 0}
            className={`flex-1 px-3 py-2 font-bold rounded transition-all text-sm ${
              gameState.minerCount > 0 && sacrificeCount > 0
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            🔥 Sacrifice {sacrificeCount}
          </button>
        </div>
      </div>

      {/* Ritual Confirmation Modal */}
      {showRitualConfirm && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
          onClick={() => setShowRitualConfirm(false)}
        >
          <div 
            className="bg-gray-900 border-2 border-yellow-500 rounded-xl p-6 max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4">🍪</div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Activate Golden Cookie Ritual?</h3>
            <p className="text-gray-300 text-sm mb-4">
              This will <span className="text-red-400 font-bold">sacrifice 420 miners</span> permanently.
              <br />
              Golden Cookies will then spawn randomly!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRitualConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateRitual}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
