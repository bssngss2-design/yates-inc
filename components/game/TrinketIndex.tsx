'use client';

import { useState, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import {
  TRINKETS,
  RARITY_COLORS,
  TrinketRarity,
  TrinketEffects,
  RELIC_MULTIPLIERS,
  TALISMAN_MULTIPLIERS,
  YATES_TOTEM_RELIC_EFFECTS,
  YATES_TOTEM_TALISMAN_EFFECTS,
} from '@/types/game';
import Image from 'next/image';

interface TrinketIndexProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'base' | 'talisman' | 'relic';

const RARITY_ORDER: TrinketRarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic', 'secret'];

function getEffectsForMode(trinketId: string, baseEffects: TrinketEffects, rarity: TrinketRarity, mode: ViewMode): TrinketEffects {
  if (mode === 'base') return baseEffects;
  if (trinketId === 'yates_totem') {
    return mode === 'relic' ? YATES_TOTEM_RELIC_EFFECTS : YATES_TOTEM_TALISMAN_EFFECTS;
  }
  const mult = mode === 'relic' ? (RELIC_MULTIPLIERS[rarity] || 1) : (TALISMAN_MULTIPLIERS[rarity] || 1);
  const scaled: TrinketEffects = {};
  for (const [key, val] of Object.entries(baseEffects)) {
    if (typeof val === 'number') (scaled as Record<string, number>)[key] = val * mult;
    else if (typeof val === 'boolean') (scaled as Record<string, boolean>)[key] = val;
  }
  return scaled;
}

function EffectsList({ effects, compact }: { effects: TrinketEffects; compact?: boolean }) {
  const lines: { icon: string; label: string; color: string }[] = [];
  const fmt = (v: number) => `+${(v * 100).toFixed(0)}%`;

  if (effects.allBonus) lines.push({ icon: '⭐', label: `${fmt(effects.allBonus)} all`, color: 'text-yellow-300' });
  if (effects.moneyBonus) lines.push({ icon: '💰', label: `${fmt(effects.moneyBonus)} money`, color: 'text-green-400' });
  if (effects.rockDamageBonus) lines.push({ icon: '💥', label: `${fmt(effects.rockDamageBonus)} rock dmg`, color: 'text-red-400' });
  if (effects.minerDamageBonus) lines.push({ icon: '⛏️', label: `${fmt(effects.minerDamageBonus)} miner dmg`, color: 'text-orange-400' });
  if (effects.minerSpeedBonus) lines.push({ icon: '⚡', label: `${fmt(effects.minerSpeedBonus)} miner spd`, color: 'text-cyan-400' });
  if (effects.clickSpeedBonus) lines.push({ icon: '👆', label: `${fmt(effects.clickSpeedBonus)} click spd`, color: 'text-blue-400' });
  if (effects.couponBonus) lines.push({ icon: '🎟️', label: `${fmt(effects.couponBonus)} coupon`, color: 'text-purple-400' });
  if (effects.couponLuckBonus) lines.push({ icon: '🍀', label: `${fmt(effects.couponLuckBonus)} coupon luck`, color: 'text-emerald-400' });
  if (effects.minerMoneyBonus) lines.push({ icon: '💎', label: `${fmt(effects.minerMoneyBonus)} miner $`, color: 'text-teal-400' });
  if (effects.trinketBonus) lines.push({ icon: '✨', label: `${fmt(effects.trinketBonus)} trinket boost`, color: 'text-pink-400' });
  if (effects.bankInterestBonus) lines.push({ icon: '🏦', label: `+${Math.round((effects.bankInterestBonus - 1) * 100)}% bank interest`, color: 'text-amber-400' });
  if (effects.prestigeProtection) lines.push({ icon: '🛡️', label: 'Keep $ on prestige', color: 'text-sky-400' });

  if (lines.length === 0) return <span className="text-gray-600 text-[9px]">No effects</span>;

  return (
    <div className={compact ? 'flex flex-wrap gap-x-1.5 gap-y-0.5' : 'space-y-0.5'}>
      {lines.map((l, i) => (
        <span key={i} className={`${l.color} text-[9px] sm:text-[10px] ${compact ? '' : 'block'}`}>
          {l.icon} {l.label}
        </span>
      ))}
    </div>
  );
}

export default function TrinketIndex({ isOpen, onClose }: TrinketIndexProps) {
  const { gameState } = useGame();
  const [selectedRarity, setSelectedRarity] = useState<TrinketRarity | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('base');

  const groupedTrinkets = useMemo(() => {
    const rarities = selectedRarity === 'all' ? RARITY_ORDER : [selectedRarity];
    return rarities.map(rarity => ({
      rarity,
      trinkets: TRINKETS.filter(t => t.rarity === rarity),
    }));
  }, [selectedRarity]);

  const ownedCount = gameState.ownedTrinketIds.length;
  const totalCount = TRINKETS.length;

  if (!isOpen) return null;

  const modeConfig: { value: ViewMode; label: string; icon: string; color: string }[] = [
    { value: 'base', label: 'Base', icon: '💎', color: '#a78bfa' },
    { value: 'talisman', label: 'Talismans', icon: '🌑', color: '#c084fc' },
    { value: 'relic', label: 'Relics', icon: '☀️', color: '#fbbf24' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-[150]"
        onClick={onClose}
      />

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl bg-gray-900 rounded-lg shadow-2xl z-[160] max-h-[90vh] overflow-hidden border-2 border-purple-500 mx-4">
        <div className="bg-gradient-to-r from-purple-900 to-pink-900 p-4 sm:p-6 border-b-2 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">💎 Trinket Collection</h2>
              <p className="text-purple-200 text-sm">
                Collected: <span className="font-bold text-yellow-300">{ownedCount}/{totalCount}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-400 text-4xl font-bold transition-colors"
            >
              ×
            </button>
          </div>

          {/* View Mode Tabs: Base / Talismans / Relics */}
          <div className="flex gap-2 mt-3 mb-2">
            {modeConfig.map(({ value, label, icon, color }) => {
              const active = viewMode === value;
              return (
                <button
                  key={value}
                  onClick={() => setViewMode(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    active ? 'ring-2 ring-white/40 scale-105' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: active ? `${color}30` : `${color}10`,
                    color,
                    border: `1.5px solid ${active ? color : `${color}30`}`,
                  }}
                >
                  {icon} {label}
                </button>
              );
            })}
          </div>

          {viewMode !== 'base' && (
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
              Showing {viewMode === 'talisman' ? '🌑 Talisman (Dark)' : '☀️ Relic (Light)'} stats for each trinket
              {viewMode === 'talisman'
                ? ` — multiplied by Dark path conversion rates`
                : ` — multiplied by Light path conversion rates`}
            </p>
          )}

          {/* Rarity Filter Buttons */}
          <div className="flex gap-1.5 sm:gap-2 mt-3 overflow-x-auto scrollable-touch pb-1">
            {([
              { value: 'all' as const, label: 'All' },
              ...RARITY_ORDER.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })),
            ]).map(({ value, label }) => {
              const isActive = selectedRarity === value;
              const color = value === 'all' ? '#a78bfa' : RARITY_COLORS[value];
              return (
                <button
                  key={value}
                  onClick={() => setSelectedRarity(value)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all shrink-0 ${
                    isActive ? 'ring-2 ring-white/50' : 'opacity-50 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isActive ? `${color}40` : `${color}15`,
                    color: color,
                    border: `1.5px solid ${isActive ? color : `${color}40`}`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {groupedTrinkets.map(({ rarity, trinkets }) => {
            const rarityColor = RARITY_COLORS[rarity];
            const ownedInRarity = trinkets.filter(t => gameState.ownedTrinketIds.includes(t.id)).length;
            const mult = viewMode === 'relic' ? RELIC_MULTIPLIERS[rarity] : viewMode === 'talisman' ? TALISMAN_MULTIPLIERS[rarity] : null;

            return (
              <div key={rarity} className="mb-6 last:mb-0">
                <div className="flex items-center gap-3 mb-3">
                  <h3
                    className="text-sm sm:text-base font-bold uppercase tracking-wider"
                    style={{ color: rarityColor }}
                  >
                    {rarity}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {ownedInRarity}/{trinkets.length}
                  </span>
                  {mult !== null && (
                    <span className="text-[10px] text-gray-500">
                      ({mult}x multiplier)
                    </span>
                  )}
                  <div className="flex-1 h-px" style={{ backgroundColor: `${rarityColor}30` }} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {trinkets.map((trinket) => {
                    const isOwned = gameState.ownedTrinketIds.includes(trinket.id);
                    const relicId = `${trinket.id}_relic`;
                    const talismanId = `${trinket.id}_talisman`;
                    const isEquipped = gameState.equippedTrinketIds.includes(trinket.id)
                      || gameState.equippedTrinketIds.includes(relicId)
                      || gameState.equippedTrinketIds.includes(talismanId);
                    const ownsRelic = gameState.ownedTrinketIds.includes(relicId);
                    const ownsTalisman = gameState.ownedTrinketIds.includes(talismanId);

                    const displayEffects = getEffectsForMode(trinket.id, trinket.effects, trinket.rarity, viewMode);

                    return (
                      <div
                        key={trinket.id}
                        className={`relative bg-gray-800 rounded-lg p-3 border-2 transition-all ${
                          isOwned ? 'opacity-100' : 'border-gray-600 opacity-40 grayscale'
                        }`}
                        style={{ borderColor: isOwned ? rarityColor : undefined }}
                      >
                        {isEquipped && (
                          <div className="absolute top-1.5 right-1.5 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                            EQUIPPED
                          </div>
                        )}

                        {/* Converted badge */}
                        {viewMode === 'base' && (ownsRelic || ownsTalisman) && (
                          <div className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            ownsRelic ? 'bg-yellow-600/80 text-yellow-100' : 'bg-purple-600/80 text-purple-100'
                          }`}>
                            {ownsRelic ? '☀️ Relic' : '🌑 Talisman'}
                          </div>
                        )}

                        <div className="relative w-full aspect-square mb-2">
                          <Image
                            src={trinket.image}
                            alt={trinket.name}
                            fill
                            className="object-contain"
                          />
                        </div>

                        <h3
                          className="text-center font-bold text-sm mb-1"
                          style={{ color: rarityColor }}
                        >
                          {trinket.name}
                          {viewMode !== 'base' && (
                            <span className="text-[9px] opacity-70 block">
                              {viewMode === 'talisman' ? '(Talisman)' : '(Relic)'}
                            </span>
                          )}
                        </h3>

                        <div className="mb-2">
                          <EffectsList effects={displayEffects} />
                        </div>

                        <div className="text-center">
                          {isOwned ? (
                            <span className="text-green-400 text-xs font-bold">✓ OWNED</span>
                          ) : (
                            <span className="text-gray-500 text-xs">✗ Not owned</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
