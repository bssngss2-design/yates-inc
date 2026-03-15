'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';

interface GameSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameSettings({ isOpen, onClose }: GameSettingsProps) {
  const {
    gameState,
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
