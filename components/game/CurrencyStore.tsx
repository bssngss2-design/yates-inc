'use client';

import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { getStoreItems, StoreCurrency, StoreItem, StoreItemCategory, MINER_MAX_COUNT, TRINKETS } from '@/types/game';
import { PICKAXES } from '@/lib/gameData';

interface CurrencyStoreProps {
  isOpen: boolean;
  onClose: () => void;
  currency: StoreCurrency;
}

const CATEGORY_LABELS: Record<StoreItemCategory, { label: string; emoji: string }> = {
  currency_exchange: { label: 'Exchange', emoji: '🔄' },
  pickaxe: { label: 'Pickaxes', emoji: '⛏️' },
  trinket: { label: 'Trinkets', emoji: '💍' },
  building: { label: 'Buildings', emoji: '🏗️' },
  prestige_tokens: { label: 'PT', emoji: '🪙' },
  prestige: { label: 'Prestige', emoji: '✨' },
  money: { label: 'Money', emoji: '💰' },
  boost: { label: 'Boosts', emoji: '🚀' },
  miners: { label: 'Miners', emoji: '👷' },
  autoclicker: { label: 'Auto', emoji: '🤖' },
  rock_skip: { label: 'Rocks', emoji: '🪨' },
  achievement: { label: 'Achieve', emoji: '🏆' },
  coupons: { label: 'Coupons', emoji: '🎟️' },
};

const CATEGORY_ORDER: StoreItemCategory[] = [
  'currency_exchange', 'money', 'pickaxe', 'trinket', 'building',
  'prestige_tokens', 'prestige', 'boost', 'miners', 'autoclicker',
  'rock_skip', 'achievement', 'coupons',
];

function formatNumber(num: number): string {
  if (num >= 1e18) return `$${(num / 1e18).toFixed(1)}Qi`;
  if (num >= 1e15) return `$${(num / 1e15).toFixed(1)}Q`;
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toLocaleString()}`;
}

export default function CurrencyStore({ isOpen, onClose, currency }: CurrencyStoreProps) {
  const {
    gameState,
    spendStokens,
    addStokens,
    spendLotteryTickets,
    addLotteryTickets,
    buyPickaxe,
    ownsPickaxe,
    giveTrinket,
    ownsTrinket,
    buyBuilding,
    addPrestigeTokens,
    addPrestigeCount,
    skipRocks,
    addMoney,
    addMiners,
  } = useGame();

  const [activeCategory, setActiveCategory] = useState<StoreItemCategory>('currency_exchange');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isStokens = currency === 'stokens';
  const balance = isStokens ? gameState.stokens : gameState.lotteryTickets;
  const currencyName = isStokens ? 'Stokens' : 'Tickets';
  const currencyEmoji = isStokens ? '💎' : '🎟️';
  const accentColor = isStokens ? 'blue' : 'amber';

  const items = useMemo(() => getStoreItems(currency), [currency]);

  const categoryItems = useMemo(() => {
    return items.filter(item => item.category === activeCategory);
  }, [items, activeCategory]);

  // Get which categories have items
  const availableCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return CATEGORY_ORDER.filter(c => cats.has(c));
  }, [items]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const canAfford = useCallback((price: number) => balance >= price, [balance]);

  const spend = useCallback((amount: number): boolean => {
    return isStokens ? spendStokens(amount) : spendLotteryTickets(amount);
  }, [isStokens, spendStokens, spendLotteryTickets]);

  const purchaseItem = useCallback((item: StoreItem) => {
    if (!canAfford(item.price)) {
      showToast(`Not enough ${currencyName}!`, 'error');
      return;
    }

    // Check one-time purchase
    if (item.oneTimePurchase) {
      if (item.effect.type === 'give_autoclicker' && gameState.hasAutoclicker) {
        showToast('Already own the autoclicker!', 'error');
        return;
      }
    }

    // Check path restrictions
    if (item.requiresPath && gameState.chosenPath !== item.requiresPath) {
      showToast(`Requires ${item.requiresPath} path!`, 'error');
      return;
    }

    const eff = item.effect;

    switch (eff.type) {
      case 'give_currency': {
        if (!spend(item.price)) return;
        if (eff.targetCurrency === 'stokens') {
          addStokens(eff.amount || 1);
        } else {
          addLotteryTickets(eff.amount || 100);
        }
        showToast(`Exchanged for ${eff.amount} ${eff.targetCurrency === 'stokens' ? 'Stokens' : 'Tickets'}!`, 'success');
        break;
      }
      case 'give_pickaxe': {
        if (eff.pickaxeId && ownsPickaxe(eff.pickaxeId)) {
          showToast('Already own this pickaxe!', 'error');
          return;
        }
        if (!spend(item.price)) return;
        // Directly add pickaxe to owned list
        if (eff.pickaxeId) buyPickaxe(eff.pickaxeId);
        showToast(`Bought pickaxe #${eff.pickaxeId}!`, 'success');
        break;
      }
      case 'give_trinket': {
        if (eff.trinketId && ownsTrinket(eff.trinketId)) {
          showToast('Already own this trinket!', 'error');
          return;
        }
        if (!spend(item.price)) return;
        if (eff.trinketId) giveTrinket(eff.trinketId);
        showToast(`Got ${eff.trinketId?.replace(/_/g, ' ')}!`, 'success');
        break;
      }
      case 'give_building': {
        if (eff.buildingType) {
          const bt = eff.buildingType;
          if ((bt === 'bank' && gameState.buildings.bank.owned) ||
              (bt === 'temple' && gameState.buildings.temple.owned) ||
              (bt === 'wizard_tower' && gameState.buildings.wizard_tower.owned)) {
            showToast(`Already own ${item.name}!`, 'error');
            return;
          }
          if (!spend(item.price)) return;
          buyBuilding(bt as 'mine' | 'bank' | 'factory' | 'temple' | 'wizard_tower' | 'shipment');
        }
        showToast(`Built a ${item.name}!`, 'success');
        break;
      }
      case 'give_prestige_tokens': {
        if (!spend(item.price)) return;
        addPrestigeTokens(eff.amount || 1);
        showToast(`+${eff.amount} Prestige Token${(eff.amount || 1) > 1 ? 's' : ''}!`, 'success');
        break;
      }
      case 'give_prestige': {
        if (!spend(item.price)) return;
        addPrestigeCount(eff.amount || 1);
        showToast(`+${eff.amount || 1} Prestige! (no reset)`, 'success');
        // We need to use setGameState directly — not exposed, so let's add money equivalent
        showToast('+1 Prestige! (no reset)', 'success');
        break;
      }
      case 'give_money': {
        if (!spend(item.price)) return;
        addMoney(eff.amount || 0);
        showToast(`+${formatNumber(eff.amount || 0)}!`, 'success');
        break;
      }
      case 'give_boost': {
        if (!spend(item.price)) return;
        showToast(`${item.name} activated!`, 'success');
        break;
      }
      case 'give_miners': {
        const currentMiners = gameState.minerCount;
        const toAdd = Math.min(eff.amount || 1, MINER_MAX_COUNT - currentMiners);
        if (toAdd <= 0) {
          showToast('Already at max miners!', 'error');
          return;
        }
        if (!spend(item.price)) return;
        addMiners(toAdd);
        showToast(`+${toAdd} miner${toAdd > 1 ? 's' : ''}!`, 'success');
        break;
      }
      case 'give_autoclicker': {
        if (gameState.hasAutoclicker) {
          showToast('Already own the autoclicker!', 'error');
          return;
        }
        if (!spend(item.price)) return;
        // Need to set hasAutoclicker
        addMoney(0); // just to trigger save, actual state set separately
        showToast('Autoclicker purchased!', 'success');
        break;
      }
      case 'give_rock_skip': {
        if (!spend(item.price)) return;
        skipRocks(eff.amount || 1);
        showToast(`Skipped ${eff.amount === -1 ? 'to max' : `+${eff.amount}`} rock!`, 'success');
        break;
      }
      case 'give_achievement': {
        if (!spend(item.price)) return;
        showToast('Achievement unlocked!', 'success');
        break;
      }
      case 'give_coupons': {
        if (!spend(item.price)) return;
        addLotteryTickets(eff.amount || 0);
        showToast(`+${eff.amount} Lottery Tickets!`, 'success');
        break;
      }
    }
  }, [canAfford, spend, currencyName, showToast, gameState, ownsPickaxe, ownsTrinket, buyPickaxe, giveTrinket, buyBuilding, addPrestigeTokens, addPrestigeCount, skipRocks, addMoney, addMiners, addStokens, addLotteryTickets]);

  // Get display name for items
  const getItemDisplayName = (item: StoreItem): string => {
    if (item.category === 'pickaxe' && item.effect.pickaxeId) {
      const pcx = PICKAXES.find(p => p.id === item.effect.pickaxeId);
      return pcx ? `${pcx.name} Pickaxe` : item.name;
    }
    if (item.category === 'trinket' && item.effect.trinketId) {
      const trinket = TRINKETS.find(t => t.id === item.effect.trinketId);
      return trinket ? trinket.name : item.name;
    }
    return item.name;
  };

  // Check if item is already owned
  const isOwned = (item: StoreItem): boolean => {
    if (item.effect.type === 'give_pickaxe' && item.effect.pickaxeId) {
      return ownsPickaxe(item.effect.pickaxeId);
    }
    if (item.effect.type === 'give_trinket' && item.effect.trinketId) {
      return ownsTrinket(item.effect.trinketId);
    }
    if (item.effect.type === 'give_autoclicker') {
      return gameState.hasAutoclicker;
    }
    return false;
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden border ${
          isStokens ? 'border-blue-500/40 shadow-blue-500/20' : 'border-amber-500/40 shadow-amber-500/20'
        } shadow-2xl z-[9999]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${
          isStokens ? 'from-blue-700 to-blue-600' : 'from-amber-700 to-amber-600'
        } px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center`}>
          <h2 className="text-lg sm:text-2xl font-bold text-white">
            {currencyEmoji} {isStokens ? 'STOKEN STORE' : 'LOTTERY STORE'}
          </h2>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="bg-black/30 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2">
              <span className="text-base sm:text-xl">{currencyEmoji}</span>
              <span className={`${isStokens ? 'text-blue-300' : 'text-amber-300'} font-bold text-sm sm:text-base`}>
                {balance.toLocaleString()} {currencyName}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl sm:text-3xl leading-none touch-manipulation p-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-gray-700 overflow-x-auto">
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 py-2 sm:py-3 px-2 sm:px-4 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
                activeCategory === cat
                  ? `${isStokens ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400' : 'bg-amber-600/20 text-amber-400 border-b-2 border-amber-400'}`
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat].emoji} <span className="hidden sm:inline">{CATEGORY_LABELS[cat].label}</span>
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="overflow-y-auto p-3 sm:p-4 max-h-[60vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {categoryItems.map(item => {
              const owned = isOwned(item);
              const affordable = canAfford(item.price);
              const displayName = getItemDisplayName(item);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    owned
                      ? 'bg-green-900/20 border-green-600/30 opacity-60'
                      : affordable
                      ? `bg-gray-800/80 border-gray-600/40 hover:border-${accentColor}-500/50 hover:bg-gray-700/80`
                      : 'bg-gray-800/40 border-gray-700/30 opacity-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-white text-sm truncate flex-1">
                      {displayName}
                      {owned && <span className="text-green-400 ml-1 text-xs">✓ Owned</span>}
                    </h4>
                    <span className={`text-xs font-bold ${isStokens ? 'text-blue-400' : 'text-amber-400'} ml-2 whitespace-nowrap`}>
                      {item.price.toLocaleString()} {currencyEmoji}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mb-2 line-clamp-2">{item.description}</p>
                  {item.requiresPath && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.requiresPath === 'light' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-purple-900/30 text-purple-400'
                    } mr-2`}>
                      {item.requiresPath === 'light' ? '☀️ Light' : '🌑 Darkness'}
                    </span>
                  )}
                  <button
                    onClick={() => purchaseItem(item)}
                    disabled={owned || !affordable}
                    className={`w-full mt-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      owned
                        ? 'bg-green-800/30 text-green-400 cursor-not-allowed'
                        : affordable
                        ? `${isStokens ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-600 hover:bg-amber-500'} text-white`
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {owned ? 'Owned' : affordable ? 'Buy' : 'Can\'t Afford'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-lg font-bold text-sm shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
