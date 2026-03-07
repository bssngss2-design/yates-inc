'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { PICKAXES, BUILDINGS, PROGRESSIVE_UPGRADES, POWERUPS } from '@/lib/gameData';
import { 
  getPrestigePriceMultiplier, 
  PRESTIGE_UPGRADES,
  MINER_MAX_COUNT,
  getMinerCost,
  DARKNESS_PICKAXE_IDS,
  LIGHT_PICKAXE_IDS,
  YATES_PICKAXE_ID,
  BuildingType,
  ProgressiveUpgradeType,
  PowerupType,
  getProgressiveUpgradeCost,
  getProgressiveUpgradeBonus,
  getStoreItems,
  StoreCurrency,
  StoreItem,
  StoreItemCategory,
  TRINKETS,
} from '@/types/game';

interface GameShopProps {
  onClose: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

type ShopTab = 'pickaxes' | 'miners' | 'buildings' | 'upgrades' | 'powerups' | 'prestige' | 'stokens' | 'lottery';

export default function GameShop({ onClose }: GameShopProps) {
  const { 
    gameState, 
    buyPickaxe, 
    canAffordPickaxe, 
    ownsPickaxe, 
    equipPickaxe,
    currentPickaxe,
    canBuyPickaxeForPath,
    // Prestige store
    buyPrestigeUpgrade,
    ownsPrestigeUpgrade,
    // Miners
    buyMiners,
    // Buildings
    buyBuilding,
    canAffordBuilding,
    getBuildingCostForType,
    // Progressive Upgrades
    buyProgressiveUpgrade,
    getProgressiveUpgradeLevel,
    getProgressiveUpgradeTotalBonus,
    // Powerups
    buyPowerup,
    getPowerupCount,
    usePowerup,
    // Currency stores
    spendStokens,
    addStokens,
    spendLotteryTickets,
    addLotteryTickets,
    giveTrinket,
    ownsTrinket,
    addPrestigeTokens,
    addPrestigeCount,
    skipRocks,
    addMoney,
    addMiners,
  } = useGame();

  const [activeTab, setActiveTab] = useState<ShopTab>('pickaxes');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [minerBuyAmount, setMinerBuyAmount] = useState(1);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => {
      // Only keep the last 1 toast, so max 2 visible at a time
      const recent = prev.slice(-1);
      return [...recent, { id, message, type }];
    });
    
    // Auto-remove after 2 seconds (faster)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  };

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

  const canAccessPrestige = gameState.prestigeCount > 0;

  // Currency store logic
  const [storeCategory, setStoreCategory] = useState<StoreItemCategory>('currency_exchange');
  const [secretTaps, setSecretTaps] = useState(0);
  const [secretUnlocked, setSecretUnlocked] = useState(false);

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
    coupons: { label: 'Lottery+', emoji: '🎟️' },
  };

  const CATEGORY_ORDER: StoreItemCategory[] = [
    'currency_exchange', 'money', 'pickaxe', 'trinket', 'building',
    'prestige_tokens', 'prestige', 'boost', 'miners', 'autoclicker',
    'rock_skip', 'achievement', 'coupons',
  ];

  const currentStoreCurrency: StoreCurrency = activeTab === 'stokens' ? 'stokens' : 'lottery_tickets';
  const isStoreTab = activeTab === 'stokens' || activeTab === 'lottery';
  const isStokens = activeTab === 'stokens';
  const storeBalance = isStokens ? gameState.stokens : gameState.lotteryTickets;
  const storeCurrencyName = isStokens ? 'Stokens' : 'Tickets';
  const storeCurrencyEmoji = isStokens ? '💎' : '🎟️';

  const storeItems = useMemo(() => isStoreTab ? getStoreItems(currentStoreCurrency) : [], [isStoreTab, currentStoreCurrency]);
  
  const storeCategoryItems = useMemo(() => {
    return storeItems.filter(item => item.category === storeCategory);
  }, [storeItems, storeCategory]);

  const storeAvailableCategories = useMemo(() => {
    const cats = new Set(storeItems.map(i => i.category));
    // Hide the 'coupons' (Lottery+) tab unless secret is unlocked
    return CATEGORY_ORDER.filter(c => cats.has(c) && (c !== 'coupons' || secretUnlocked));
  }, [storeItems, secretUnlocked]);

  const canAffordStore = useCallback((price: number) => storeBalance >= price, [storeBalance]);

  const spendStore = useCallback((amount: number): boolean => {
    return isStokens ? spendStokens(amount) : spendLotteryTickets(amount);
  }, [isStokens, spendStokens, spendLotteryTickets]);

  const getStoreItemDisplayName = useCallback((item: StoreItem): string => {
    if (item.category === 'pickaxe' && item.effect.pickaxeId) {
      const pcx = PICKAXES.find(p => p.id === item.effect.pickaxeId);
      return pcx ? `${pcx.name} Pickaxe` : item.name;
    }
    if (item.category === 'trinket' && item.effect.trinketId) {
      const trinket = TRINKETS.find(t => t.id === item.effect.trinketId);
      return trinket ? trinket.name : item.name;
    }
    return item.name;
  }, []);

  const isStoreItemOwned = useCallback((item: StoreItem): boolean => {
    if (item.effect.type === 'give_pickaxe' && item.effect.pickaxeId) {
      return ownsPickaxe(item.effect.pickaxeId);
    }
    if (item.effect.type === 'give_trinket' && item.effect.trinketId) {
      return ownsTrinket(item.effect.trinketId);
    }
    if (item.effect.type === 'give_autoclicker') {
      return gameState.hasAutoclicker;
    }
    if (item.effect.type === 'give_building' && item.effect.buildingType) {
      const bt = item.effect.buildingType;
      if (bt === 'bank') return gameState.buildings.bank.owned;
      if (bt === 'temple') return gameState.buildings.temple.owned;
      if (bt === 'wizard_tower') return gameState.buildings.wizard_tower.owned;
    }
    return false;
  }, [ownsPickaxe, ownsTrinket, gameState.hasAutoclicker, gameState.buildings]);

  const purchaseStoreItem = useCallback((item: StoreItem) => {
    if (!canAffordStore(item.price)) {
      showToast(`Not enough ${storeCurrencyName}!`, 'error');
      return;
    }
    if (item.oneTimePurchase && item.effect.type === 'give_autoclicker' && gameState.hasAutoclicker) {
      showToast('Already own the autoclicker!', 'error');
      return;
    }
    if (item.requiresPath && gameState.chosenPath !== item.requiresPath) {
      showToast(`Requires ${item.requiresPath} path!`, 'error');
      return;
    }

    const eff = item.effect;
    switch (eff.type) {
      case 'give_currency': {
        if (!spendStore(item.price)) return;
        if (eff.targetCurrency === 'stokens') addStokens(eff.amount || 1);
        else addLotteryTickets(eff.amount || 100);
        showToast(`Exchanged for ${eff.amount} ${eff.targetCurrency === 'stokens' ? 'Stokens' : 'Tickets'}!`, 'success');
        break;
      }
      case 'give_pickaxe': {
        if (eff.pickaxeId && ownsPickaxe(eff.pickaxeId)) { showToast('Already own this pickaxe!', 'error'); return; }
        if (!spendStore(item.price)) return;
        if (eff.pickaxeId) buyPickaxe(eff.pickaxeId);
        showToast(`Bought pickaxe!`, 'success');
        break;
      }
      case 'give_trinket': {
        if (eff.trinketId && ownsTrinket(eff.trinketId)) { showToast('Already own this trinket!', 'error'); return; }
        if (!spendStore(item.price)) return;
        if (eff.trinketId) giveTrinket(eff.trinketId);
        showToast(`Got ${eff.trinketId?.replace(/_/g, ' ')}!`, 'success');
        break;
      }
      case 'give_building': {
        if (eff.buildingType) {
          const bt = eff.buildingType;
          // Check if already owned for max-1 buildings
          if ((bt === 'bank' && gameState.buildings.bank.owned) ||
              (bt === 'temple' && gameState.buildings.temple.owned) ||
              (bt === 'wizard_tower' && gameState.buildings.wizard_tower.owned)) {
            showToast(`Already own ${item.name}!`, 'error');
            return;
          }
          if (!spendStore(item.price)) return;
          buyBuilding(bt as 'mine' | 'bank' | 'factory' | 'temple' | 'wizard_tower' | 'shipment');
        }
        showToast(`Built a ${item.name}!`, 'success');
        break;
      }
      case 'give_prestige_tokens': {
        if (!spendStore(item.price)) return;
        addPrestigeTokens(eff.amount || 1);
        showToast(`+${eff.amount} Prestige Token${(eff.amount || 1) > 1 ? 's' : ''}!`, 'success');
        break;
      }
      case 'give_prestige': {
        if (!spendStore(item.price)) return;
        addPrestigeCount(eff.amount || 1);
        showToast(`+${eff.amount || 1} Prestige! (no reset)`, 'success');
        break;
      }
      case 'give_money': {
        if (!spendStore(item.price)) return;
        addMoney(eff.amount || 0);
        showToast(`+${formatNumber(eff.amount || 0)}!`, 'success');
        break;
      }
      case 'give_boost': {
        if (!spendStore(item.price)) return;
        showToast(`${item.name} activated!`, 'success');
        break;
      }
      case 'give_miners': {
        const currentMiners = gameState.minerCount;
        const toAdd = Math.min(eff.amount || 1, MINER_MAX_COUNT - currentMiners);
        if (toAdd <= 0) { showToast('Already at max miners!', 'error'); return; }
        if (!spendStore(item.price)) return;
        addMiners(toAdd);
        showToast(`+${toAdd} miner${toAdd > 1 ? 's' : ''}!`, 'success');
        break;
      }
      case 'give_autoclicker': {
        if (gameState.hasAutoclicker) { showToast('Already own the autoclicker!', 'error'); return; }
        if (!spendStore(item.price)) return;
        addMoney(0);
        showToast('Autoclicker purchased!', 'success');
        break;
      }
      case 'give_rock_skip': {
        if (!spendStore(item.price)) return;
        skipRocks(eff.amount || 1);
        showToast(`Skipped ${eff.amount === -1 ? 'to max' : `+${eff.amount}`} rock!`, 'success');
        break;
      }
      case 'give_achievement': {
        if (!spendStore(item.price)) return;
        showToast('Achievement unlocked!', 'success');
        break;
      }
      case 'give_coupons': {
        if (!spendStore(item.price)) return;
        // Coupons are now lottery tickets — convert instantly
        addLotteryTickets(eff.amount || 0);
        showToast(`+${eff.amount} Lottery Tickets!`, 'success');
        break;
      }
    }
  }, [canAffordStore, spendStore, storeCurrencyName, showToast, gameState, ownsPickaxe, ownsTrinket, buyPickaxe, giveTrinket, buyBuilding, addPrestigeTokens, addMoney, addMiners, addStokens, addLotteryTickets, isStokens, formatNumber]);

  const handleBuyMiners = () => {
    const bought = buyMiners(minerBuyAmount);
    if (bought > 0) {
      showToast(`⛏️ Hired ${bought} miner${bought > 1 ? 's' : ''}!`, 'success');
    }
  };

  // Check if pickaxe should be visible based on path
  const shouldShowPickaxe = (pickaxeId: number): boolean => {
    // Always show owned pickaxes (so user can equip them, including Yates from Golden Cookie)
    if (gameState.ownedPickaxeIds.includes(pickaxeId)) return true;
    
    // Never show Yates pickaxe in shop for purchase (Golden Cookie only)
    if (pickaxeId === YATES_PICKAXE_ID) return false;
    
    // If no path chosen, don't show path-restricted pickaxes
    if (!gameState.chosenPath) {
      if (DARKNESS_PICKAXE_IDS.includes(pickaxeId)) return false;
      if (LIGHT_PICKAXE_IDS.includes(pickaxeId)) return false;
    }
    
    // If Darkness path, don't show Light pickaxes
    if (gameState.chosenPath === 'darkness' && LIGHT_PICKAXE_IDS.includes(pickaxeId)) return false;
    
    // If Light path, don't show Darkness pickaxes
    if (gameState.chosenPath === 'light' && DARKNESS_PICKAXE_IDS.includes(pickaxeId)) return false;
    
    return true;
  };

  // Get path restriction label for pickaxe
  const getPathLabel = (pickaxeId: number): string | null => {
    if (DARKNESS_PICKAXE_IDS.includes(pickaxeId)) return '🌑 Darkness';
    if (LIGHT_PICKAXE_IDS.includes(pickaxeId)) return '☀️ Light';
    return null;
  };

  // Calculate total cost to buy X miners
  const calculateMinersCost = (count: number): number => {
    let total = 0;
    for (let i = 0; i < count; i++) {
      if (gameState.minerCount + i >= MINER_MAX_COUNT) break;
      total += getMinerCost(gameState.minerCount + i, gameState.prestigeCount);
    }
    return total;
  };

  const minersCost = calculateMinersCost(minerBuyAmount);
  const canAffordMiners = gameState.yatesDollars >= minersCost && gameState.minerCount < MINER_MAX_COUNT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Shop Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden border border-amber-600/30 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-600 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-2xl font-bold text-white">🛒 SHOP</h2>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="bg-black/30 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2">
              <span className="text-base sm:text-xl">💰</span>
              <span className="text-yellow-300 font-bold text-sm sm:text-base">${formatNumber(gameState.yatesDollars)}</span>
            </div>
            {canAccessPrestige && (
              <div className="bg-black/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1">
                <span className="text-sm sm:text-base">🪙</span>
                <span className="text-purple-300 font-bold text-xs sm:text-sm">{gameState.prestigeTokens}</span>
              </div>
            )}
            {gameState.stokens > 0 && (
              <div className="bg-black/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1">
                <span className="text-sm sm:text-base">💎</span>
                <span className="text-blue-300 font-bold text-xs sm:text-sm">{gameState.stokens}</span>
              </div>
            )}
            {gameState.lotteryTickets > 0 && (
              <div className="bg-black/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1">
                <span className="text-sm sm:text-base">🎟️</span>
                <span className="text-amber-300 font-bold text-xs sm:text-sm">{gameState.lotteryTickets}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl sm:text-3xl leading-none touch-manipulation p-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pickaxes')}
            className={`flex-1 min-w-[60px] py-2 sm:py-3 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
              activeTab === 'pickaxes'
                ? 'bg-amber-600/20 text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            ⛏️ <span className="hidden sm:inline">Pickaxes</span>
          </button>
          <button
            onClick={() => setActiveTab('miners')}
            className={`flex-1 min-w-[60px] py-2 sm:py-3 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
              activeTab === 'miners'
                ? 'bg-orange-600/20 text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            👷 <span className="hidden sm:inline">Miners</span>
          </button>
          <button
            onClick={() => setActiveTab('buildings')}
            className={`flex-1 min-w-[60px] py-2 sm:py-3 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
              activeTab === 'buildings'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🏗️ <span className="hidden sm:inline">Buildings</span>
          </button>
          <button
            onClick={() => setActiveTab('upgrades')}
            className={`flex-1 min-w-[60px] py-2 sm:py-3 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
              activeTab === 'upgrades'
                ? 'bg-green-600/20 text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            📈 <span className="hidden sm:inline">Upgrades</span>
          </button>
          <button
            onClick={() => setActiveTab('powerups')}
            className={`flex-1 min-w-[60px] py-2 sm:py-3 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
              activeTab === 'powerups'
                ? 'bg-pink-600/20 text-pink-400 border-b-2 border-pink-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            ⚡ <span className="hidden sm:inline">Powerups</span>
          </button>
          <button
            onClick={() => setActiveTab('prestige')}
            disabled={!canAccessPrestige}
            className={`flex-1 min-w-[60px] py-2 sm:py-3 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
              activeTab === 'prestige'
                ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-400'
                : canAccessPrestige
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            {canAccessPrestige ? '🌟' : '🔒'} <span className="hidden sm:inline">{canAccessPrestige ? 'Prestige' : 'P1+'}</span>
          </button>
          {gameState.stokens > 0 && (
            <button
              onClick={() => { setActiveTab('stokens'); setStoreCategory('currency_exchange'); }}
              className={`flex-1 min-w-[60px] py-2 sm:py-3 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
                activeTab === 'stokens'
                  ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              💎 <span className="hidden sm:inline">Stokens</span>
              <span className="text-blue-300 text-[10px] ml-0.5">({gameState.stokens})</span>
            </button>
          )}
          {gameState.isHardMode && (
            <button
              onClick={() => { setActiveTab('lottery'); setStoreCategory('currency_exchange'); }}
              className={`flex-1 min-w-[60px] py-2 sm:py-3 font-bold transition-colors text-xs sm:text-sm touch-manipulation ${
                activeTab === 'lottery'
                  ? 'bg-amber-600/20 text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              🎟️ <span className="hidden sm:inline">Lottery</span>
              <span className="text-amber-300 text-[10px] ml-0.5">({gameState.lotteryTickets})</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[70vh] sm:max-h-[60vh]">
          {/* PICKAXES TAB — Compact list rows */}
          {activeTab === 'pickaxes' && (
            <div className="space-y-1.5">
              {PICKAXES.filter(p => shouldShowPickaxe(p.id)).map((pickaxe) => {
                const owned = ownsPickaxe(pickaxe.id);
                const equipped = currentPickaxe.id === pickaxe.id;
                const canAfford = canAffordPickaxe(pickaxe.id);
                const pathLabel = getPathLabel(pickaxe.id);
                const canBuyForPath = canBuyPickaxeForPath(pickaxe.id);
                const scaledPrice = Math.floor(pickaxe.price * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode));
                
                const regularOwnedIds = gameState.ownedPickaxeIds.filter(id => id !== YATES_PICKAXE_ID);
                const highestOwnedId = regularOwnedIds.length > 0 ? Math.max(...regularOwnedIds) : 0;
                const skippedIds = new Set<number>([YATES_PICKAXE_ID]);
                if (gameState.chosenPath === 'darkness') {
                  LIGHT_PICKAXE_IDS.forEach(id => skippedIds.add(id));
                } else if (gameState.chosenPath === 'light') {
                  DARKNESS_PICKAXE_IDS.forEach(id => skippedIds.add(id));
                } else {
                  LIGHT_PICKAXE_IDS.forEach(id => skippedIds.add(id));
                  DARKNESS_PICKAXE_IDS.forEach(id => skippedIds.add(id));
                }
                let effectiveNextId = highestOwnedId + 1;
                while (skippedIds.has(effectiveNextId) && effectiveNextId <= 30) effectiveNextId++;
                
                const isNextInSequence = pickaxe.id === effectiveNextId;
                const isLocked = !owned && !skippedIds.has(pickaxe.id) && pickaxe.id > effectiveNextId;
                const isPathLocked = !canBuyForPath && !owned;
                const canPurchase = !owned && isNextInSequence && canAfford && canBuyForPath;

                return (
                  <div
                    key={pickaxe.id}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg border transition-all ${
                      equipped
                        ? 'bg-amber-600/20 border-amber-400/50'
                        : owned
                          ? 'bg-green-600/10 border-green-600/20'
                          : isLocked || isPathLocked
                            ? 'bg-gray-900/30 border-gray-800/30 opacity-40'
                            : isNextInSequence
                              ? 'bg-amber-900/20 border-amber-600/40 hover:border-amber-500/50'
                              : 'bg-gray-800/30 border-gray-700/30'
                    }`}
                  >
                    {/* Pickaxe Icon */}
                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 ${(isLocked || isPathLocked) && !owned ? 'grayscale opacity-50' : ''}`}>
                      <Image src={pickaxe.image} alt={pickaxe.name} fill className="object-contain" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-bold text-xs sm:text-sm truncate">{pickaxe.name}</span>
                        {equipped && <span className="text-[9px] bg-amber-500 text-black font-bold px-1 py-0.5 rounded">EQUIPPED</span>}
                        {isNextInSequence && !owned && !pathLabel && <span className="text-[9px] bg-green-500 text-black font-bold px-1 py-0.5 rounded">NEXT</span>}
                        {pathLabel && !owned && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                            pathLabel.includes('Darkness') ? 'bg-purple-600 text-white' : 'bg-yellow-500 text-black'
                          }`}>{pathLabel}</span>
                        )}
                      </div>
                      <div className="text-gray-400 text-[10px] sm:text-xs flex items-center gap-2">
                        <span>+{formatNumber(pickaxe.clickPower)} power</span>
                        {pickaxe.specialAbility && (
                          <span className="text-purple-400 truncate">✨ {pickaxe.specialAbility}</span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      {owned ? (
                        equipped ? (
                          <span className="text-amber-400 text-[10px] sm:text-xs font-medium">Using</span>
                        ) : (
                          <button
                            onClick={() => equipPickaxe(pickaxe.id)}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-lg text-[10px] sm:text-xs transition-colors touch-manipulation"
                          >
                            Equip
                          </button>
                        )
                      ) : isPathLocked ? (
                        <span className="text-gray-500 text-sm">🚫</span>
                      ) : isLocked ? (
                        <span className="text-gray-500 text-sm">🔒</span>
                      ) : (
                        <button
                          onClick={() => buyPickaxe(pickaxe.id)}
                          disabled={!canPurchase}
                          className={`font-bold py-1 px-3 rounded-lg text-[10px] sm:text-xs transition-colors touch-manipulation ${
                            canPurchase
                              ? 'bg-amber-600 hover:bg-amber-500 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {scaledPrice === 0 ? 'FREE' : `$${formatNumber(scaledPrice)}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MINERS TAB — Compact */}
          {activeTab === 'miners' && (
            <div className="space-y-3">
              {/* Current Miners Display — compact */}
              <div className="bg-orange-900/20 border border-orange-600/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👷</span>
                  <div>
                    <span className="text-lg font-bold text-orange-400">{gameState.minerCount} / {MINER_MAX_COUNT}</span>
                    <span className="text-gray-400 text-xs ml-2">Miners Hired</span>
                  </div>
                </div>
                {gameState.minerCount > 0 && (
                  <span className="text-orange-300 text-xs">⛏️ {formatNumber(Math.ceil(gameState.minerCount * 10))} dmg/s</span>
                )}
              </div>

              {/* Bulk Buy Section */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                <h3 className="text-white font-bold text-sm mb-3 text-center">Hire Miners</h3>
                
                {/* Amount Selector */}
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, Math.min(100, MINER_MAX_COUNT - gameState.minerCount))}
                    value={minerBuyAmount}
                    onChange={(e) => setMinerBuyAmount(Number(e.target.value))}
                    disabled={gameState.minerCount >= MINER_MAX_COUNT}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <input
                    type="number"
                    min={1}
                    max={MINER_MAX_COUNT - gameState.minerCount}
                    value={minerBuyAmount}
                    onChange={(e) => setMinerBuyAmount(Math.max(1, Math.min(MINER_MAX_COUNT - gameState.minerCount, Number(e.target.value))))}
                    disabled={gameState.minerCount >= MINER_MAX_COUNT}
                    className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-center"
                  />
                </div>

                {/* Quick Select */}
                <div className="flex gap-2 mb-4">
                  {[1, 5, 10, 25, 50, 100].map(n => (
                    <button
                      key={n}
                      onClick={() => setMinerBuyAmount(Math.min(n, MINER_MAX_COUNT - gameState.minerCount))}
                      disabled={gameState.minerCount >= MINER_MAX_COUNT}
                      className="flex-1 px-2 py-1 text-xs rounded bg-orange-900/30 hover:bg-orange-800/50 text-orange-300 transition-colors"
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {/* Cost Display */}
                <div className="flex justify-between items-center mb-4 p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-gray-400">Total Cost:</span>
                  <span className={`font-bold ${canAffordMiners ? 'text-green-400' : 'text-red-400'}`}>
                    ${formatNumber(minersCost)}
                  </span>
                </div>

                {/* Buy Button */}
                <button
                  onClick={handleBuyMiners}
                  disabled={!canAffordMiners}
                  className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                    canAffordMiners
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {gameState.minerCount >= MINER_MAX_COUNT 
                    ? 'MAX MINERS' 
                    : `Hire ${minerBuyAmount} Miner${minerBuyAmount > 1 ? 's' : ''}`
                  }
                </button>
              </div>

              {/* Info */}
              <div className="text-center text-gray-500 text-sm">
                Miners automatically mine rocks and earn you money!
              </div>
            </div>
          )}

          {/* BUILDINGS TAB — Compact list rows */}
          {activeTab === 'buildings' && (
            <div className="space-y-1.5">
              {BUILDINGS.filter(building => {
                if (building.id === 'shipment') return false;
                if (building.pathRestriction === null) return true;
                if (!gameState.chosenPath) return false;
                return building.pathRestriction === gameState.chosenPath;
              }).map(building => {
                const count = building.id === 'bank' 
                  ? (gameState.buildings.bank.owned ? 1 : 0)
                  : building.id === 'temple'
                    ? (gameState.buildings.temple.owned ? 1 : 0)
                    : building.id === 'wizard_tower'
                      ? (gameState.buildings.wizard_tower.owned ? 1 : 0)
                      : building.id === 'mine'
                        ? gameState.buildings.mine.count
                        : building.id === 'factory'
                          ? gameState.buildings.factory.count
                          : gameState.buildings.shipment.count;
                
                const cost = getBuildingCostForType(building.id);
                const canAfford = canAffordBuilding(building.id);
                const isMaxed = building.maxCount !== -1 && count >= building.maxCount;
                const pathLabel = building.pathRestriction === 'light' ? '☀️ Light' : building.pathRestriction === 'darkness' ? '🌑 Darkness' : null;

                return (
                  <div
                    key={building.id}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg border transition-all ${
                      isMaxed
                        ? 'bg-green-600/10 border-green-600/20'
                        : canAfford
                          ? 'bg-blue-900/20 border-blue-600/30 hover:border-blue-500/50'
                          : 'bg-gray-800/30 border-gray-700/30'
                    }`}
                  >
                    {/* Building Icon */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      <Image 
                        src={`/game/buildings/${building.id}.png`}
                        alt={building.name}
                        width={48}
                        height={48}
                        className="object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-xs sm:text-sm">{building.name}</span>
                        <span className="text-blue-400 text-[10px] sm:text-xs">×{count}{building.maxCount !== -1 ? `/${building.maxCount}` : ''}</span>
                        {pathLabel && <span className="text-[9px] bg-black/50 px-1 py-0.5 rounded">{pathLabel}</span>}
                      </div>
                      <p className="text-gray-400 text-[10px] sm:text-xs truncate">{building.description}</p>
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      {isMaxed ? (
                        <span className="text-green-400 text-[10px] sm:text-xs font-bold">✓ MAX</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (buyBuilding(building.id)) {
                              showToast(`🏗️ Built ${building.name}!`, 'success');
                            }
                          }}
                          disabled={!canAfford}
                          className={`font-bold py-1 px-3 rounded-lg text-[10px] sm:text-xs transition-all touch-manipulation ${
                            canAfford
                              ? 'bg-blue-600 hover:bg-blue-500 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {building.id === 'bank' ? `${Math.round((cost / gameState.yatesDollars) * 100)}%` : `$${formatNumber(cost)}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* UPGRADES TAB */}
          {activeTab === 'upgrades' && (
            <div className="space-y-3">

              {/* Upgrades Grid */}
              <div className="space-y-3">
                {PROGRESSIVE_UPGRADES.map(upgrade => {
                  const currentLevel = getProgressiveUpgradeLevel(upgrade.id);
                  const isMaxed = currentLevel >= upgrade.maxLevel;
                  const cost = getProgressiveUpgradeCost(upgrade, currentLevel);
                  const canAfford = gameState.yatesDollars >= cost;
                  const currentBonus = getProgressiveUpgradeTotalBonus(upgrade.id);
                  const nextBonus = getProgressiveUpgradeBonus(upgrade, currentLevel + 1);

                  return (
                    <div
                      key={upgrade.id}
                      className={`rounded-xl p-4 border transition-all ${
                        isMaxed
                          ? 'bg-green-600/10 border-green-600/30'
                          : canAfford
                            ? 'bg-green-900/20 border-green-600/50 hover:border-green-500'
                            : 'bg-gray-800/50 border-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-xl">
                            {upgrade.icon}
                          </div>
                          <div>
                            <h4 className="text-white font-bold">{upgrade.name}</h4>
                            <div className="text-xs text-gray-400">
                              Level: <span className="text-green-400">{currentLevel}</span>
                              <span className="text-gray-500">/{upgrade.maxLevel}</span>
                              {' | '}
                              Current: <span className="text-green-400">+{(currentBonus * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        {!isMaxed && (
                          <button
                            onClick={() => {
                              if (buyProgressiveUpgrade(upgrade.id)) {
                                showToast(`📈 ${upgrade.name} upgraded!`, 'success');
                              }
                            }}
                            disabled={!canAfford}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                              canAfford
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            ${formatNumber(cost)}
                          </button>
                        )}

                        {isMaxed && (
                          <div className="px-4 py-2 rounded-lg bg-green-600/20 text-green-400 font-bold text-sm">
                            MAX
                          </div>
                        )}
                      </div>

                      {!isMaxed && (
                        <div className="mt-2 text-xs text-gray-500">
                          Next level: +{(nextBonus * 100).toFixed(1)}% {upgrade.description.toLowerCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* POWERUPS TAB — Compact list rows */}
          {activeTab === 'powerups' && (
            <div className="space-y-1.5">
              {POWERUPS.map(powerup => {
                const count = getPowerupCount(powerup.id);
                const dynamicCostIds = ['goldenTouch', 'miningFrenzy', 'buildingBoost'];
                const isDynamicCost = dynamicCostIds.includes(powerup.id);
                const cost = isDynamicCost 
                  ? Math.floor(gameState.yatesDollars * 0.80) 
                  : powerup.cost;
                const canAfford = isDynamicCost 
                  ? gameState.yatesDollars >= 1000 
                  : gameState.yatesDollars >= cost;

                return (
                  <div
                    key={powerup.id}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg border transition-all ${
                      canAfford
                        ? 'bg-pink-900/20 border-pink-600/30 hover:border-pink-500/50'
                        : 'bg-gray-800/30 border-gray-700/30'
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gray-700 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                      {powerup.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-xs sm:text-sm">{powerup.name}</span>
                        {count > 0 && <span className="text-pink-400 text-[10px] sm:text-xs">×{count}</span>}
                      </div>
                      <p className="text-gray-400 text-[10px] sm:text-xs truncate">{powerup.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      {count > 0 && (
                        <button
                          onClick={() => {
                            if (usePowerup(powerup.id)) {
                              showToast(`⚡ ${powerup.name} activated!`, 'success');
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] sm:text-xs transition-all touch-manipulation"
                        >
                          USE
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (buyPowerup(powerup.id)) {
                            showToast(`⚡ Bought ${powerup.name}!`, 'success');
                          }
                        }}
                        disabled={!canAfford}
                        className={`font-bold py-1 px-3 rounded-lg text-[10px] sm:text-xs transition-all touch-manipulation ${
                          canAfford
                            ? 'bg-pink-600 hover:bg-pink-500 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isDynamicCost ? `80% ($${formatNumber(cost)})` : `$${formatNumber(cost)}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PRESTIGE STORE TAB */}
          {activeTab === 'prestige' && canAccessPrestige && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="bg-purple-900/20 border border-purple-600/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">🪙</span>
                  <span className="text-2xl font-bold text-purple-400">{gameState.prestigeTokens}</span>
                  <span className="text-gray-400">tokens</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Prestige Level: {gameState.prestigeCount} • Multiplier: {gameState.prestigeMultiplier.toFixed(1)}x
                </p>
              </div>

              {/* Upgrades Grid */}
              <div className="space-y-3">
                {[...PRESTIGE_UPGRADES].sort((a, b) => a.cost - b.cost).map(upgrade => {
                  const owned = ownsPrestigeUpgrade(upgrade.id);
                  const canAfford = gameState.prestigeTokens >= upgrade.cost;
                  
                  return (
                    <div
                      key={upgrade.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        owned 
                          ? 'border-green-500 bg-green-500/10' 
                          : canAfford
                            ? 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/20'
                            : 'border-gray-600 bg-gray-700/30 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-bold flex items-center gap-2">
                            {upgrade.id === 'dual_trinkets' && '💎'}
                            {upgrade.id === 'coupon_boost' && '🎟️'}
                            {upgrade.id === 'miner_speed_1' && '⛏️'}
                            {upgrade.id === 'miner_speed_2' && '⛏️'}
                            {upgrade.id === 'pcx_damage' && '💥'}
                            {upgrade.id === 'money_boost' && '💰'}
                            {upgrade.id === 'miner_sprint' && '🏃'}
                            {upgrade.id === 'money_printer' && '🖨️'}
                            {upgrade.id === 'rapid_clicker' && '👆'}
                            {upgrade.id === 'heavy_hitter' && '🔨'}
                            {upgrade.id === 'relic_hunter' && '🔮'}
                            {upgrade.id === 'mega_boost' && '🚀'}
                            {upgrade.id === 'miner_damage_1' && '💪'}
                            {upgrade.id === 'miner_damage_2' && '💪'}
                            {upgrade.id === 'coupon_master' && '🎰'}
                            {upgrade.id === 'supreme_clicker' && '⚡'}
                            {upgrade.id === 'rock_crusher' && '🪨'}
                            {upgrade.id === 'miner_overdrive' && '🔥'}
                            {upgrade.id === 'gold_rush' && '🤑'}
                            {upgrade.id === 'ultimate_miner' && '👷'}
                            {upgrade.id === 'trinket_amplifier' && '✨'}
                            {upgrade.id === 'yates_blessing' && '🙏'}
                            {upgrade.id === 'title_master' && '👑'}
                            {upgrade.name}
                          </h3>
                          <p className="text-gray-400 text-sm">{upgrade.description}</p>
                        </div>
                        
                        <div className="text-right ml-4">
                          {owned ? (
                            <span className="text-green-400 font-bold">✓ Owned</span>
                          ) : (
                            <button
                              onClick={() => buyPrestigeUpgrade(upgrade.id)}
                              disabled={!canAfford}
                              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              🪙 {upgrade.cost}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Info */}
              <div className="p-3 rounded-lg bg-gray-700/50 text-center">
                <p className="text-gray-400 text-sm">
                  Earn 2 prestige tokens every time you prestige!
                </p>
              </div>
            </div>
          )}

          {/* STOKENS / LOTTERY TAB */}
          {isStoreTab && (
            <div className="space-y-3">
              {/* Store balance banner — tap 5 times to unlock secret tab */}
              <div 
                className={`rounded-xl p-3 text-center border cursor-default select-none ${
                  isStokens ? 'bg-blue-900/20 border-blue-500/30' : 'bg-amber-900/20 border-amber-500/30'
                }`}
                onClick={() => {
                  if (secretUnlocked) return;
                  const next = secretTaps + 1;
                  setSecretTaps(next);
                  if (next >= 5) {
                    setSecretUnlocked(true);
                    setStoreCategory('coupons');
                    showToast('🤫 Secret tab unlocked...', 'success');
                  }
                }}
              >
                <span className="text-2xl mr-2">{storeCurrencyEmoji}</span>
                <span className={`text-2xl font-bold ${isStokens ? 'text-blue-400' : 'text-amber-400'}`}>
                  {storeBalance.toLocaleString()}
                </span>
                <span className="text-gray-400 ml-2">{storeCurrencyName}</span>
              </div>

              {/* Store category sub-tabs */}
              <div className="flex border-b border-gray-700 overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
                {storeAvailableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setStoreCategory(cat)}
                    className={`flex-shrink-0 py-1.5 sm:py-2 px-2 sm:px-3 font-bold transition-colors text-[10px] sm:text-xs touch-manipulation ${
                      storeCategory === cat
                        ? `${isStokens ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400' : 'bg-amber-600/20 text-amber-400 border-b-2 border-amber-400'}`
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {CATEGORY_LABELS[cat].emoji} <span className="hidden sm:inline">{CATEGORY_LABELS[cat].label}</span>
                  </button>
                ))}
              </div>

              {/* Store items — compact rows */}
              <div className="space-y-1.5">
                {storeCategoryItems.map(item => {
                  const owned = isStoreItemOwned(item);
                  const affordable = canAffordStore(item.price);
                  const displayName = getStoreItemDisplayName(item);

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg border transition-all ${
                        owned
                          ? 'bg-green-900/15 border-green-600/20 opacity-50'
                          : affordable
                          ? `bg-gray-800/50 border-gray-600/30 ${isStokens ? 'hover:border-blue-500/50' : 'hover:border-amber-500/50'}`
                          : 'bg-gray-800/30 border-gray-700/20 opacity-40'
                      }`}
                    >
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold text-xs sm:text-sm truncate">{displayName}</span>
                          {owned && <span className="text-green-400 text-[9px] font-bold">✓</span>}
                          {item.requiresPath && (
                            <span className={`text-[9px] px-1 py-0.5 rounded ${
                              item.requiresPath === 'light' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-purple-900/30 text-purple-400'
                            }`}>
                              {item.requiresPath === 'light' ? '☀️' : '🌑'}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-[10px] sm:text-xs truncate">{item.description}</p>
                      </div>

                      {/* Price + Action */}
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        <span className={`text-[10px] sm:text-xs font-bold ${isStokens ? 'text-blue-400' : 'text-amber-400'} whitespace-nowrap`}>
                          {item.price.toLocaleString()} {storeCurrencyEmoji}
                        </span>
                        <button
                          onClick={() => purchaseStoreItem(item)}
                          disabled={owned || !affordable}
                          className={`font-bold py-1 px-2.5 rounded-lg text-[10px] sm:text-xs transition-all touch-manipulation ${
                            owned
                              ? 'bg-green-800/30 text-green-400 cursor-not-allowed'
                              : affordable
                              ? `${isStokens ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-600 hover:bg-amber-500'} text-white`
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {owned ? '✓' : 'Buy'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none px-4 max-w-[90vw]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-2xl font-bold text-center animate-toast-in text-xs sm:text-base ${
              toast.type === 'success'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border border-green-400/30'
                : 'bg-gradient-to-r from-red-600 to-rose-600 text-white border border-red-400/30'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Toast Animation */}
      <style jsx>{`
        @keyframes toast-in {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          10% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          90% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
        }
        .animate-toast-in {
          animation: toast-in 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
