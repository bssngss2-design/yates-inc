'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';

interface GameSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/** After the player has opened Settings once while owning D1, hide the callout (persists per browser). */
const D1_SETTINGS_CALLOUT_SEEN_KEY = 'yates-settings-d1-callout-seen';

export default function GameSettings({ isOpen, onClose }: GameSettingsProps) {
  const {
    gameState,
    toggleAutoclicker,
    saveNow,
    redeemPromoCode,
  } = useGame();

  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [promoInput, setPromoInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);
  const [d1BannerVisible, setD1BannerVisible] = useState(false);
  const prevSettingsOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Reward / error copy auto-dismisses after 8s */
  useEffect(() => {
    if (!promoFeedback) return;
    const t = setTimeout(() => setPromoFeedback(null), 8000);
    return () => clearTimeout(t);
  }, [promoFeedback]);

  /** D1 pack callout: show at most once per browser after redeem (until localStorage is cleared). */
  useEffect(() => {
    if (!isOpen || !gameState.hasD1PlayerPack) {
      if (!isOpen) setD1BannerVisible(false);
      return;
    }
    try {
      if (globalThis.localStorage?.getItem(D1_SETTINGS_CALLOUT_SEEN_KEY) === '1') {
        setD1BannerVisible(false);
        return;
      }
    } catch {
      /* private mode / blocked storage */
    }
    setD1BannerVisible(true);
    const t = setTimeout(() => setD1BannerVisible(false), 8000);
    return () => clearTimeout(t);
  }, [isOpen, gameState.hasD1PlayerPack]);

  /** Mark D1 callout seen when Settings closes after being open (avoids setting on initial mount). */
  useEffect(() => {
    const wasOpen = prevSettingsOpenRef.current;
    prevSettingsOpenRef.current = isOpen;
    if (wasOpen && !isOpen && gameState.hasD1PlayerPack) {
      try {
        globalThis.localStorage?.setItem(D1_SETTINGS_CALLOUT_SEEN_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }, [isOpen, gameState.hasD1PlayerPack]);

  const handleSaveNow = useCallback(async () => {
    setSaveStatus('saving');
    const ok = await saveNow();
    setSaveStatus(ok ? 'saved' : 'failed');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [saveNow]);

  const handleRedeemPromo = useCallback(async () => {
    const raw = promoInput.trim();
    if (!raw) {
      setPromoFeedback({ kind: 'err', message: 'Enter a code first.' });
      return;
    }
    const res = await redeemPromoCode(raw);
    if (res.ok && res.rewardsSummary?.length) {
      setPromoFeedback({
        kind: 'ok',
        message: res.rewardsSummary.join('\n'),
      });
    } else if (res.ok) {
      setPromoFeedback({ kind: 'ok', message: 'Code redeemed.' });
    } else {
      setPromoFeedback({ kind: 'err', message: res.error || 'Could not redeem.' });
    }
    setPromoInput('');
  }, [promoInput, redeemPromoCode]);

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
        <div className="p-4 space-y-4 max-h-[min(70vh,640px)] overflow-y-auto">

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

          {/* Promo codes */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Promo code</h3>
            <div className="p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/30 space-y-2">
              <p className="text-gray-500 text-[10px]">One-time use per save. Redeemed codes sync to the cloud.</p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRedeemPromo();
                }}
              >
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Enter code…"
                  className="flex-1 min-w-0 bg-gray-900/80 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                >
                  Redeem
                </button>
              </form>
              {promoFeedback && (
                <pre
                  className={`text-[10px] whitespace-pre-wrap rounded-lg p-2 max-h-40 overflow-y-auto ${
                    promoFeedback.kind === 'ok'
                      ? 'bg-emerald-950/50 text-emerald-200 border border-emerald-800/40'
                      : 'bg-red-950/40 text-red-200 border border-red-800/40'
                  }`}
                >
                  {promoFeedback.message}
                </pre>
              )}
            </div>
          </div>

          {gameState.hasD1PlayerPack && d1BannerVisible && (
            <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-amber-950/40 to-yellow-950/20 rounded-xl border border-amber-700/30">
              <Image
                src="/game/d1-player-pack.png"
                alt="D1 Player Pack"
                width={56}
                height={56}
                className="object-contain shrink-0"
                unoptimized
              />
              <div className="min-w-0 flex-1">
                <div className="text-amber-200 text-xs font-bold">D1 Player Pack</div>
                <p className="text-amber-100/70 text-[10px]">
                  Equip the D1 pickaxe: ARISE damage (4× your strongest other pick’s power, min 2M), ×2.5 money,
                  ×3 bonuses, +1 random Shop upgrade every 5 clicks. Ignored for prestige pick requirements; survives prestige.
                </p>
                <button
                  type="button"
                  className="mt-1.5 text-[10px] font-bold text-amber-300/90 hover:text-amber-200 underline"
                  onClick={() => {
                    try {
                      globalThis.localStorage?.setItem(D1_SETTINGS_CALLOUT_SEEN_KEY, '1');
                    } catch {
                      /* ignore */
                    }
                    setD1BannerVisible(false);
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
