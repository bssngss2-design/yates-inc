'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { getPickaxeById } from '@/lib/gameData';
import { MINER_BASE_DAMAGE, HARD_MODE_MODIFIERS, PROGRESSIVE_UPGRADES, getProgressiveUpgradeBonus } from '@/types/game';

interface GameSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameSettings({ isOpen, onClose }: GameSettingsProps) {
  const {
    gameState,
    currentPickaxe,
    getTotalBonuses,
    toggleAutoclicker,
    saveNow,
  } = useGame();

  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveNow = useCallback(async () => {
    setSaveStatus('saving');
    const ok = await saveNow();
    setSaveStatus(ok ? 'saved' : 'failed');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [saveNow]);

  const { dmgPerClick, dmgPerSecond } = useMemo(() => {
    const bonuses = getTotalBonuses();

    // Progressive upgrade bonuses (not included in getTotalBonuses)
    const progUpgrades = gameState.progressiveUpgrades;
    const getProgBonus = (id: string) => {
      const u = PROGRESSIVE_UPGRADES.find(p => p.id === id);
      return u ? getProgressiveUpgradeBonus(u, progUpgrades[id as keyof typeof progUpgrades] || 0) : 0;
    };
    const progPcxDmg = getProgBonus('pcxDamage');
    const progGeneralSpeed = getProgBonus('generalSpeed');
    const progMinerSpeed = getProgBonus('minerSpeed');
    const progMinerDamage = getProgBonus('minerDamage');

    // Active ability bonuses (damage_boost / all_boost / miner_speed)
    let abilityDmgMult = 1;
    let abilityAllBonus = 0;
    let abilityMinerSpeedBonus = 0;
    if (gameState.activeAbility) {
      const { startTime, duration, pickaxeId } = gameState.activeAbility;
      if (duration > 0 && Date.now() < startTime + duration) {
        const abPcx = getPickaxeById(pickaxeId);
        const eff = abPcx?.activeAbility?.effect;
        if (eff?.type === 'damage_boost') abilityDmgMult = eff.value;
        if (eff?.type === 'all_boost') abilityAllBonus = eff.value;
        if (eff?.type === 'miner_speed') abilityMinerSpeedBonus = eff.value;
      }
    }

    // Wizard ritual separate 3x multiplier (bonuses already include ritual in their values)
    let wizRitualMult = 1;
    if (gameState.buildings.wizard_tower.ritualActive &&
        gameState.buildings.wizard_tower.ritualEndTime &&
        Date.now() < gameState.buildings.wizard_tower.ritualEndTime) {
      wizRitualMult = 3.0;
    }

    // Factory active buff multipliers
    let factDmgMult = 1;
    let factSpdMult = 1;
    const now = Date.now();
    for (const b of gameState.activeBuffs) {
      if (b.startTime + b.duration > now) {
        if (b.type === 'damage') factDmgMult += b.multiplier;
        if (b.type === 'clickSpeed') factSpdMult += b.multiplier;
      }
    }

    // --- Dmg per click (mirrors mineRock formula + progressive upgrades) ---
    let click = currentPickaxe.clickPower;
    click = Math.ceil(
      click
      * (1 + bonuses.rockDamageBonus + progPcxDmg + abilityAllBonus)
      * abilityDmgMult
      * (1 + bonuses.clickSpeedBonus + progGeneralSpeed)
      * wizRitualMult
      * factDmgMult
      * factSpdMult
    );
    if (gameState.isHardMode) click = Math.ceil(click * HARD_MODE_MODIFIERS.pickaxeDamageMultiplier);
    click = Math.max(1, click);

    // --- Dmg per second (miners + factory bonus miners + mines + shadow miners) ---
    const totalMinerBonus = bonuses.minerDamageBonus + bonuses.minerSpeedBonus
      + progMinerDamage + progMinerSpeed
      + abilityMinerSpeedBonus + abilityAllBonus;
    const effectiveMiners = gameState.minerCount + (gameState.buildings.factory.bonusMiners || 0);
    const minerDps = Math.ceil(effectiveMiners * MINER_BASE_DAMAGE * (1 + totalMinerBonus));
    const mineDps = Math.ceil(gameState.buildings.mine.count * 20 * MINER_BASE_DAMAGE * (1 + totalMinerBonus));
    const shadowDps = (gameState.buildings.wizard_tower.shadowMiners || 0) * 1000;

    return { dmgPerClick: click, dmgPerSecond: minerDps + mineDps + shadowDps };
  }, [gameState, currentPickaxe, getTotalBonuses]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900/95 backdrop-blur-sm rounded-2xl max-w-md w-full border border-gray-600/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-700/40 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            ⚙️ Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>

        {/* Settings Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Gameplay Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gameplay</h3>
            <div className="space-y-2">
              {/* Autoclicker Toggle */}
              {gameState.hasAutoclicker && (
                <div className="flex items-center justify-between p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/30">
                  <div>
                    <span className="text-white text-sm font-medium">🤖 Autoclicker</span>
                    <p className="text-gray-500 text-[10px]">Auto-mine rocks when enabled</p>
                  </div>
                  <button
                    onClick={toggleAutoclicker}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      gameState.autoclickerEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      gameState.autoclickerEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              )}

              {/* Game Mode Display */}
              <div className="flex items-center justify-between p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div>
                  <span className="text-white text-sm font-medium">
                    {gameState.isHardMode ? '💀 Hard Mode' : '😊 Normal Mode'}
                  </span>
                  <p className="text-gray-500 text-[10px]">
                    {gameState.isHardMode ? 'Increased difficulty, better rewards' : 'Standard difficulty'}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  gameState.isHardMode ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                }`}>
                  {gameState.isHardMode ? 'HARD' : 'NORMAL'}
                </span>
              </div>

              {/* Path Display */}
              {gameState.chosenPath && (
                <div className="flex items-center justify-between p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/30">
                  <div>
                    <span className="text-white text-sm font-medium">
                      {gameState.chosenPath === 'light' ? '☀️ Light Path' : '🌑 Darkness Path'}
                    </span>
                    <p className="text-gray-500 text-[10px]">
                      {gameState.chosenPath === 'light' ? 'Relics, enhanced trinkets' : 'Talismans, dark rituals'}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    gameState.chosenPath === 'light' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-purple-900/30 text-purple-400'
                  }`}>
                    {gameState.chosenPath === 'light' ? 'LIGHT' : 'DARK'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Statistics</h3>
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/30 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Total Clicks</span>
                <span className="text-white font-medium">{gameState.totalClicks.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Total Money Earned</span>
                <span className="text-white font-medium">${gameState.totalMoneyEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Prestige Count</span>
                <span className="text-white font-medium">{gameState.prestigeCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Rocks Broken</span>
                <span className="text-white font-medium">{(gameState.rocksMinedCount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Pickaxes Owned</span>
                <span className="text-white font-medium">{gameState.ownedPickaxeIds.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Trinkets Owned</span>
                <span className="text-white font-medium">{gameState.ownedTrinketIds.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Miners</span>
                <span className="text-white font-medium">{gameState.minerCount}</span>
              </div>
              <div className="border-t border-gray-700/30 my-1.5" />
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Current Dmg/Click</span>
                <span className="text-amber-400 font-medium">{dmgPerClick.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Current Dmg/Second</span>
                <span className="text-cyan-400 font-medium">{dmgPerSecond.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Save */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data</h3>
            <div className="space-y-2">
              <div className="p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white text-sm font-medium">💾 Save Game</span>
                    <p className="text-gray-500 text-[10px]">Force save to cloud right now</p>
                  </div>
                  <button
                    onClick={handleSaveNow}
                    disabled={saveStatus === 'saving'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      saveStatus === 'saving'
                        ? 'bg-gray-600 text-gray-400 cursor-wait'
                        : saveStatus === 'saved'
                        ? 'bg-emerald-600 text-white'
                        : saveStatus === 'failed'
                        ? 'bg-red-600 text-white'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    }`}
                  >
                    {saveStatus === 'saving' ? 'Saving...' :
                     saveStatus === 'saved' ? 'Saved!' :
                     saveStatus === 'failed' ? 'Failed!' :
                     'Save Now'}
                  </button>
                </div>
                <p className="text-gray-600 text-[9px] mt-1.5">
                  Auto-saves every 8s · Press <kbd className="bg-gray-700 text-gray-400 px-1 py-0.5 rounded text-[9px] font-mono">Q Q</kbd> to quick save
                </p>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Keyboard Shortcuts</h3>
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/30 p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Exit Game</span>
                <kbd className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-mono">ESC</kbd>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Terminal</span>
                <kbd className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-mono">I</kbd>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Rankings</span>
                <kbd className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-mono">R</kbd>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Mine</span>
                <kbd className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-mono">+</kbd>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Quick Save</span>
                <kbd className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-mono">Q Q</kbd>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
