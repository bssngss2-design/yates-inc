'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { 
  GameState, COUPON_DROP_RATES, COUPON_REQUIREMENTS, ShopStock, 
  SHOP_RESTOCK_INTERVAL, SHOP_MIN_ITEMS, SHOP_MAX_ITEMS, SHOP_MIN_QUANTITY, SHOP_MAX_QUANTITY, 
  AUTOCLICKER_COST, PRESTIGE_REQUIREMENTS, YATES_ACCOUNT_ID, getPrestigeRockRequirement, getPrestigePickaxeRequirement, MAX_PRESTIGE_WITH_BUFFS,
  TRINKETS, Trinket, TRINKET_SHOP_REFRESH_INTERVAL, TRINKET_SHOP_MIN_ITEMS, TRINKET_SHOP_MAX_ITEMS,
  MINER_TICK_INTERVAL, MINER_BASE_DAMAGE, MINER_MAX_COUNT, getMinerCost, getPrestigePriceMultiplier,
  PRESTIGE_UPGRADES, PrestigeUpgrade, PRESTIGE_TOKENS_PER_PRESTIGE, RARITY_COLORS,
  RELIC_CONVERSION_COSTS, TALISMAN_CONVERSION_COSTS, RELIC_MULTIPLIERS, TALISMAN_MULTIPLIERS,
  YATES_TOTEM_RELIC_EFFECTS, YATES_TOTEM_TALISMAN_EFFECTS,
  ACHIEVEMENTS, shouldUnlockAchievement, TITLES,
  // Path system
  GamePath, SacrificeBuff, SACRIFICE_BUFF_TIERS,
  DARKNESS_PICKAXE_IDS, LIGHT_PICKAXE_IDS, YATES_PICKAXE_ID,
  SIDE_LEVEL_MAX, getDarkSideLevelRequirements, getLightSideLevelRequirements, rollSideLevelBuff, getSideLevelBankInterestRate,
  // Shady Sam
  ShadySamSwap, ShadySamStat, getShadySamSwapCost,
  // Rock health scaling
  getScaledRockHP,
  // Building system
  BuildingType, Building, ActiveBuff, ActiveDebuff, 
  ProgressiveUpgradeType, PowerupType, Powerup,
  BUILDINGS, PROGRESSIVE_UPGRADES, POWERUPS,
  getDefaultBuildingStates, getDefaultProgressiveUpgradeState, getDefaultPowerupInventory,
  getBuildingCost, canBuyBuilding, getBuildingCount,
  MINE_MINER_EQUIVALENTS_PER_MINE, MINE_TICK_INTERVAL as MINE_PASSIVE_TICK_INTERVAL,
  FACTORY_BONUS_MINERS, generateFactoryBuff, getNextFactoryBuffTime,
  FACTORY_BUFF_MIN_INTERVAL, FACTORY_BUFF_MAX_INTERVAL, FACTORY_BUFF_REDUCTION_PER_FACTORY,
  BANK_BASE_INTEREST_RATE, BANK_TIME_MULTIPLIER, calculateBankInterest,
  LOAN_MAX_AMOUNT, LOAN_DAILY_INTEREST_RATE, LOAN_OPEN_TAB_BONUS_RATE, LOAN_AUTO_REPAY_THRESHOLD,
  BANK_TIERS, BANK_MAX_TIER, getBankDepositCap, getBankTierForAmount,
  TEMPLE_MINER_MONEY_MULTIPLIER, TEMPLE_BUFF_INTERVAL_MIN, TEMPLE_BUFF_INTERVAL_MAX,
  getProgressiveUpgradeCost, getProgressiveUpgradeBonus,
  generateShipmentDelivery,
  // Wandering Trader system
  WanderingTraderOffer, RouletteResult,
  WANDERING_TRADER_DURATION, 
  generateWanderingTraderOffers, getWanderingTraderNextSpawn, spinRoulette,
  // Premium products
  PREMIUM_PRODUCT_BUFFS,
  // Hard Mode
  HARD_MODE_MODIFIERS,
} from '@/types/game';
import { products } from '@/utils/products';
import { PICKAXES, ROCKS, getPickaxeById, getRockById, getHighestUnlockedRock } from '@/lib/gameData';
import { useAuth } from './AuthContext';
import { useClient } from './ClientContext';
import { fetchUserGameData, debouncedSaveUserGameData, flushPendingData, savePurchase, forceImmediateSave, keepaliveSave, getPendingData, fetchUserPurchases, isCorruptNumber, sanitizeNumber, safeAdd, safeMoney } from '@/lib/userDataSync';
import { supabase } from '@/lib/supabase';

// Helper to add product sale contribution to active budget (50% of sale)
async function addProductSaleToBudget(amount: number, productName: string): Promise<void> {
  try {
    const contribution = Math.floor(amount * 0.5); // 50% goes to active budget
    
    // Get current budget
    const { data: budgetData, error: fetchError } = await supabase
      .from('company_budget')
      .select('*')
      .limit(1)
      .single();

    if (fetchError) {
      console.error('Error fetching budget for product sale:', fetchError);
      return;
    }

    if (budgetData) {
      // Update active budget (money in circulation)
      const { error: updateError } = await supabase
        .from('company_budget')
        .update({
          active_budget: parseFloat(budgetData.active_budget) + contribution,
          last_updated: new Date().toISOString(),
        })
        .eq('id', budgetData.id);

      if (updateError) {
        console.error('Error updating budget for product sale:', updateError);
        return;
      }

      // Record transaction
      await supabase.from('budget_transactions').insert({
        amount: contribution,
        transaction_type: 'product_sale',
        description: `50% of ${productName} sale`,
        affects: 'active_budget',
        created_by: 'system',
      });

    }
  } catch (err) {
    console.error('Error adding product sale to budget:', err);
  }
}

interface GameContextType {
  gameState: GameState;
  currentPickaxe: typeof PICKAXES[0];
  currentRock: typeof ROCKS[0];
  mineRock: () => { earnedMoney: number; brokeRock: boolean; couponDrop: string | null };
  buyPickaxe: (pickaxeId: number) => boolean;
  buyAllAffordablePickaxes: () => number;
  canAffordPickaxe: (pickaxeId: number) => boolean;
  ownsPickaxe: (pickaxeId: number) => boolean;
  equipPickaxe: (pickaxeId: number) => void;
  selectRock: (rockId: number) => void;
  getUnlockedRocks: () => typeof ROCKS;
  resetGame: () => void;
  markCutsceneSeen: () => void;
  useCoupon: (type: 'discount30' | 'discount50' | 'discount100') => boolean;
  spendMoney: (amount: number) => boolean;
  addPremiumProduct: (productId: number) => void;
  ownsPremiumProduct: (productId: number) => boolean;
  shopStock: ShopStock;
  buyShopProduct: (productId: number) => boolean;
  getTimeUntilRestock: () => number;
  buyAutoclicker: () => boolean;
  toggleAutoclicker: () => void;
  canPrestige: () => boolean;
  prestige: (force?: boolean) => { amountToCompany: number; newMultiplier: number } | null;
  // Anti-cheat functions
  dismissWarning: () => void;
  clearClickHistory: () => void;
  submitAppeal: (reason: string) => Promise<boolean>;
  // Ban state
  isBanned: boolean;
  banReason: string | null;
  // Trinket functions
  trinketShopItems: Trinket[];
  getTrinketShopTimeLeft: () => number;
  resetTrinketShop: () => boolean; // Costs 40% of money to refresh shop
  buyTrinket: (trinketId: string) => boolean;
  equipTrinket: (trinketId: string) => boolean;
  unequipTrinket: (trinketId: string) => void;
  ownsTrinket: (trinketId: string) => boolean;
  getEquippedTrinkets: () => Trinket[];
  getTotalBonuses: () => { moneyBonus: number; rockDamageBonus: number; clickSpeedBonus: number; couponBonus: number; minerSpeedBonus: number; minerDamageBonus: number };
  // Relic & Talisman conversion functions
  convertToRelic: (trinketId: string, payWithTokens: boolean) => boolean;  // payWithTokens: true = tokens, false = money
  convertToTalisman: (trinketId: string) => boolean;
  ownsRelic: (trinketId: string) => boolean;
  ownsTalisman: (trinketId: string) => boolean;
  getRelicConversionCost: (trinketId: string) => { prestigeTokens: number; money: number } | null;
  getTalismanConversionCost: (trinketId: string) => { miners: number; money: number } | null;
  // Miner functions
  buyMiner: () => boolean;
  buyMiners: (count: number) => number; // Buy multiple miners, returns how many were bought
  getMinerCost: () => number;
  // Prestige upgrade functions
  buyPrestigeUpgrade: (upgradeId: string) => boolean;
  ownsPrestigeUpgrade: (upgradeId: string) => boolean;
  canEquipDualTrinkets: () => boolean;
  canEquipTripleTrinkets: () => boolean;
  // Auto-prestige
  toggleAutoPrestige: () => void;
  // Admin functions (terminal)
  addMoney: (amount: number) => void;
  addMiners: (amount: number) => void;
  addPrestigeTokens: (amount: number) => void;
  addPrestigeCount: (amount: number) => void;
  skipRocks: (amount: number) => void;
  giveTrinket: (trinketId: string) => boolean;
  givePickaxe: (pickaxeId: number) => void;
  setTotalClicks: (clicks: number) => void;
  unlockAllAchievements: () => void;
  maxAll: () => void; // Admin command - max out everything
  giveAllTrinkets: () => void;
  // Title functions
  giveTitle: (titleId: string) => boolean;
  equipTitle: (titleId: string) => boolean;
  unequipTitle: (titleId: string) => void;
  ownsTitle: (titleId: string) => boolean;
  getTitleBonuses: () => { moneyBonus: number; allBonus: number; speedBonus: number; pcxDiscount: number; prestigeMoneyRetention: number };
  // Pickaxe ability functions
  activateAbility: () => boolean;
  getAbilityCooldownRemaining: () => number;
  isAbilityActive: () => boolean;
  getActiveAbilityTimeRemaining: () => number;
  // =====================
  // PATH SYSTEM FUNCTIONS
  // =====================
  selectPath: (path: GamePath, force?: boolean) => void;
  canLevelUpSide: () => boolean;
  levelUpSide: () => { success: boolean; buff?: { stat: string; amount: number } };
  getSideLevelProgress: () => { level: number; requirements: Record<string, { current: number; required: number; met: boolean }> } | null;
  canBuyPickaxeForPath: (pickaxeId: number) => boolean;
  canMineRockForPath: (rockId: number) => boolean;
  // Miner sacrifice (Darkness path)
  sacrificeMiners: (count: number) => boolean;
  getSacrificeBuffForCount: (count: number) => { buff: SacrificeBuff; duration: number } | null;
  // Shady Sam (Darkness path)
  addShadySamSwap: (debuffStat: ShadySamStat, buffStat: ShadySamStat, amount: number) => boolean;
  removeShadySamSwap: (swapId: string) => void;
  // Golden Cookie ritual (Darkness path)
  activateGoldenCookieRitual: () => boolean;
  canActivateRitual: () => boolean;
  // Golden Cookie reward claiming
  claimGoldenCookieReward: () => { type: string; value: number | string } | null;
  // =====================
  // BUILDING SYSTEM FUNCTIONS
  // =====================
  buyBuilding: (buildingId: BuildingType) => boolean;
  canAffordBuilding: (buildingId: BuildingType) => boolean;
  getBuildingCostForType: (buildingId: BuildingType) => number;
  // Mine functions
  absorbMinersIntoMine: () => boolean;
  getMineEfficiency: () => number;
  // Bank functions
  depositToBank: (amount: number) => boolean;
  withdrawFromBank: () => { principal: number; interest: number; capped: boolean } | null;
  getBankBalance: () => { principal: number; interest: number; totalTime: number };
  unlockBankTier: () => boolean;
  // Loan functions
  takeLoan: (amount: number) => boolean;
  repayLoan: (amount: number) => boolean;
  getLoanStatus: () => { debt: number; dailyInterest: number; isAutoRepaying: boolean };
  // Factory functions
  getFactoryBonusMiners: () => number;
  // Temple functions (Light path)
  buyTempleUpgrade: (upgradeType: string, rank: number) => boolean;
  equipTempleRank: (rank: number | null) => boolean;
  getTempleUpgradeBonus: (upgradeType: string) => number;
  prayAtTemple: () => { success: boolean; message: string };
  consumePendingGoldenCookie: () => boolean;
  // Wizard Tower functions (Darkness path)
  startWizardRitual: () => boolean;
  isWizardRitualActive: () => boolean;
  // Shipment functions
  collectShipmentDelivery: (deliveryId: string) => { type: string; value: string | number } | null;
  getPendingShipments: () => { id: string; type: string; arrivalTime: number; isReady: boolean }[];
  // Buff/Debuff functions
  getActiveBuffs: () => ActiveBuff[];
  getActiveDebuffs: () => ActiveDebuff[];
  getTotalBuffMultiplier: (type: string) => number;
  // Progressive Upgrades
  buyProgressiveUpgrade: (upgradeId: ProgressiveUpgradeType) => boolean;
  getProgressiveUpgradeLevel: (upgradeId: ProgressiveUpgradeType) => number;
  getProgressiveUpgradeTotalBonus: (upgradeId: ProgressiveUpgradeType) => number;
  // Powerups
  buyPowerup: (powerupId: PowerupType) => boolean;
  usePowerup: (powerupId: PowerupType) => boolean;
  getPowerupCount: (powerupId: PowerupType) => number;
  // =====================
  // WANDERING TRADER SYSTEM (Darkness path only)
  // =====================
  spawnWanderingTrader: () => boolean;
  dismissWanderingTrader: () => void;
  clearWanderingTraderTimer: () => void;
  isWanderingTraderVisible: () => boolean;
  applyWTDialogEffect: (effect: 'suspicious' | 'deal_5' | 'deal_15' | 'deal_25' | 'ban' | 'gift' | 'redemption') => void;
  getWanderingTraderOffers: () => WanderingTraderOffer[];
  purchaseWanderingTraderOffer: (offerId: string, selectedTrinketIds?: string[]) => boolean;
  getWanderingTraderTimeLeft: () => number;
  // Stokens
  addStokens: (amount: number) => void;
  spendStokens: (amount: number) => boolean;
  getStokens: () => number;
  // Lottery Tickets
  addLotteryTickets: (amount: number) => void;
  spendLotteryTickets: (amount: number) => boolean;
  getLotteryTickets: () => number;
  // Manual save
  saveNow: () => Promise<boolean>;
  // Roulette
  spinRouletteWheel: () => RouletteResult;
  // Permanent buffs from Wandering Trader
  wanderingTraderPermBuffs: {
    moneyBonus: number;
    couponLuckBonus: number;
    minerSpeedBonus: number;
    minerDamageBonus: number;
  };
}

const defaultGameState: GameState = {
  yatesDollars: 0,
  totalClicks: 0,
  currentPickaxeId: 1,
  currentRockId: 1,
  currentRockHP: ROCKS[0].clicksToBreak,
  rocksMinedCount: 0,
  ownedPickaxeIds: [1],
  coupons: {
    discount30: 0,
    discount50: 0,
    discount100: 0,
  },
  hasSeenCutscene: false,
  hasAutoclicker: false,
  autoclickerEnabled: false,
  prestigeCount: 0,
  prestigeMultiplier: 1.0,
  // Anti-cheat defaults
  antiCheatWarnings: 0,
  isOnWatchlist: false,
  isBlocked: false,
  appealPending: false,
  // Trinkets
  ownedTrinketIds: [],
  equippedTrinketIds: [],
  trinketShopItems: [],
  trinketShopLastRefresh: 0,
  hasTotemProtection: false,
  hasStocksUnlocked: false,
  // Relics & Talismans
  ownedRelicIds: [],
  ownedTalismanIds: [],
  // Miners
  minerCount: 0,
  minerLastTick: Date.now(),
  // Prestige upgrades
  prestigeTokens: 0,
  ownedPrestigeUpgradeIds: [],
  // Auto-prestige
  autoPrestigeEnabled: false,
  // Pickaxe active abilities
  activeAbility: null,
  abilityCooldowns: {},
  // Achievements (permanently unlocked)
  unlockedAchievementIds: [],
  // Ranking system tracking
  totalMoneyEarned: 0,
  gameStartTime: Date.now(),
  fastestPrestigeTime: null,
  // Pro Player Titles
  ownedTitleIds: [],
  equippedTitleIds: [],
  titleWinCounts: {},
  // Light vs Darkness Path System
  chosenPath: null,
  sideLevel: 1,
  sideLevelBuffs: {},
  totalGoldenCookiesCollected: 0,
  totalMinersSacrificed: 0,
  goldenCookieRitualActive: false,
  sacrificeBuff: null,
  adminCommandsUntil: null,
  lastTaxTime: null,
  // Loans
  loanAmount: 0,
  loanTakenAt: null,
  loanLastAccrualAt: null,
  // Timestamp for sync conflict resolution
  // IMPORTANT: Must be 0 (not Date.now()) so Supabase data is preferred on new devices
  localUpdatedAt: 0,
  // Playtime tracking
  totalPlaytimeSeconds: 0,
  // Building system
  buildings: getDefaultBuildingStates(),
  activeBuffs: [],
  activeDebuffs: [],
  progressiveUpgrades: getDefaultProgressiveUpgradeState(),
  powerupInventory: getDefaultPowerupInventory(),
  activePowerups: [],
  guaranteedCouponDrop: false,
  // Wandering Trader system (Darkness path only)
  stokens: 0,
  wanderingTraderVisible: false,
  wanderingTraderLastSpawn: 0,
  wanderingTraderNextSpawn: Date.now() + 5 * 60 * 1000, // First spawn in 5 minutes
  wanderingTraderShopItems: [],
  wanderingTraderDespawnTime: null,
  // Wandering Trader Deal System
  wtDealLevel: 0,
  wtBanned: false,
  wtSuspicious: false,
  wtRedeemed: false,
  wtDialogCompleted: false,
  wtMoneyTax: 0,
  // Shady Sam
  shadySamSwaps: [],
  // Premium products
  ownedPremiumProductIds: [],
  // Hard Mode
  isHardMode: false,
  hardModePrestigeCount: 0,
  lotteryTickets: 0,
  hardModeAchievements: [],
};

const STORAGE_KEY_PREFIX = 'yates-mining-game';
const STORAGE_KEY_PREFIX_HARD = 'yates-mining-game-hard';
// Storage key is user-specific to prevent data conflicts between accounts
// Hard mode uses a separate storage key for separate saves
const getStorageKey = (userId: string | null, isHardMode: boolean = false) => {
  const prefix = isHardMode ? STORAGE_KEY_PREFIX_HARD : STORAGE_KEY_PREFIX;
  return userId ? `${prefix}-${userId}` : `${prefix}-guest`;
};

// Generate random shop stock
function generateShopStock(): ShopStock {
  const availableProducts = products.filter(p => !p.isCustom && p.hasAddToCart);
  const numItems = Math.floor(Math.random() * (SHOP_MAX_ITEMS - SHOP_MIN_ITEMS + 1)) + SHOP_MIN_ITEMS;
  
  // Shuffle and pick random products
  const shuffled = [...availableProducts].sort(() => Math.random() - 0.5);
  const selectedProducts = shuffled.slice(0, Math.min(numItems, shuffled.length));
  
  return {
    items: selectedProducts.map(p => ({
      productId: p.id,
      quantity: Math.floor(Math.random() * (SHOP_MAX_QUANTITY - SHOP_MIN_QUANTITY + 1)) + SHOP_MIN_QUANTITY,
    })),
    lastRestockTime: Date.now(),
  };
}

// Generate random trinket shop items based on shopChance
// Yates Totem is always appended as a permanent 3rd slot
function generateTrinketShopItems(): string[] {
  const items: string[] = [];
  const numSlots = Math.floor(Math.random() * (TRINKET_SHOP_MAX_ITEMS - TRINKET_SHOP_MIN_ITEMS + 1)) + TRINKET_SHOP_MIN_ITEMS;
  
  // Shuffle trinkets and pick based on shopChance (excluding Yates Totem -- it's always added)
  const shuffled = [...TRINKETS].filter(t => t.id !== 'yates_totem').sort(() => Math.random() - 0.5);
  
  for (const trinket of shuffled) {
    if (items.length >= numSlots) break;
    
    // Roll for shopChance
    if (Math.random() < trinket.shopChance) {
      items.push(trinket.id);
    }
  }
  
  // If we got nothing, force at least one common/rare trinket
  if (items.length === 0) {
    const commonRare = TRINKETS.filter(t => t.rarity === 'common' || t.rarity === 'rare');
    const pick = commonRare[Math.floor(Math.random() * commonRare.length)];
    items.push(pick.id);
  }

  // Yates Totem is always in the shop as a permanent slot
  if (!items.includes('yates_totem')) {
    items.push('yates_totem');
  }
  
  return items;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Anti-cheat: Window-level click tracking (survives HMR and re-renders)
const CLICK_WINDOW_MS = 1000; // 1 second rolling window
const NORMAL_CLICK_THRESHOLD = 14; // Max 14 clicks/sec for normal users (human limit is ~12)
const WATCHLIST_CLICK_THRESHOLD = 10; // Max 10 clicks/sec for watchlist users

// Initialize on window if not exists
declare global {
  interface Window {
    _clickTimestamps?: number[];
  }
}
if (typeof window !== 'undefined' && !window._clickTimestamps) {
  window._clickTimestamps = [];
}

interface GameProviderProps {
  children: ReactNode;
  isHardMode?: boolean;
}

export function GameProvider({ children, isHardMode = false }: GameProviderProps) {
  const [gameState, setGameState] = useState<GameState>({
    ...defaultGameState,
    isHardMode, // Set the mode based on prop
  });
  const [shopStock, setShopStock] = useState<ShopStock>(() => generateShopStock());
  // Start as true so game renders immediately - data will load in background
  const [isLoaded, setIsLoaded] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const { employee } = useAuth();
  const { client } = useClient();
  
  // Get current user ID and type
  const userId = employee?.id || client?.id || null;
  const userType: 'employee' | 'client' | null = employee ? 'employee' : client ? 'client' : null;
  
  // Ref for cheat commands to access latest setGameState
  const setGameStateRef = useRef(setGameState);
  setGameStateRef.current = setGameState;
  
  // Ref to track if we're still loading initial data (prevent saves during load)
  const isLoadingRef = useRef(true);
  
  // Ref for unload handler to access latest gameState (avoids stale closures)
  const unloadGameStateRef = useRef(gameState);
  unloadGameStateRef.current = gameState;

  // Check if click rate exceeds threshold and trigger warning if needed
  const checkClickRate = useCallback((): boolean => {
    const now = Date.now();
    const clicks = window._clickTimestamps || [];
    
    // Add current click timestamp
    clicks.push(now);

    // Remove clicks older than 1 second
    const beforeFilter = clicks.length;
    window._clickTimestamps = clicks.filter(
      (timestamp) => now - timestamp <= CLICK_WINDOW_MS
    );

    // Get the appropriate threshold
    const threshold = gameState.isOnWatchlist ? WATCHLIST_CLICK_THRESHOLD : NORMAL_CLICK_THRESHOLD;
    
    const clickCount = window._clickTimestamps.length;
    
    // Debug logging EVERY click now
    // Debug logging removed for performance

    // Check if over threshold
    if (clickCount > threshold) {
      return true; // Violation detected
    }
    return false;
  }, [gameState.isOnWatchlist]);

  // Trigger anti-cheat warning
  const triggerAntiCheatWarning = useCallback(() => {
    setGameState((prev) => {
      const newWarnings = prev.antiCheatWarnings + 1;
      return {
        ...prev,
        antiCheatWarnings: newWarnings,
        isBlocked: true, // Block earning until modal is dismissed
      };
    });
    // Clear click history after violation
    window._clickTimestamps = [];
  }, []);

  // Dismiss warning (called from UI after user acknowledges)
  const dismissWarning = useCallback(() => {
    // Clear click history when dismissing warning
    window._clickTimestamps = [];
    setGameState((prev) => ({
      ...prev,
      isBlocked: false,
    }));
  }, []);
  
  // Clear click history (for admin commands like CM)
  const clearClickHistory = useCallback(() => {
    window._clickTimestamps = [];
  }, []);

  // Load from localStorage IMMEDIATELY (synchronous) so game works right away
  useEffect(() => {
    isLoadingRef.current = true; // Mark as loading
    
    // Load localStorage first - this is instant
    const storageKey = getStorageKey(userId, isHardMode);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // POLLUTION CHECK: If we're in Hard Mode but saved data doesn't have isHardMode: true,
        // this is polluted data from before the mode separation. Wipe it and start fresh.
        if (isHardMode && parsed.isHardMode !== true) {
          console.log('🧹 Hard Mode pollution detected - wiping old data and starting fresh');
          localStorage.removeItem(storageKey);
          setGameState({ ...defaultGameState, isHardMode });
        } else {
          // Preserve isHardMode from prop, not from saved data
          // Also fix HP if it exceeds max (can happen when mode modifiers change)
          const loadedState = { ...defaultGameState, ...parsed, isHardMode };
          
          // CORRUPTION DETECTION: Validate critical numeric fields
          // JSON.stringify(NaN) produces null, which spreads over defaults
          // If any core field is corrupt, sanitize it to prevent permanent data loss
          const corruptFields: string[] = [];
          if (isCorruptNumber(loadedState.yatesDollars)) {
            corruptFields.push(`yatesDollars=${loadedState.yatesDollars}`);
            loadedState.yatesDollars = 0;
          }
          if (isCorruptNumber(loadedState.totalClicks)) {
            corruptFields.push(`totalClicks=${loadedState.totalClicks}`);
            loadedState.totalClicks = 0;
          }
          if (isCorruptNumber(loadedState.totalMoneyEarned)) {
            corruptFields.push(`totalMoneyEarned=${loadedState.totalMoneyEarned}`);
            loadedState.totalMoneyEarned = 0;
          }
          if (isCorruptNumber(loadedState.prestigeCount)) {
            corruptFields.push(`prestigeCount=${loadedState.prestigeCount}`);
            loadedState.prestigeCount = 0;
          }
          if (isCorruptNumber(loadedState.prestigeMultiplier)) {
            corruptFields.push(`prestigeMultiplier=${loadedState.prestigeMultiplier}`);
            loadedState.prestigeMultiplier = 1.0;
          }
          if (isCorruptNumber(loadedState.currentRockHP)) {
            corruptFields.push(`currentRockHP=${loadedState.currentRockHP}`);
            loadedState.currentRockHP = ROCKS[0].clicksToBreak;
          }
          if (corruptFields.length > 0) {
            console.error('🚨 CORRUPT LOCALSTORAGE DATA DETECTED & REPAIRED:', corruptFields.join(', '),
              '- Will prefer Supabase data on merge if available');
          }
          
          const currentRock = ROCKS.find(r => r.id === loadedState.currentRockId) || ROCKS[0];
          const maxHP = getScaledRockHP(currentRock.clicksToBreak, loadedState.prestigeCount, isHardMode, loadedState.sideLevel || 0);
          if (loadedState.currentRockHP > maxHP) {
            console.log(`🔧 Fixing HP: ${loadedState.currentRockHP} > ${maxHP}, capping to max`);
            loadedState.currentRockHP = maxHP;
          }
          setGameState(loadedState);

          // Bank tier migration for localStorage-only loads (guests / Supabase offline)
          if (loadedState.buildings?.bank?.owned && loadedState.buildings.bank.bankTier === undefined) {
            setGameState(prev => {
              const bank = prev.buildings.bank;
              if (bank.bankTier !== undefined && bank.bankTier !== null) return prev;
              if (!bank.owned || bank.depositAmount <= 0) {
                return { ...prev, buildings: { ...prev.buildings, bank: { ...bank, bankTier: 0 } } };
              }
              const currentAmountTier = getBankTierForAmount(bank.depositAmount);
              const grantedTier = Math.max(0, currentAmountTier - 1);
              const cap = getBankDepositCap(grantedTier);
              return {
                ...prev,
                buildings: { ...prev.buildings, bank: { ...bank, bankTier: grantedTier, depositAmount: Math.min(bank.depositAmount, cap) } },
              };
            });
          }

          if (parsed.shopStock) {
            const timeSinceRestock = Date.now() - parsed.shopStock.lastRestockTime;
            if (timeSinceRestock >= SHOP_RESTOCK_INTERVAL) {
              setShopStock(generateShopStock());
            } else {
              setShopStock(parsed.shopStock);
            }
          }
        }
      } catch {
        console.error('Failed to parse saved game state');
        // If parsing fails, use default state with correct mode
        setGameState({ ...defaultGameState, isHardMode });
      }
    } else {
      // No saved data - start fresh with correct mode
      setGameState({ ...defaultGameState, isHardMode });
    }
    // Game is now loaded and working with localStorage data

    // Then try Supabase in background (async)
    const loadSupabaseData = async () => {
      // Safety timeout - ensure game loads even if Supabase hangs
      const timeoutId = setTimeout(() => {
        // Timeout reached - game continues with localStorage
        // Make sure saves can happen even if Supabase never responds
        if (isLoadingRef.current) {
          console.log('⚠️ Supabase load timeout - enabling saves with localStorage data');
          isLoadingRef.current = false;
        }
      }, 5000); // 5 second timeout

      try {

        // If logged in, try to load from Supabase
        if (userId && userType) {
          try {
            // Check if user is banned first (use maybeSingle to avoid 406 errors)
            const { data: banData, error: banError } = await supabase
              .from('banned_users')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
            
            // Only block if we successfully found ban data (ignore errors)
            if (banData && !banError) {
              // User is banned - block them
              setGameState(prev => ({
                ...prev,
                isBlocked: true,
                appealPending: false,
              }));
              setIsBanned(true);
              setBanReason(banData.ban_reason || 'No reason provided');
              setIsLoaded(true);
              clearTimeout(timeoutId);
              isLoadingRef.current = false; // IMPORTANT: Allow saves even for banned users
              return; // Don't load game data for banned users
            }

            // Try to load from Supabase (will merge with localStorage if it fails)
            const supabaseData = await fetchUserGameData(userId, isHardMode);
            if (supabaseData) {
              setGameState(prev => {
                // Smart merge using timestamps as primary comparison
                // Supabase stores updated_at as ISO string, localStorage has localUpdatedAt as timestamp
                const localTime = prev.localUpdatedAt || 0;
                const supabaseTime = supabaseData.updated_at 
                  ? new Date(supabaseData.updated_at).getTime() 
                  : 0;
                
                // Also get prestige/clicks for tiebreaker
                const localPrestige = prev.prestigeCount || 0;
                const supabasePrestige = supabaseData.prestige_count || 0;
                const localClicks = prev.totalClicks || 0;
                const supabaseClicks = supabaseData.total_clicks || 0;
                
                // Determine which source to use
                let useSupabase: boolean;
                const timeDiff = Math.abs(localTime - supabaseTime);
                
                // CRITICAL: If localStorage has zero/default progress but Supabase has real data,
                // always prefer Supabase. This prevents fresh/empty sessions from wiping real progress.
                const localHasProgress = localPrestige > 0 || localClicks > 50 || (prev.yatesDollars || 0) > 100;
                const supabaseHasProgress = supabasePrestige > 0 || supabaseClicks > 50 || (supabaseData.yates_dollars || 0) > 100;
                
                if (!localHasProgress && supabaseHasProgress) {
                  // localStorage is empty/fresh — always use Supabase
                  useSupabase = true;
                  console.log('🔄 SYNC: localStorage has no progress, preferring Supabase data', {
                    localPrestige, supabasePrestige, localClicks, supabaseClicks
                  });
                } else if (timeDiff < 10000) {
                  // Timestamps within 10 seconds - use prestige then clicks as tiebreaker
                  useSupabase = supabasePrestige > localPrestige || 
                    (supabasePrestige === localPrestige && supabaseClicks > localClicks);
                  console.log('🔄 SYNC: Timestamps close, using prestige/clicks tiebreaker', {
                    localTime: new Date(localTime).toISOString(),
                    supabaseTime: new Date(supabaseTime).toISOString(),
                    timeDiff,
                    localPrestige, supabasePrestige,
                    localClicks, supabaseClicks,
                    useSupabase
                  });
                } else {
                  // Clear winner by timestamp
                  useSupabase = supabaseTime > localTime;
                  console.log('🔄 SYNC: Using timestamp comparison', {
                    localTime: new Date(localTime).toISOString(),
                    supabaseTime: new Date(supabaseTime).toISOString(),
                    timeDiff,
                    useSupabase,
                    source: useSupabase ? 'SUPABASE' : 'LOCALSTORAGE'
                  });
                }
                
                // Calculate max HP for current rock to cap loaded HP value
                const loadedRockId = useSupabase ? (supabaseData.current_rock_id ?? prev.currentRockId) : prev.currentRockId;
                const loadedPrestige = useSupabase ? (supabaseData.prestige_count ?? prev.prestigeCount) : prev.prestigeCount;
                const loadedRock = ROCKS.find(r => r.id === loadedRockId) || ROCKS[0];
                const maxRockHP = getScaledRockHP(loadedRock.clicksToBreak, loadedPrestige, prev.isHardMode, prev.sideLevel || 0);
                const loadedHP = useSupabase ? (supabaseData.current_rock_hp ?? prev.currentRockHP) : prev.currentRockHP;
                const cappedHP = Math.min(loadedHP, maxRockHP);
                
                return {
                ...prev,
                // Use whichever source has more progress
                // sanitizeNumber ensures NaN/null from either source is clamped to 0 (never poisons state)
                yatesDollars: sanitizeNumber(useSupabase ? (supabaseData.yates_dollars ?? prev.yatesDollars) : prev.yatesDollars, 0),
                totalClicks: sanitizeNumber(useSupabase ? (supabaseData.total_clicks ?? prev.totalClicks) : prev.totalClicks, 0),
                currentPickaxeId: useSupabase ? (supabaseData.current_pickaxe_id ?? prev.currentPickaxeId) : prev.currentPickaxeId,
                currentRockId: loadedRockId,
                currentRockHP: cappedHP,
                rocksMinedCount: useSupabase ? (supabaseData.rocks_mined_count ?? prev.rocksMinedCount) : prev.rocksMinedCount,
                ownedPickaxeIds: useSupabase ? (supabaseData.owned_pickaxe_ids?.length ? supabaseData.owned_pickaxe_ids : prev.ownedPickaxeIds) : prev.ownedPickaxeIds,
                coupons: useSupabase ? {
                  discount30: supabaseData.coupons_30 ?? prev.coupons.discount30,
                  discount50: supabaseData.coupons_50 ?? prev.coupons.discount50,
                  discount100: supabaseData.coupons_100 ?? prev.coupons.discount100,
                } : prev.coupons,
                // Keep localStorage value for hasSeenCutscene if it's true (user already saw it)
                // Only update if Supabase says true (to sync across devices)
                hasSeenCutscene: prev.hasSeenCutscene || (supabaseData.has_seen_cutscene ?? false),
                hasAutoclicker: useSupabase ? (supabaseData.has_autoclicker ?? prev.hasAutoclicker) : prev.hasAutoclicker,
                autoclickerEnabled: useSupabase ? (supabaseData.autoclicker_enabled ?? prev.autoclickerEnabled) : prev.autoclickerEnabled,
                prestigeCount: useSupabase ? (supabaseData.prestige_count ?? prev.prestigeCount) : prev.prestigeCount,
                prestigeMultiplier: useSupabase ? (supabaseData.prestige_multiplier ?? prev.prestigeMultiplier) : prev.prestigeMultiplier,
                // Anti-cheat fields (always sync from Supabase for security)
                antiCheatWarnings: supabaseData.anti_cheat_warnings ?? prev.antiCheatWarnings,
                isOnWatchlist: supabaseData.is_on_watchlist ?? prev.isOnWatchlist,
                isBlocked: supabaseData.is_blocked ?? prev.isBlocked,
                appealPending: supabaseData.appeal_pending ?? prev.appealPending,
                // Trinkets
                ownedTrinketIds: useSupabase ? (supabaseData.owned_trinket_ids?.length ? supabaseData.owned_trinket_ids : prev.ownedTrinketIds) : prev.ownedTrinketIds,
                equippedTrinketIds: useSupabase ? (supabaseData.equipped_trinket_ids?.length ? supabaseData.equipped_trinket_ids : prev.equippedTrinketIds) : prev.equippedTrinketIds,
                trinketShopItems: supabaseData.trinket_shop_items?.length 
                  ? (supabaseData.trinket_shop_items as string[]) 
                  : prev.trinketShopItems,
                trinketShopLastRefresh: supabaseData.trinket_shop_last_refresh ?? prev.trinketShopLastRefresh,
                hasTotemProtection: useSupabase ? (supabaseData.has_totem_protection ?? prev.hasTotemProtection) : prev.hasTotemProtection,
                hasStocksUnlocked: useSupabase ? (supabaseData.has_stocks_unlocked ?? prev.hasStocksUnlocked) : prev.hasStocksUnlocked,
                // Relics & Talismans - merge from both sources
                ownedRelicIds: [...new Set([...(prev.ownedRelicIds || []), ...(supabaseData.owned_relic_ids || [])])],
                ownedTalismanIds: [...new Set([...(prev.ownedTalismanIds || []), ...(supabaseData.owned_talisman_ids || [])])],
                // Miners
                minerCount: useSupabase ? (supabaseData.miner_count ?? prev.minerCount) : prev.minerCount,
                minerLastTick: useSupabase ? (supabaseData.miner_last_tick ?? prev.minerLastTick) : prev.minerLastTick,
                // Prestige upgrades
                prestigeTokens: useSupabase ? (supabaseData.prestige_tokens ?? prev.prestigeTokens) : prev.prestigeTokens,
                ownedPrestigeUpgradeIds: useSupabase ? (supabaseData.owned_prestige_upgrade_ids?.length ? supabaseData.owned_prestige_upgrade_ids : prev.ownedPrestigeUpgradeIds) : prev.ownedPrestigeUpgradeIds,
                // Auto-prestige
                autoPrestigeEnabled: useSupabase ? (supabaseData.auto_prestige_enabled ?? prev.autoPrestigeEnabled) : prev.autoPrestigeEnabled,
                // Achievements (permanently unlocked)
                unlockedAchievementIds: supabaseData.unlocked_achievement_ids?.length 
                  ? supabaseData.unlocked_achievement_ids 
                  : prev.unlockedAchievementIds,
                // Ranking system (always use max values, sanitize to prevent NaN propagation)
                // Backfill: if total_money_earned is 0 but yates_dollars > 0, use yates_dollars as floor
                // (column was added after some users started playing, so their total_money_earned defaulted to 0)
                totalMoneyEarned: sanitizeNumber(Math.max(
                  prev.totalMoneyEarned || 0, 
                  supabaseData.total_money_earned || 0,
                  (supabaseData.total_money_earned === 0 || supabaseData.total_money_earned == null)
                    ? (supabaseData.yates_dollars || 0) : 0
                ), 0),
                gameStartTime: prev.gameStartTime || supabaseData.game_start_time || Date.now(),
                fastestPrestigeTime: supabaseData.fastest_prestige_time ?? prev.fastestPrestigeTime,
                // Pro Player Titles (merge - keep all owned)
                ownedTitleIds: [...new Set([
                  ...(prev.ownedTitleIds || []),
                  ...(supabaseData.owned_title_ids || [])
                ])],
                equippedTitleIds: useSupabase 
                  ? (supabaseData.equipped_title_ids || prev.equippedTitleIds || [])
                  : (prev.equippedTitleIds || []),
                titleWinCounts: {
                  ...(prev.titleWinCounts || {}),
                  ...(supabaseData.title_win_counts || {}),
                },
                // Path system (always sync from Supabase - critical state)
                chosenPath: (supabaseData.chosen_path as GamePath) ?? prev.chosenPath,
                sideLevel: (supabaseData as unknown as { side_level?: number }).side_level ?? prev.sideLevel,
                sideLevelBuffs: (() => {
                  try {
                    const raw = (supabaseData as unknown as { side_level_buffs?: string }).side_level_buffs;
                    return raw ? JSON.parse(raw) : prev.sideLevelBuffs;
                  } catch { return prev.sideLevelBuffs; }
                })(),
                totalGoldenCookiesCollected: (supabaseData as unknown as { total_golden_cookies_collected?: number }).total_golden_cookies_collected ?? prev.totalGoldenCookiesCollected,
                totalMinersSacrificed: (supabaseData as unknown as { total_miners_sacrificed?: number }).total_miners_sacrificed ?? prev.totalMinersSacrificed,
                // Tax system (sync from Supabase)
                lastTaxTime: (supabaseData as unknown as { last_tax_time?: number | null }).last_tax_time ?? prev.lastTaxTime,
                // Loans
                loanAmount: (supabaseData as unknown as { loan_amount?: number }).loan_amount ?? prev.loanAmount,
                loanTakenAt: (supabaseData as unknown as { loan_taken_at?: number | null }).loan_taken_at ?? prev.loanTakenAt,
                loanLastAccrualAt: (supabaseData as unknown as { loan_last_accrual_at?: number | null }).loan_last_accrual_at ?? prev.loanLastAccrualAt,
                // Shady Sam
                shadySamSwaps: (() => {
                  try {
                    const raw = (supabaseData as unknown as { shady_sam_swaps?: string }).shady_sam_swaps;
                    return raw ? JSON.parse(raw) : prev.shadySamSwaps;
                  } catch { return prev.shadySamSwaps; }
                })(),
                // Playtime tracking (use max to never lose playtime)
                totalPlaytimeSeconds: Math.max(
                  prev.totalPlaytimeSeconds || 0,
                  (supabaseData as unknown as { total_playtime_seconds?: number }).total_playtime_seconds || 0
                ),
                // Premium products (merge from both sources)
                ownedPremiumProductIds: [
                  ...new Set([
                    ...(prev.ownedPremiumProductIds || []),
                    ...((supabaseData as unknown as { owned_premium_product_ids?: number[] }).owned_premium_product_ids || []),
                  ]),
                ],
                // Buildings data (bank, factory, temple, etc.) - merge carefully
                buildings: (() => {
                  const supabaseBuildingsJson = (supabaseData as unknown as { buildings_data?: string }).buildings_data;
                  if (!supabaseBuildingsJson || !useSupabase) return prev.buildings;
                  try {
                    const supabaseBuildings = JSON.parse(supabaseBuildingsJson);
                    // Merge buildings - use Supabase data but keep local state for active things
                    return {
                      ...prev.buildings,
                      ...supabaseBuildings,
                      // For bank, use whichever has a deposit (non-zero amount)
                      bank: supabaseBuildings.bank?.depositAmount > 0 
                        ? supabaseBuildings.bank 
                        : (prev.buildings.bank?.depositAmount > 0 ? prev.buildings.bank : supabaseBuildings.bank || prev.buildings.bank),
                    };
                  } catch {
                    return prev.buildings;
                  }
                })(),
                // Stokens & Lottery Tickets (use max of both sources)
                stokens: Math.max(
                  prev.stokens || 0,
                  (supabaseData as unknown as { stokens?: number }).stokens || 0
                ),
                lotteryTickets: Math.max(
                  prev.lotteryTickets || 0,
                  (supabaseData as unknown as { lottery_tickets?: number }).lottery_tickets || 0
                ),
                // Keep whichever timestamp is newer (for future syncs)
                localUpdatedAt: useSupabase ? supabaseTime : localTime,
              };
              });
            }
            
            // Sync premium purchases from purchases table to game state (for buff system)
            const purchases = await fetchUserPurchases(userId);
            if (purchases.length > 0) {
              const purchasedIds = purchases.map(p => p.product_id);
              setGameState(prev => {
                const existingIds = new Set(prev.ownedPremiumProductIds);
                const newIds = purchasedIds.filter(id => !existingIds.has(id));
                if (newIds.length === 0) return prev;
                return {
                  ...prev,
                  ownedPremiumProductIds: [...prev.ownedPremiumProductIds, ...newIds],
                };
              });
            }

            // Coupon → Lottery Ticket migration (one-time rebrand)
            // All existing coupons are instantly converted to lottery tickets
            setGameState(prev => {
              const totalCoupons = (prev.coupons.discount30 || 0) + (prev.coupons.discount50 || 0) + (prev.coupons.discount100 || 0);
              if (totalCoupons === 0) return prev;
              return {
                ...prev,
                lotteryTickets: (prev.lotteryTickets || 0) + totalCoupons,
                coupons: { discount30: 0, discount50: 0, discount100: 0 },
              };
            });

            // Bank tier migration — existing players without bankTier get the
            // tier BEFORE their deposit range, and deposits are clamped to that cap.
            setGameState(prev => {
              const bank = prev.buildings.bank;
              if (bank.bankTier !== undefined && bank.bankTier !== null) return prev;

              if (!bank.owned || bank.depositAmount <= 0) {
                return {
                  ...prev,
                  buildings: { ...prev.buildings, bank: { ...bank, bankTier: 0 } },
                };
              }

              const currentAmountTier = getBankTierForAmount(bank.depositAmount);
              const grantedTier = Math.max(0, currentAmountTier - 1);
              const cap = getBankDepositCap(grantedTier);
              return {
                ...prev,
                buildings: {
                  ...prev.buildings,
                  bank: {
                    ...bank,
                    bankTier: grantedTier,
                    depositAmount: Math.min(bank.depositAmount, cap),
                  },
                },
              };
            });
          } catch {
            // If anything fails, just use localStorage (already loaded above)
          }
        }

        clearTimeout(timeoutId);
      } catch {
        clearTimeout(timeoutId);
      } finally {
        // Mark loading as complete - now saves can happen
        isLoadingRef.current = false;
      }
    };

    // Load Supabase data in background (game already works with localStorage)
    if (userId && userType) {
      loadSupabaseData();
    } else {
      // If not logged in, mark as loaded immediately
      isLoadingRef.current = false;
    }
  }, [userId, userType, isHardMode]);

  // Check for secret challenge completion and grant Yates pickaxe
  useEffect(() => {
    const secretCompleted = localStorage.getItem('yates-secret-completed');
    if (secretCompleted === 'true' && !gameState.ownedPickaxeIds.includes(YATES_PICKAXE_ID)) {
      console.log('🎉 Secret challenge completed! Granting Yates pickaxe...');
      const newOwnedPickaxes = [...gameState.ownedPickaxeIds, YATES_PICKAXE_ID];
      setGameState(prev => ({
        ...prev,
        ownedPickaxeIds: newOwnedPickaxes,
        currentPickaxeId: YATES_PICKAXE_ID, // Auto-equip it
      }));
      // Force save
      if (userId && userType) {
        forceImmediateSave({
          user_id: userId,
          user_type: userType,
          owned_pickaxe_ids: newOwnedPickaxes,
          current_pickaxe_id: YATES_PICKAXE_ID,
        });
      }
      // Clear the flag so it doesn't re-grant
      localStorage.removeItem('yates-secret-completed');
    }
  }, [gameState.ownedPickaxeIds, userId, userType]);

  // Auto-restock check every second (product shop)
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceRestock = Date.now() - shopStock.lastRestockTime;
      if (timeSinceRestock >= SHOP_RESTOCK_INTERVAL) {
        setShopStock(generateShopStock());
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [shopStock.lastRestockTime]);

  // Trinket shop refresh check every second
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceRefresh = Date.now() - gameState.trinketShopLastRefresh;
      // Only refresh based on time interval - NOT when shop is empty (buying last item shouldn't refresh)
      // Initial load (lastRefresh === 0) will trigger refresh since timeSinceRefresh will be huge
      if (timeSinceRefresh >= TRINKET_SHOP_REFRESH_INTERVAL) {
        const newItems = generateTrinketShopItems();
        setGameState(prev => ({
          ...prev,
          trinketShopItems: newItems,
          trinketShopLastRefresh: Date.now(),
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState.trinketShopLastRefresh]);

  // Playtime tracking - increment every second
  useEffect(() => {
    const playtimeInterval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        totalPlaytimeSeconds: prev.totalPlaytimeSeconds + 1,
      }));
    }, 1000);
    
    return () => clearInterval(playtimeInterval);
  }, []);

  // Loan interest accrual tick — runs every 10 seconds
  useEffect(() => {
    if (gameState.loanAmount <= 0) return;

    const loanInterval = setInterval(() => {
      setGameState(prev => {
        if (prev.loanAmount <= 0 || !prev.loanTakenAt) return prev;

        const now = Date.now();
        const lastAccrual = prev.loanLastAccrualAt || prev.loanTakenAt;
        const elapsedMs = now - lastAccrual;
        if (elapsedMs < 5000) return prev; // Skip if less than 5s since last accrual

        // 25% per IRL day, but reduced by 12% per hour the tab is open
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        const elapsedHours = elapsedMs / (1000 * 60 * 60);

        // Reduce the effective daily rate while playing (12% reduction per hour, floor at 0)
        const reduction = Math.min(LOAN_OPEN_TAB_BONUS_RATE * elapsedHours, LOAN_DAILY_INTEREST_RATE);
        const effectiveRate = LOAN_DAILY_INTEREST_RATE - reduction;
        const totalInterest = prev.loanAmount * Math.max(0, effectiveRate) * elapsedDays;
        let newDebt = prev.loanAmount + totalInterest;
        let newMoney = prev.yatesDollars;

        // Auto-repay: if debt >= 2x current money, route earnings to debt
        if (newDebt >= newMoney * LOAN_AUTO_REPAY_THRESHOLD && newMoney > 0) {
          const autoPayment = Math.min(newMoney * 0.1, newDebt); // 10% of money per tick
          newDebt -= autoPayment;
          newMoney -= autoPayment;
        }

        // If fully repaid via auto-repay
        if (newDebt <= 0) {
          return {
            ...prev,
            loanAmount: 0,
            loanTakenAt: null,
            loanLastAccrualAt: null,
            yatesDollars: newMoney,
          };
        }

        return {
          ...prev,
          loanAmount: newDebt,
          loanLastAccrualAt: now,
          yatesDollars: newMoney,
        };
      });
    }, 10000);

    return () => clearInterval(loanInterval);
  }, [gameState.loanAmount > 0]);

  // Check for "Blessed by the Heavens" title unlock
  useEffect(() => {
    // Requirements: Light path, own all pickaxes 1-25, unlocked all rocks (35M clicks), 5+ hours (18000 seconds)
    if (
      gameState.chosenPath === 'light' &&
      !gameState.ownedTitleIds?.includes('blessed_by_heavens') &&
      gameState.totalPlaytimeSeconds >= 18000 && // 5 hours
      gameState.totalClicks >= 35000000 // Unlocked all rocks
    ) {
      // Check if owns all pickaxes 1-25 (excluding Yates 26)
      const requiredPickaxes = Array.from({ length: 25 }, (_, i) => i + 1);
      const ownsAllPickaxes = requiredPickaxes.every(id => gameState.ownedPickaxeIds.includes(id));
      
      if (ownsAllPickaxes) {
        setGameState(prev => ({
          ...prev,
          ownedTitleIds: [...(prev.ownedTitleIds || []), 'blessed_by_heavens'],
        }));
        console.log('☀️ TITLE UNLOCKED: Blessed by the Heavens!');
      }
    }
  }, [gameState.chosenPath, gameState.totalPlaytimeSeconds, gameState.totalClicks, gameState.ownedPickaxeIds, gameState.ownedTitleIds]);

  // Miner tick logic - miners damage rock every second
  // Using a ref to avoid stale closure issues
  const minerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing interval
    if (minerIntervalRef.current) {
      clearInterval(minerIntervalRef.current);
      minerIntervalRef.current = null;
    }
    
    // Don't run if no miners or blocked
    if (gameState.minerCount <= 0 || gameState.isBlocked) {
      return;
    }
    
    minerIntervalRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.minerCount <= 0 || prev.isBlocked) return prev;
        
        let bonuses = { moneyBonus: 0, minerDamageBonus: 0, minerSpeedBonus: 0 };
        let yatesOv = { moneyBonus: 0, minerDamageBonus: 0, minerSpeedBonus: 0 };
        
        for (const itemId of prev.equippedTrinketIds) {
          const isRelic = itemId.endsWith('_relic');
          const isTalisman = itemId.endsWith('_talisman');
          const baseId = isRelic ? itemId.replace('_relic', '') : isTalisman ? itemId.replace('_talisman', '') : itemId;
          const trinket = TRINKETS.find(t => t.id === baseId);
          if (trinket) {
            const useOverride = baseId === 'yates_totem' && (isRelic || isTalisman);
            const e = useOverride
              ? (isRelic ? YATES_TOTEM_RELIC_EFFECTS : YATES_TOTEM_TALISMAN_EFFECTS)
              : trinket.effects;
            let multiplier = 1;
            if (!useOverride) {
              if (isRelic) multiplier = RELIC_MULTIPLIERS[trinket.rarity] || 1;
              else if (isTalisman) multiplier = TALISMAN_MULTIPLIERS[trinket.rarity] || 1;
            }
            const tgt = useOverride ? yatesOv : bonuses;
            tgt.moneyBonus += ((e.moneyBonus || 0) + (e.allBonus || 0) + (e.minerMoneyBonus || 0)) * multiplier;
            tgt.minerDamageBonus += ((e.minerDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
            tgt.minerSpeedBonus += ((e.minerSpeedBonus || 0) + (e.allBonus || 0)) * multiplier;
          }
        }
        
        let trinketMultiplier = 1.0;
        for (const upgradeId of prev.ownedPrestigeUpgradeIds) {
          const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
          if (upgrade?.effects.trinketBonus) trinketMultiplier += upgrade.effects.trinketBonus;
        }
        bonuses.moneyBonus = bonuses.moneyBonus * trinketMultiplier + yatesOv.moneyBonus;
        bonuses.minerDamageBonus = bonuses.minerDamageBonus * trinketMultiplier + yatesOv.minerDamageBonus;
        bonuses.minerSpeedBonus = bonuses.minerSpeedBonus * trinketMultiplier + yatesOv.minerSpeedBonus;
        
        // Prestige upgrade bonuses
        for (const upgradeId of prev.ownedPrestigeUpgradeIds) {
          const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
          if (upgrade) {
            const allB = upgrade.effects.allBonus || 0;
            bonuses.moneyBonus += (upgrade.effects.moneyBonus || 0) + allB;
            bonuses.minerDamageBonus += (upgrade.effects.minerDamageBonus || 0) + allB;
            bonuses.minerSpeedBonus += (upgrade.effects.minerSpeedBonus || 0) + allB;
          }
        }
        
        // Check for active ability bonuses
        let abilityMinerSpeedBonus = 0;
        let abilityAllBonus = 0;
        if (prev.activeAbility) {
          const { startTime, duration, pickaxeId } = prev.activeAbility;
          const isActive = duration === 0 ? false : Date.now() < startTime + duration;
          if (isActive) {
            const pickaxe = getPickaxeById(pickaxeId);
            const ability = pickaxe?.activeAbility;
            if (ability?.effect.type === 'miner_speed') {
              abilityMinerSpeedBonus = ability.effect.value;
            } else if (ability?.effect.type === 'all_boost') {
              abilityAllBonus = ability.effect.value;
            }
          }
        }
        
        const rock = getRockById(prev.currentRockId) || ROCKS[0];
        // Apply ALL bonuses: trinkets, prestige upgrades, and active abilities
        const totalDamageBonus = bonuses.minerDamageBonus + bonuses.minerSpeedBonus + abilityMinerSpeedBonus + abilityAllBonus;
        const totalMoneyBonus = bonuses.moneyBonus + abilityAllBonus;
        const regularMinerDamage = Math.ceil(prev.minerCount * MINER_BASE_DAMAGE * (1 + totalDamageBonus));
        // Shadow miners deal 1000 damage per second each (Darkness path Wizard Tower)
        const shadowMinerDamage = prev.buildings.wizard_tower.shadowMiners * 1000;
        const damage = regularMinerDamage + shadowMinerDamage;
        
        // Calculate new HP after damage
        const newHP = prev.currentRockHP - damage;
        const newTotalClicks = prev.totalClicks + damage;
        
        // Rock didn't break
        if (newHP > 0) {
          return {
            ...prev,
            currentRockHP: newHP,
            totalClicks: newTotalClicks,
          };
        }
        
        // Rock broke! Calculate how many rocks we break with overkill damage
        const overkillDamage = Math.abs(newHP); // Damage beyond first rock
        const fullRockHP = getScaledRockHP(rock.clicksToBreak, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0);
        
        // First rock + additional rocks from overkill
        const additionalRocks = Math.floor(overkillDamage / fullRockHP);
        const totalRocksBroken = 1 + additionalRocks;
        
        // Calculate remaining HP for next rock
        const leftoverDamage = overkillDamage % fullRockHP;
        const finalHP = fullRockHP - leftoverDamage;
        
        // Calculate total money earned (safeMoney prevents NaN/Infinity from multiplier stacking)
        const moneyPerRock = safeMoney(rock.moneyPerBreak * prev.prestigeMultiplier * (1 + totalMoneyBonus));
        const totalMoney = safeMoney(moneyPerRock * totalRocksBroken);
        
        // Check for rock upgrade
        const highestUnlocked = getHighestUnlockedRock(newTotalClicks, prev.prestigeCount);
        const newCurrentRockId = highestUnlocked.id > prev.currentRockId ? highestUnlocked.id : prev.currentRockId;
        const nextRock = getRockById(newCurrentRockId) || ROCKS[0];
        
        return {
          ...prev,
          currentRockHP: newCurrentRockId !== prev.currentRockId ? getScaledRockHP(nextRock.clicksToBreak, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0) : finalHP,
          currentRockId: newCurrentRockId,
          rocksMinedCount: prev.rocksMinedCount + totalRocksBroken,
          yatesDollars: safeAdd(prev.yatesDollars, totalMoney),
          totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, totalMoney),
          totalClicks: newTotalClicks,
          lastMinerEarnings: totalMoney,
        };
      });
    }, 1000);
    
    return () => {
      if (minerIntervalRef.current) {
        clearInterval(minerIntervalRef.current);
        minerIntervalRef.current = null;
      }
    };
  }, [gameState.minerCount, gameState.isBlocked]);

  // Mine passive income tick - Each mine = 20 miner-equivalents of passive income
  // Special: With Temple Rank 2/3, generates 20% of click money every 0.5s instead
  const mineIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (mineIntervalRef.current) {
      clearInterval(mineIntervalRef.current);
      mineIntervalRef.current = null;
    }
    
    // Don't run if no mines or blocked
    if (gameState.buildings.mine.count <= 0 || gameState.isBlocked) {
      return;
    }
    
    // Check if using Temple Rank 2/3 (can't buy miners - special mine income)
    const equippedTempleRank = gameState.buildings.temple.equippedRank;
    const useSpecialMineIncome = equippedTempleRank === 2 || equippedTempleRank === 3;
    
    // Tick interval: 1 second normally, 0.5 seconds for special mine income
    const tickInterval = useSpecialMineIncome ? 500 : 1000;
    
    mineIntervalRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.buildings.mine.count <= 0 || prev.isBlocked) return prev;
        
        const mineCount = prev.buildings.mine.count;
        const rock = getRockById(prev.currentRockId) || ROCKS[0];
        
        let moneyBonus = 0;
        let damageBonus = 0;
        let yOvMoney = 0;
        let yOvDamage = 0;
        
        for (const itemId of prev.equippedTrinketIds) {
          const isRelic = itemId.endsWith('_relic');
          const isTalisman = itemId.endsWith('_talisman');
          const baseId = isRelic ? itemId.replace('_relic', '') : isTalisman ? itemId.replace('_talisman', '') : itemId;
          const trinket = TRINKETS.find(t => t.id === baseId);
          if (trinket) {
            const useOverride = baseId === 'yates_totem' && (isRelic || isTalisman);
            const e = useOverride
              ? (isRelic ? YATES_TOTEM_RELIC_EFFECTS : YATES_TOTEM_TALISMAN_EFFECTS)
              : trinket.effects;
            let multiplier = 1;
            if (!useOverride) {
              if (isRelic) multiplier = RELIC_MULTIPLIERS[trinket.rarity] || 1;
              else if (isTalisman) multiplier = TALISMAN_MULTIPLIERS[trinket.rarity] || 1;
            }
            if (useOverride) {
              yOvMoney += ((e.moneyBonus || 0) + (e.allBonus || 0)) * multiplier;
              yOvDamage += ((e.minerDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
            } else {
              moneyBonus += ((e.moneyBonus || 0) + (e.allBonus || 0)) * multiplier;
              damageBonus += ((e.minerDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
            }
          }
        }
        moneyBonus += yOvMoney;
        damageBonus += yOvDamage;
        
        // Prestige upgrade bonuses
        for (const upgradeId of prev.ownedPrestigeUpgradeIds) {
          const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
          if (upgrade) {
            const allB = upgrade.effects.allBonus || 0;
            moneyBonus += (upgrade.effects.moneyBonus || 0) + allB;
            damageBonus += (upgrade.effects.minerDamageBonus || 0) + allB;
          }
        }
        
        // Temple bonuses (Light path)
        const templeRank = prev.buildings.temple.equippedRank;
        const templeValues: Record<number, { money: number; pcxDamage: number }> = {
          1: { money: 0.27, pcxDamage: 0.36 },
          2: { money: 0.55, pcxDamage: 0.73 },
          3: { money: 0.90, pcxDamage: 1.20 },
        };
        if (templeRank && prev.chosenPath === 'light') {
          const bonus = templeValues[templeRank];
          if (bonus) {
            moneyBonus += bonus.money;
            damageBonus += bonus.pcxDamage;
          }
        }
        
        // Wizard ritual 3x multiplier
        if (prev.buildings.wizard_tower.ritualActive && 
            prev.buildings.wizard_tower.ritualEndTime &&
            Date.now() < prev.buildings.wizard_tower.ritualEndTime) {
          moneyBonus = (1 + moneyBonus) * 3 - 1;
          damageBonus = (1 + damageBonus) * 3 - 1;
        }
        
        if (templeRank === 2 || templeRank === 3) {
          // Special mode: 20% of click money every 0.5s per mine
          const pickaxe = getPickaxeById(prev.currentPickaxeId);
          const clickMoney = safeMoney(rock.moneyPerClick * prev.prestigeMultiplier * (1 + moneyBonus));
          const passiveMoney = safeMoney(clickMoney * 0.20 * mineCount);
          
          return {
            ...prev,
            yatesDollars: safeAdd(prev.yatesDollars, passiveMoney),
            totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, passiveMoney),
          };
        } else {
          // Normal mode: Each mine = 20 miner-equivalents of damage
          const minerEquivalents = mineCount * 20; // Each mine = 20 miner-equivalents
          const damage = Math.ceil(minerEquivalents * MINER_BASE_DAMAGE * (1 + damageBonus));
          
          const newHP = prev.currentRockHP - damage;
          const newTotalClicks = prev.totalClicks + damage;
          
          // Rock didn't break
          if (newHP > 0) {
            return {
              ...prev,
              currentRockHP: newHP,
              totalClicks: newTotalClicks,
            };
          }
          
          // Rock broke
          const overkillDamage = Math.abs(newHP);
          const fullRockHP = getScaledRockHP(rock.clicksToBreak, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0);
          const additionalRocks = Math.floor(overkillDamage / fullRockHP);
          const totalRocksBroken = 1 + additionalRocks;
          const leftoverDamage = overkillDamage % fullRockHP;
          const finalHP = fullRockHP - leftoverDamage;
          
          const moneyPerRock = safeMoney(rock.moneyPerBreak * prev.prestigeMultiplier * (1 + moneyBonus));
          const totalMoney = safeMoney(moneyPerRock * totalRocksBroken);
          
          const highestUnlocked = getHighestUnlockedRock(newTotalClicks, prev.prestigeCount);
          const newCurrentRockId = highestUnlocked.id > prev.currentRockId ? highestUnlocked.id : prev.currentRockId;
          const nextRock = getRockById(newCurrentRockId) || ROCKS[0];
          
          return {
            ...prev,
            currentRockHP: newCurrentRockId !== prev.currentRockId ? getScaledRockHP(nextRock.clicksToBreak, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0) : finalHP,
            currentRockId: newCurrentRockId,
            rocksMinedCount: prev.rocksMinedCount + totalRocksBroken,
            yatesDollars: safeAdd(prev.yatesDollars, totalMoney),
            totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, totalMoney),
            totalClicks: newTotalClicks,
          };
        }
      });
    }, tickInterval);
    
    return () => {
      if (mineIntervalRef.current) {
        clearInterval(mineIntervalRef.current);
        mineIntervalRef.current = null;
      }
    };
  }, [gameState.buildings.mine.count, gameState.buildings.temple.equippedRank, gameState.isBlocked]);

  // Factory buff generation tick
  const factoryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (factoryIntervalRef.current) {
      clearInterval(factoryIntervalRef.current);
      factoryIntervalRef.current = null;
    }
    
    // Don't run if no factories
    if (gameState.buildings.factory.count <= 0) {
      return;
    }
    
    // Check every 5 seconds if it's time to generate a buff
    factoryIntervalRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.buildings.factory.count <= 0) return prev;
        
        const now = Date.now();
        const nextBuffTime = prev.buildings.factory.nextBuffTime || 0;
        
        // Not time yet
        if (now < nextBuffTime) return prev;
        
        // Generate a new buff!
        const factoryCount = prev.buildings.factory.count;
        const newBuff = generateFactoryBuff();
        
        // Calculate next buff time (10-12 min base, -5s per factory)
        const reduction = (factoryCount - 1) * FACTORY_BUFF_REDUCTION_PER_FACTORY;
        const minInterval = Math.max(60000, FACTORY_BUFF_MIN_INTERVAL - reduction);
        const maxInterval = Math.max(90000, FACTORY_BUFF_MAX_INTERVAL - reduction);
        const nextTime = now + minInterval + Math.random() * (maxInterval - minInterval);
        
        return {
          ...prev,
          activeBuffs: [...prev.activeBuffs, newBuff],
          buildings: {
            ...prev.buildings,
            factory: {
              ...prev.buildings.factory,
              lastBuffTime: now,
              nextBuffTime: nextTime,
            },
          },
        };
      });
    }, 5000);
    
    return () => {
      if (factoryIntervalRef.current) {
        clearInterval(factoryIntervalRef.current);
        factoryIntervalRef.current = null;
      }
    };
  }, [gameState.buildings.factory.count]);

  // Temple tax tick - applies tax based on equipped rank
  const templeTaxIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (templeTaxIntervalRef.current) {
      clearInterval(templeTaxIntervalRef.current);
      templeTaxIntervalRef.current = null;
    }
    
    const equippedRank = gameState.buildings.temple.equippedRank;
    if (!equippedRank || gameState.chosenPath !== 'light') {
      return;
    }
    
    // Check every 10 seconds for tax time
    templeTaxIntervalRef.current = setInterval(() => {
      setGameState(prev => {
        const rank = prev.buildings.temple.equippedRank;
        if (!rank || prev.chosenPath !== 'light') return prev;
        
        const now = Date.now();
        const lastTaxTime = prev.buildings.temple.lastTaxTime || now;
        
        // Tax config: rank 1 = 5% every 5min, rank 2 = 12% every 12min, rank 3 = 25% every 25min
        const taxConfig: Record<number, { percent: number; intervalMs: number }> = {
          1: { percent: 0.05, intervalMs: 5 * 60 * 1000 },
          2: { percent: 0.12, intervalMs: 12 * 60 * 1000 },
          3: { percent: 0.25, intervalMs: 25 * 60 * 1000 },
        };
        
        const config = taxConfig[rank];
        if (!config) return prev;
        
        // Not time yet
        if (now - lastTaxTime < config.intervalMs) return prev;
        
        // Apply tax
        const taxAmount = Math.ceil(prev.yatesDollars * config.percent);
        
        return {
          ...prev,
          yatesDollars: prev.yatesDollars - taxAmount,
          buildings: {
            ...prev.buildings,
            temple: {
              ...prev.buildings.temple,
              lastTaxTime: now,
            },
          },
        };
      });
    }, 10000);
    
    return () => {
      if (templeTaxIntervalRef.current) {
        clearInterval(templeTaxIntervalRef.current);
        templeTaxIntervalRef.current = null;
      }
    };
  }, [gameState.buildings.temple.equippedRank, gameState.chosenPath]);

  // Dark Miner money stealing (from Dark Ritual backfire)
  // Steals 5% of money every 2 minutes per 200 dark miners
  const darkMinerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (darkMinerIntervalRef.current) {
      clearInterval(darkMinerIntervalRef.current);
      darkMinerIntervalRef.current = null;
    }
    
    const darkMiners = gameState.buildings.wizard_tower.darkMiners;
    if (!darkMiners || darkMiners <= 0) return;
    
    // Check every 10 seconds if it's time to steal
    darkMinerIntervalRef.current = setInterval(() => {
      setGameState(prev => {
        const now = Date.now();
        const nextSteal = prev.buildings.wizard_tower.darkMinerNextSteal;
        
        if (!nextSteal || now < nextSteal) return prev;
        
        // Steal 5% per 200 dark miners
        const stealPercent = (prev.buildings.wizard_tower.darkMiners / 200) * 0.05;
        const amountStolen = Math.floor(prev.yatesDollars * stealPercent);
        
        return {
          ...prev,
          yatesDollars: prev.yatesDollars - amountStolen,
          buildings: {
            ...prev.buildings,
            wizard_tower: {
              ...prev.buildings.wizard_tower,
              darkMinerNextSteal: now + 120000, // Next steal in 2 minutes
            },
          },
        };
      });
    }, 10000);
    
    return () => {
      if (darkMinerIntervalRef.current) {
        clearInterval(darkMinerIntervalRef.current);
        darkMinerIntervalRef.current = null;
      }
    };
  }, [gameState.buildings.wizard_tower.darkMiners]);

  // Auto-prestige logic - check inside setGameState to avoid stale closures
  useEffect(() => {
    if (!gameState.autoPrestigeEnabled) return;
    
    const interval = setInterval(() => {
      setGameState(prev => {
        const rockRequired = getPrestigeRockRequirement(prev.prestigeCount);
        const pickaxeRequired = getPrestigePickaxeRequirement(prev.prestigeCount, prev.chosenPath);
        
        // Check requirements using prev (latest state)
        const canDo = prev.currentRockId >= rockRequired &&
          (pickaxeRequired === -1 || prev.ownedPickaxeIds.includes(pickaxeRequired));
        
        if (!canDo) return prev; // No change
        
        // Trigger prestige
        const isYates = userId === YATES_ACCOUNT_ID;
        const newPrestigeCount = prev.prestigeCount + 1;
        const isPastMaxPrestige = prev.prestigeCount >= MAX_PRESTIGE_WITH_BUFFS;
        const newMultiplier = isPastMaxPrestige 
          ? prev.prestigeMultiplier 
          : 1.0 + (newPrestigeCount * 0.1);
        const tokensToAdd = isPastMaxPrestige ? 0 : PRESTIGE_TOKENS_PER_PRESTIGE;
        const ownsTotem = prev.ownedTrinketIds.includes('totem');
        
        // Track fastest prestige time (for ranking) - same as manual prestige
        const prestigeTime = Date.now() - (prev.gameStartTime || Date.now());
        const newFastestTime = prev.fastestPrestigeTime === null 
          ? prestigeTime 
          : Math.min(prev.fastestPrestigeTime, prestigeTime);
        
        return {
          ...prev,
          currentRockId: 1,
          currentRockHP: getScaledRockHP(ROCKS[0].clicksToBreak, newPrestigeCount, prev.isHardMode, prev.sideLevel || 0),
          currentPickaxeId: 1,
          ownedPickaxeIds: [1],
          totalClicks: 0,
          minerCount: 0,
          yatesDollars: (isYates || ownsTotem) ? prev.yatesDollars : 0,
          prestigeCount: newPrestigeCount,
          prestigeMultiplier: newMultiplier,
          prestigeTokens: prev.prestigeTokens + tokensToAdd,
          stokens: prev.stokens + (newPrestigeCount % 5 === 0 ? 1 : 0),
          hasTotemProtection: false,
          ownedTrinketIds: ownsTotem ? prev.ownedTrinketIds.filter(id => id !== 'totem') : prev.ownedTrinketIds,
          equippedTrinketIds: ownsTotem ? prev.equippedTrinketIds.filter(id => id !== 'totem') : prev.equippedTrinketIds,
          // Ranking: track fastest prestige time and reset game start
          fastestPrestigeTime: newFastestTime,
          gameStartTime: Date.now(),
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState.autoPrestigeEnabled, userId]);

  // Stock market unlock tracking - permanently unlock when requirements first met
  useEffect(() => {
    // Skip if already unlocked
    if (gameState.hasStocksUnlocked) return;
    
    // Check requirements: rock 16 AND pickaxe ID 12
    const meetsRequirements = gameState.currentRockId >= 16 && gameState.ownedPickaxeIds.includes(12);
    
    if (meetsRequirements) {
      console.log('📈 Stock market permanently unlocked!');
      setGameState(prev => ({
        ...prev,
        hasStocksUnlocked: true,
      }));
    }
  }, [gameState.currentRockId, gameState.ownedPickaxeIds, gameState.hasStocksUnlocked]);

  // Achievement tracking - permanently unlock achievements when criteria met
  useEffect(() => {
    const newUnlocks: string[] = [];
    
    for (const achievement of ACHIEVEMENTS) {
      // Skip if already permanently unlocked
      if (gameState.unlockedAchievementIds?.includes(achievement.id)) continue;
      
      // Check if should unlock based on current state
      if (shouldUnlockAchievement(achievement, gameState)) {
        newUnlocks.push(achievement.id);
      }
    }
    
    // If there are new unlocks, add them to the permanent list
    if (newUnlocks.length > 0) {
      setGameState(prev => ({
        ...prev,
        unlockedAchievementIds: [...(prev.unlockedAchievementIds || []), ...newUnlocks],
      }));
    }
  }, [
    gameState.ownedPickaxeIds,
    gameState.currentRockId,
    gameState.yatesDollars,
    gameState.prestigeCount,
    gameState.minerCount,
    gameState.ownedTrinketIds,
    gameState.unlockedAchievementIds,
  ]);

  // Helper function to calculate total bonuses from equipped trinkets and prestige upgrades
  const calculateTotalBonuses = useCallback(() => {
    let bonuses = {
      moneyBonus: 0,
      rockDamageBonus: 0,
      clickSpeedBonus: 0,
      couponBonus: 0,
      minerSpeedBonus: 0,
      minerDamageBonus: 0,
    };

    // Yates Totem overrides are final values — kept separate so trinketMultiplier doesn't inflate them
    let yatesOverride = { moneyBonus: 0, rockDamageBonus: 0, clickSpeedBonus: 0, couponBonus: 0, minerSpeedBonus: 0, minerDamageBonus: 0 };
    
    for (const itemId of gameState.equippedTrinketIds) {
      const isRelic = itemId.endsWith('_relic');
      const isTalisman = itemId.endsWith('_talisman');
      const baseTrinketId = isRelic 
        ? itemId.replace('_relic', '') 
        : isTalisman 
          ? itemId.replace('_talisman', '') 
          : itemId;
      
      const trinket = TRINKETS.find(t => t.id === baseTrinketId);
      if (trinket) {
        const useOverride = baseTrinketId === 'yates_totem' && (isRelic || isTalisman);
        const e = useOverride
          ? (isRelic ? YATES_TOTEM_RELIC_EFFECTS : YATES_TOTEM_TALISMAN_EFFECTS)
          : trinket.effects;
        
        let multiplier = 1;
        if (!useOverride) {
          if (isRelic) multiplier = RELIC_MULTIPLIERS[trinket.rarity] || 1;
          else if (isTalisman) multiplier = TALISMAN_MULTIPLIERS[trinket.rarity] || 1;
        }

        const target = useOverride ? yatesOverride : bonuses;
        target.moneyBonus += ((e.moneyBonus || 0) + (e.allBonus || 0) + (e.minerMoneyBonus || 0)) * multiplier;
        target.rockDamageBonus += ((e.rockDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
        target.clickSpeedBonus += ((e.clickSpeedBonus || 0) + (e.allBonus || 0)) * multiplier;
        target.couponBonus += ((e.couponBonus || 0) + (e.couponLuckBonus || 0) + (e.allBonus || 0)) * multiplier;
        target.minerSpeedBonus += ((e.minerSpeedBonus || 0) + (e.allBonus || 0)) * multiplier;
        target.minerDamageBonus += ((e.minerDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
      }
    }
    
    let trinketMultiplier = 1.0;
    for (const upgradeId of gameState.ownedPrestigeUpgradeIds) {
      const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
      if (upgrade?.effects.trinketBonus) {
        trinketMultiplier += upgrade.effects.trinketBonus;
      }
    }

    if (gameState.chosenPath === 'light') {
      trinketMultiplier += 0.50;
    }
    
    bonuses.moneyBonus = bonuses.moneyBonus * trinketMultiplier + yatesOverride.moneyBonus;
    bonuses.rockDamageBonus = bonuses.rockDamageBonus * trinketMultiplier + yatesOverride.rockDamageBonus;
    bonuses.clickSpeedBonus = bonuses.clickSpeedBonus * trinketMultiplier + yatesOverride.clickSpeedBonus;
    bonuses.couponBonus = bonuses.couponBonus * trinketMultiplier + yatesOverride.couponBonus;
    bonuses.minerSpeedBonus = bonuses.minerSpeedBonus * trinketMultiplier + yatesOverride.minerSpeedBonus;
    bonuses.minerDamageBonus = bonuses.minerDamageBonus * trinketMultiplier + yatesOverride.minerDamageBonus;
    
    // Add bonuses from prestige upgrades (not multiplied by trinketBonus)
    for (const upgradeId of gameState.ownedPrestigeUpgradeIds) {
      const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
      if (upgrade) {
        const e = upgrade.effects;
        const allB = e.allBonus || 0;
        bonuses.moneyBonus += (e.moneyBonus || 0) + allB;
        bonuses.rockDamageBonus += (e.rockDamageBonus || 0) + allB;
        bonuses.clickSpeedBonus += (e.clickSpeedBonus || 0) + allB;
        bonuses.couponBonus += (e.couponBonus || 0) + allB;
        bonuses.minerSpeedBonus += (e.minerSpeedBonus || 0) + allB;
        bonuses.minerDamageBonus += (e.minerDamageBonus || 0) + allB;
      }
    }

    // Add bonuses from equipped titles (Pro Player system)
    for (const titleId of (gameState.equippedTitleIds || [])) {
      const title = TITLES.find(t => t.id === titleId);
      if (title) {
        const allB = title.buffs.allBonus || 0;
        const speedB = title.buffs.speedBonus || 0;
        bonuses.moneyBonus += (title.buffs.moneyBonus || 0) + allB;
        bonuses.rockDamageBonus += allB;
        bonuses.clickSpeedBonus += allB + speedB;
        bonuses.couponBonus += allB;
        bonuses.minerSpeedBonus += allB + speedB;
        bonuses.minerDamageBonus += allB;
      }
    }

    // LIGHT PATH BONUS: +30% more money
    if (gameState.chosenPath === 'light') {
      bonuses.moneyBonus += 0.30;
    }

    // SACRIFICE BUFF (Darkness path) - check if active
    if (gameState.sacrificeBuff && Date.now() < gameState.sacrificeBuff.endsAt) {
      const buff = gameState.sacrificeBuff;
      bonuses.moneyBonus += buff.moneyBonus;
      bonuses.rockDamageBonus += buff.pcxDamageBonus;
      bonuses.minerDamageBonus += buff.minerDamageBonus;
      // allBonus applies to everything
      if (buff.allBonus > 0) {
        bonuses.moneyBonus += buff.allBonus;
        bonuses.rockDamageBonus += buff.allBonus;
        bonuses.clickSpeedBonus += buff.allBonus;
        bonuses.couponBonus += buff.allBonus;
        bonuses.minerSpeedBonus += buff.allBonus;
        bonuses.minerDamageBonus += buff.allBonus;
      }
    }

    // TEMPLE BONUSES (Light path) - based on equipped rank
    const equippedTempleRank = gameState.buildings.temple.equippedRank;
    if (equippedTempleRank && gameState.chosenPath === 'light') {
      const templeValues: Record<number, { money: number; pcxDamage: number; prestigePower: number; trinketPower: number }> = {
        1: { money: 0.27, pcxDamage: 0.36, prestigePower: 0.15, trinketPower: 0.24 },
        2: { money: 0.55, pcxDamage: 0.73, prestigePower: 0.30, trinketPower: 0.49 },
        3: { money: 0.90, pcxDamage: 1.20, prestigePower: 0.50, trinketPower: 0.81 },
      };
      const templeBonus = templeValues[equippedTempleRank];
      if (templeBonus) {
        bonuses.moneyBonus += templeBonus.money;
        bonuses.rockDamageBonus += templeBonus.pcxDamage;
        // Note: prestigePower and trinketPower are applied separately in prestige/trinket calculations
      }
    }

    // WIZARD RITUAL (Darkness path) - 3x ALL stats when active
    if (gameState.buildings.wizard_tower.ritualActive && 
        gameState.buildings.wizard_tower.ritualEndTime && 
        Date.now() < gameState.buildings.wizard_tower.ritualEndTime) {
      // Triple all current bonuses (3x = add 2x more on top of current)
      bonuses.moneyBonus = (1 + bonuses.moneyBonus) * 3 - 1;
      bonuses.rockDamageBonus = (1 + bonuses.rockDamageBonus) * 3 - 1;
      bonuses.clickSpeedBonus = (1 + bonuses.clickSpeedBonus) * 3 - 1;
      bonuses.couponBonus = (1 + bonuses.couponBonus) * 3 - 1;
      bonuses.minerSpeedBonus = (1 + bonuses.minerSpeedBonus) * 3 - 1;
      bonuses.minerDamageBonus = (1 + bonuses.minerDamageBonus) * 3 - 1;
    }

    // PREMIUM PRODUCT BUFFS
    for (const productId of gameState.ownedPremiumProductIds) {
      const buff = PREMIUM_PRODUCT_BUFFS[productId];
      if (buff) {
        // Money multiplier (multiplicative - e.g., 2x means double)
        if (buff.moneyMultiplier) {
          bonuses.moneyBonus = (1 + bonuses.moneyBonus) * buff.moneyMultiplier - 1;
        }
        // Click speed bonus (additive)
        if (buff.clickSpeedBonus) {
          bonuses.clickSpeedBonus += buff.clickSpeedBonus;
        }
        // Miner speed bonus (additive)
        if (buff.minerSpeedBonus) {
          bonuses.minerSpeedBonus += buff.minerSpeedBonus;
        }
        // Building speed bonus is tracked separately and applied in building calculations
      }
    }

    // SHADY SAM SWAPS (Darkness path only) — debuff one stat, buff another
    const samStatMap: Record<ShadySamStat, keyof typeof bonuses> = {
      couponLuck: 'couponBonus',
      minerSpeed: 'minerSpeedBonus',
      clickDamage: 'clickSpeedBonus',
      pcxDamage: 'rockDamageBonus',
      moneyMultiplier: 'moneyBonus',
      minerDamage: 'minerDamageBonus',
    };
    for (const swap of (gameState.shadySamSwaps || [])) {
      const debuffKey = samStatMap[swap.debuffStat];
      const buffKey = samStatMap[swap.buffStat];
      if (debuffKey && buffKey) {
        // Can only sacrifice what you actually have (floor at 0)
        const actual = Math.min(swap.amount, Math.max(0, bonuses[debuffKey]));
        bonuses[debuffKey] -= actual;
        bonuses[buffKey] += actual;
      }
    }
    
    // Side Level permanent buffs (10% random stat per level-up)
    for (const [stat, amount] of Object.entries(gameState.sideLevelBuffs || {})) {
      if (stat in bonuses) {
        bonuses[stat as keyof typeof bonuses] += amount;
      }
    }

    // Floor all stats at 0
    for (const key of Object.keys(bonuses) as (keyof typeof bonuses)[]) {
      if (bonuses[key] < 0) bonuses[key] = 0;
    }
    
    return bonuses;
  }, [gameState.equippedTrinketIds, gameState.ownedPrestigeUpgradeIds, gameState.equippedTitleIds, gameState.chosenPath, gameState.sacrificeBuff, gameState.buildings.temple.equippedRank, gameState.buildings.wizard_tower.ritualActive, gameState.buildings.wizard_tower.ritualEndTime, gameState.ownedPremiumProductIds, gameState.shadySamSwaps, gameState.sideLevelBuffs]);

  // Track dirty state for throttled localStorage saves
  const localSaveDirtyRef = useRef(false);
  const localSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mark state as dirty on every change (but don't write to localStorage every time)
  useEffect(() => {
    if (!isLoaded || isLoadingRef.current) return;
    localSaveDirtyRef.current = true;
  }, [gameState, shopStock, isLoaded]);

  // Throttled localStorage writer: flush at most every 1.5 seconds
  useEffect(() => {
    if (!isLoaded) return;
    localSaveIntervalRef.current = setInterval(() => {
      if (!localSaveDirtyRef.current || isLoadingRef.current) return;
      localSaveDirtyRef.current = false;
      try {
        if (isCorruptNumber(gameState.yatesDollars) || isCorruptNumber(gameState.totalClicks) || isCorruptNumber(gameState.totalMoneyEarned)) {
          return;
        }
        const storageKey = getStorageKey(userId, gameState.isHardMode);
        localStorage.setItem(storageKey, JSON.stringify({ ...gameState, localUpdatedAt: Date.now(), shopStock }));
      } catch (err) {
        console.error('❌ Error saving to localStorage:', err);
      }
    }, 1500);
    return () => {
      if (localSaveIntervalRef.current) clearInterval(localSaveIntervalRef.current);
    };
  }, [isLoaded, userId, gameState, shopStock]);

  // Save to Supabase whenever state changes (debounced by userDataSync)
  useEffect(() => {
    // Don't save during initial load - wait until data is loaded
    if (!isLoaded || isLoadingRef.current) {
      return;
    }
    
    try {
      // CRITICAL: Skip save if core numeric fields are corrupt (NaN/Infinity/null)
      if (isCorruptNumber(gameState.yatesDollars) || isCorruptNumber(gameState.totalClicks) || isCorruptNumber(gameState.totalMoneyEarned)) {
        console.error('🚨 SUPABASE SAVE BLOCKED: Corrupt game state detected!', {
          yatesDollars: gameState.yatesDollars,
          totalClicks: gameState.totalClicks,
          totalMoneyEarned: gameState.totalMoneyEarned,
        });
        return;
      }

      // If logged in, also sync to Supabase (debounced)
      // The debounce system has a cooldown after forceImmediateSave to prevent
      // stale data from overwriting prestige resets.
      if (userId && userType) {
        debouncedSaveUserGameData({
          user_id: userId,
          user_type: userType,
          // Core game state
          yates_dollars: gameState.yatesDollars,
          total_clicks: gameState.totalClicks,
          current_pickaxe_id: gameState.currentPickaxeId,
          current_rock_id: gameState.currentRockId,
          current_rock_hp: gameState.currentRockHP,
          rocks_mined_count: gameState.rocksMinedCount,
          owned_pickaxe_ids: gameState.ownedPickaxeIds,
          // Coupons
          coupons_30: gameState.coupons.discount30,
          coupons_50: gameState.coupons.discount50,
          coupons_100: gameState.coupons.discount100,
          // Game settings
          has_seen_cutscene: gameState.hasSeenCutscene,
          has_autoclicker: gameState.hasAutoclicker,
          autoclicker_enabled: gameState.autoclickerEnabled,
          // Anti-cheat fields
          anti_cheat_warnings: gameState.antiCheatWarnings,
          is_on_watchlist: gameState.isOnWatchlist,
          is_blocked: gameState.isBlocked,
          appeal_pending: gameState.appealPending,
          // Trinkets
          owned_trinket_ids: gameState.ownedTrinketIds,
          equipped_trinket_ids: gameState.equippedTrinketIds,
          trinket_shop_items: gameState.trinketShopItems,
          trinket_shop_last_refresh: gameState.trinketShopLastRefresh,
          has_totem_protection: gameState.hasTotemProtection,
          has_stocks_unlocked: gameState.hasStocksUnlocked,
          // Relics & Talismans
          owned_relic_ids: gameState.ownedRelicIds,
          owned_talisman_ids: gameState.ownedTalismanIds,
          // Miners
          miner_count: gameState.minerCount,
          miner_last_tick: gameState.minerLastTick,
          // Prestige
          prestige_count: gameState.prestigeCount,
          prestige_multiplier: gameState.prestigeMultiplier,
          prestige_tokens: gameState.prestigeTokens,
          owned_prestige_upgrade_ids: gameState.ownedPrestigeUpgradeIds,
          auto_prestige_enabled: gameState.autoPrestigeEnabled,
          // Achievements
          unlocked_achievement_ids: gameState.unlockedAchievementIds,
          // Ranking system
          total_money_earned: gameState.totalMoneyEarned,
          game_start_time: gameState.gameStartTime,
          fastest_prestige_time: gameState.fastestPrestigeTime,
          // Pro Player Titles
          owned_title_ids: gameState.ownedTitleIds,
          equipped_title_ids: gameState.equippedTitleIds,
          title_win_counts: gameState.titleWinCounts,
          // Path system
          chosen_path: gameState.chosenPath,
          side_level: gameState.sideLevel,
          side_level_buffs: JSON.stringify(gameState.sideLevelBuffs),
          total_golden_cookies_collected: gameState.totalGoldenCookiesCollected,
          total_miners_sacrificed: gameState.totalMinersSacrificed,
          // Tax system
          last_tax_time: gameState.lastTaxTime,
          // Loans
          loan_amount: gameState.loanAmount,
          loan_taken_at: gameState.loanTakenAt,
          loan_last_accrual_at: gameState.loanLastAccrualAt,
          // Playtime tracking
          total_playtime_seconds: gameState.totalPlaytimeSeconds,
          // Premium products - only if has items
          ...(gameState.ownedPremiumProductIds?.length ? { owned_premium_product_ids: gameState.ownedPremiumProductIds } : {}),
          // Buildings data (bank, factory, temple, etc.) - serialized as JSON
          buildings_data: JSON.stringify(gameState.buildings),
          // Stokens & Lottery Tickets
          stokens: gameState.stokens,
          lottery_tickets: gameState.lotteryTickets,
          // Shady Sam
          shady_sam_swaps: JSON.stringify(gameState.shadySamSwaps),
        }, gameState.isHardMode);
      }
    } catch (err) {
      console.error('❌ Error saving game data:', err);
    }
  }, [gameState, shopStock, isLoaded, userId, userType]);

  // Build the full save payload from a GameState snapshot — single source
  // of truth used by both keepalive handlers so no fields are ever missed.
  const buildSavePayload = (state: GameState, uid: string, utype: 'employee' | 'client') => ({
    user_id: uid,
    user_type: utype,
    yates_dollars: state.yatesDollars,
    total_clicks: state.totalClicks,
    current_pickaxe_id: state.currentPickaxeId,
    current_rock_id: state.currentRockId,
    current_rock_hp: state.currentRockHP,
    rocks_mined_count: state.rocksMinedCount,
    owned_pickaxe_ids: state.ownedPickaxeIds,
    coupons_30: state.coupons.discount30,
    coupons_50: state.coupons.discount50,
    coupons_100: state.coupons.discount100,
    has_seen_cutscene: state.hasSeenCutscene,
    has_autoclicker: state.hasAutoclicker,
    autoclicker_enabled: state.autoclickerEnabled,
    prestige_count: state.prestigeCount,
    prestige_multiplier: state.prestigeMultiplier,
    anti_cheat_warnings: state.antiCheatWarnings,
    is_on_watchlist: state.isOnWatchlist,
    is_blocked: state.isBlocked,
    appeal_pending: state.appealPending,
    owned_trinket_ids: state.ownedTrinketIds,
    equipped_trinket_ids: state.equippedTrinketIds,
    trinket_shop_items: state.trinketShopItems,
    trinket_shop_last_refresh: state.trinketShopLastRefresh,
    has_totem_protection: state.hasTotemProtection,
    has_stocks_unlocked: state.hasStocksUnlocked,
    owned_relic_ids: state.ownedRelicIds,
    owned_talisman_ids: state.ownedTalismanIds,
    miner_count: state.minerCount,
    miner_last_tick: state.minerLastTick,
    prestige_tokens: state.prestigeTokens,
    owned_prestige_upgrade_ids: state.ownedPrestigeUpgradeIds,
    auto_prestige_enabled: state.autoPrestigeEnabled,
    unlocked_achievement_ids: state.unlockedAchievementIds,
    total_money_earned: state.totalMoneyEarned,
    game_start_time: state.gameStartTime,
    fastest_prestige_time: state.fastestPrestigeTime,
    owned_title_ids: state.ownedTitleIds,
    equipped_title_ids: state.equippedTitleIds,
    title_win_counts: state.titleWinCounts,
    chosen_path: state.chosenPath,
    side_level: state.sideLevel,
    side_level_buffs: JSON.stringify(state.sideLevelBuffs),
    total_golden_cookies_collected: state.totalGoldenCookiesCollected,
    total_miners_sacrificed: state.totalMinersSacrificed,
    last_tax_time: state.lastTaxTime,
    loan_amount: state.loanAmount,
    loan_taken_at: state.loanTakenAt,
    loan_last_accrual_at: state.loanLastAccrualAt,
    total_playtime_seconds: state.totalPlaytimeSeconds,
    ...(state.ownedPremiumProductIds?.length ? { owned_premium_product_ids: state.ownedPremiumProductIds } : {}),
    buildings_data: JSON.stringify(state.buildings),
    stokens: state.stokens,
    lottery_tickets: state.lotteryTickets,
    shady_sam_swaps: JSON.stringify(state.shadySamSwaps),
  });

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!userId || !userType) return false;
    try {
      const payload = buildSavePayload(gameState, userId, userType);
      const result = await forceImmediateSave(payload);
      const storageKey = getStorageKey(userId, gameState.isHardMode);
      localStorage.setItem(storageKey, JSON.stringify({ ...gameState, localUpdatedAt: Date.now() }));
      return result;
    } catch {
      return false;
    }
  }, [gameState, userId, userType]);

  // Save immediately when page is about to unload or tab is hidden
  useEffect(() => {
    if (!userId || !userType) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingData();
        const state = unloadGameStateRef.current;
        keepaliveSave(buildSavePayload(state, userId, userType), state.isHardMode);
      }
    };

    const handleBeforeUnload = () => {
      flushPendingData();
      const state = unloadGameStateRef.current;
      keepaliveSave(buildSavePayload(state, userId, userType), state.isHardMode);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [userId, userType]);

  // Flush pending saves on GameProvider unmount (triggered by mode switch or exit)
  useEffect(() => {
    return () => {
      // Flush localStorage immediately with latest state
      try {
        const state = unloadGameStateRef.current;
        if (state && userId) {
          const storageKey = getStorageKey(userId, state.isHardMode);
          localStorage.setItem(storageKey, JSON.stringify({ ...state, localUpdatedAt: Date.now() }));
        }
      } catch (err) {
        console.error('❌ Error flushing localStorage on unmount:', err);
      }
      // Flush any pending Supabase saves
      flushPendingData();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cheat functions for employees (anyone with numbered ID like 000001, 123456, etc.)
  // Employees have numeric string IDs, clients have UUIDs
  const isEmployee = userId ? /^\d+$/.test(userId) : false;

  // Auto-clear any blocks for employees (they're immune to anti-cheat)
  useEffect(() => {
    if (isEmployee && (gameState.isBlocked || gameState.antiCheatWarnings > 0)) {
      setGameState(prev => ({
        ...prev,
        isBlocked: false,
        antiCheatWarnings: 0,
        appealPending: false,
      }));
    }
  }, [isEmployee, gameState.isBlocked, gameState.antiCheatWarnings]);

  const currentPickaxe = getPickaxeById(gameState.currentPickaxeId) || PICKAXES[0];
  const currentRock = getRockById(gameState.currentRockId) || ROCKS[0];

  // Helper to get active ability bonuses (needs to be before mineRock)
  const getActiveAbilityBonuses = useCallback(() => {
    const bonuses = {
      damageMultiplier: 1,
      minerSpeedBonus: 0,
      allBonus: 0,
    };

    if (!gameState.activeAbility) return bonuses;
    
    // Check if ability is still active
    const { startTime, duration, pickaxeId } = gameState.activeAbility;
    if (duration === 0) return bonuses; // instant abilities don't give ongoing bonuses
    const isActive = Date.now() < startTime + duration;
    if (!isActive) return bonuses;

    const pickaxe = getPickaxeById(pickaxeId);
    const ability = pickaxe?.activeAbility;
    if (!ability) return bonuses;

    switch (ability.effect.type) {
      case 'damage_boost':
        bonuses.damageMultiplier = ability.effect.value;
        break;
      case 'miner_speed':
        bonuses.minerSpeedBonus = ability.effect.value;
        break;
      case 'all_boost':
        bonuses.allBonus = ability.effect.value;
        break;
    }

    return bonuses;
  }, [gameState.activeAbility]);

  // Use a ref to always have fresh gameState for mineRock
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Motivation Pack boost (from Employee Shop). When active, multiplies click damage
  // and earned money by 2x for 1 minute. Ref-based so mineRock always sees latest.
  const motivationBoostUntilRef = useRef<number>(0);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('yates-motivation-boost-until');
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n)) motivationBoostUntilRef.current = n;
      }
    } catch {}
    const onBoost = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.until) motivationBoostUntilRef.current = detail.until;
    };
    window.addEventListener('yates-motivation-boost', onBoost);
    return () => window.removeEventListener('yates-motivation-boost', onBoost);
  }, []);
  const getMotivationMultiplier = useCallback(() => {
    return Date.now() < motivationBoostUntilRef.current ? 2 : 1;
  }, []);

  const mineRock = useCallback(() => {
    const state = gameStateRef.current;
    
    // DEBUG: Log state on every click attempt
    console.log('🔨 MINE CLICK:', { 
      isBlocked: state.isBlocked, 
      appealPending: state.appealPending,
      currentPickaxeId: state.currentPickaxeId,
      currentRockId: state.currentRockId,
      isEmployee 
    });
    
    // Employees bypass ALL anti-cheat (they have terminal access anyway)
    if (!isEmployee) {
      // Anti-cheat: If blocked, don't process clicks
      if (state.isBlocked || state.appealPending) {
        console.log('❌ BLOCKED: isBlocked=', state.isBlocked, 'appealPending=', state.appealPending);
        return { brokeRock: false, earnedMoney: 0, couponDrop: null };
      }

      // Anti-cheat: Check click rate (skip for purchased autoclicker when enabled)
      const isViolation = checkClickRate();
      const hasAutoclickerWhitelist = state.hasAutoclicker && state.autoclickerEnabled;

      if (isViolation && !hasAutoclickerWhitelist) {
        console.log('❌ ANTI-CHEAT VIOLATION: click rate exceeded');
        triggerAntiCheatWarning();
        return { brokeRock: false, earnedMoney: 0, couponDrop: null };
      }
    }

    // Results to return (will be set inside setGameState)
    let brokeRock = false;
    let earnedMoney = 0;
    let couponDrop: string | null = null;

    setGameState((prev) => {
      // Use FRESH state from prev, not stale closure
      const pickaxe = getPickaxeById(prev.currentPickaxeId) || PICKAXES[0];
      const rock = getRockById(prev.currentRockId) || ROCKS[0];
      
      let rockDamageBonus = 0;
      let moneyBonus = 0;
      let couponBonus = 0;
      let clickSpeedBonus = 0;
      let yOvRock = 0, yOvMoney = 0, yOvCoupon = 0, yOvClick = 0;
      
      for (const itemId of prev.equippedTrinketIds) {
        const isRelic = itemId.endsWith('_relic');
        const isTalisman = itemId.endsWith('_talisman');
        const baseTrinketId = isRelic ? itemId.replace('_relic', '') : isTalisman ? itemId.replace('_talisman', '') : itemId;
        const trinket = TRINKETS.find(t => t.id === baseTrinketId);
        if (trinket) {
          const useOverride = baseTrinketId === 'yates_totem' && (isRelic || isTalisman);
          const e = useOverride
            ? (isRelic ? YATES_TOTEM_RELIC_EFFECTS : YATES_TOTEM_TALISMAN_EFFECTS)
            : trinket.effects;
          let multiplier = 1;
          if (!useOverride) {
            if (isRelic) multiplier = RELIC_MULTIPLIERS[trinket.rarity] || 1;
            else if (isTalisman) multiplier = TALISMAN_MULTIPLIERS[trinket.rarity] || 1;
          }
          
          if (useOverride) {
            yOvRock += ((e.rockDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
            yOvMoney += ((e.moneyBonus || 0) + (e.allBonus || 0) + (e.minerMoneyBonus || 0)) * multiplier;
            yOvCoupon += ((e.couponBonus || 0) + (e.couponLuckBonus || 0) + (e.allBonus || 0)) * multiplier;
            yOvClick += ((e.clickSpeedBonus || 0) + (e.allBonus || 0)) * multiplier;
          } else {
            rockDamageBonus += ((e.rockDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
            moneyBonus += ((e.moneyBonus || 0) + (e.allBonus || 0) + (e.minerMoneyBonus || 0)) * multiplier;
            couponBonus += ((e.couponBonus || 0) + (e.couponLuckBonus || 0) + (e.allBonus || 0)) * multiplier;
            clickSpeedBonus += ((e.clickSpeedBonus || 0) + (e.allBonus || 0)) * multiplier;
          }
        }
      }
      
      let trinketMultiplier = 1.0;
      for (const upgradeId of prev.ownedPrestigeUpgradeIds) {
        const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
        if (upgrade?.effects.trinketBonus) trinketMultiplier += upgrade.effects.trinketBonus;
      }
      if (prev.chosenPath === 'light') trinketMultiplier += 0.50;
      rockDamageBonus = rockDamageBonus * trinketMultiplier + yOvRock;
      moneyBonus = moneyBonus * trinketMultiplier + yOvMoney;
      couponBonus = couponBonus * trinketMultiplier + yOvCoupon;
      clickSpeedBonus = clickSpeedBonus * trinketMultiplier + yOvClick;
      
      // Prestige upgrade bonuses (not multiplied by trinketBonus)
      for (const upgradeId of prev.ownedPrestigeUpgradeIds) {
        const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
        if (upgrade) {
          const allB = upgrade.effects.allBonus || 0;
          rockDamageBonus += (upgrade.effects.rockDamageBonus || 0) + allB;
          moneyBonus += (upgrade.effects.moneyBonus || 0) + allB;
          couponBonus += (upgrade.effects.couponBonus || 0) + allB;
          clickSpeedBonus += (upgrade.effects.clickSpeedBonus || 0) + allB;
        }
      }
      
      // Title bonuses
      for (const titleId of (prev.equippedTitleIds || [])) {
        const title = TITLES.find(t => t.id === titleId);
        if (title) {
          const allB = title.buffs.allBonus || 0;
          const speedB = title.buffs.speedBonus || 0;
          moneyBonus += (title.buffs.moneyBonus || 0) + allB;
          rockDamageBonus += allB;
          clickSpeedBonus += allB + speedB;
          couponBonus += allB;
        }
      }
      
      // Light path money bonus
      if (prev.chosenPath === 'light') moneyBonus += 0.30;
      
      // Sacrifice buff (Darkness path)
      if (prev.sacrificeBuff && Date.now() < prev.sacrificeBuff.endsAt) {
        const buff = prev.sacrificeBuff;
        moneyBonus += buff.moneyBonus;
        rockDamageBonus += buff.pcxDamageBonus;
        if (buff.allBonus > 0) {
          moneyBonus += buff.allBonus;
          rockDamageBonus += buff.allBonus;
          clickSpeedBonus += buff.allBonus;
          couponBonus += buff.allBonus;
        }
      }
      
      // Temple bonuses (Light path)
      const equippedTempleRank = prev.buildings.temple.equippedRank;
      if (equippedTempleRank && prev.chosenPath === 'light') {
        const templeValues: Record<number, { money: number; pcxDamage: number }> = {
          1: { money: 0.27, pcxDamage: 0.36 },
          2: { money: 0.55, pcxDamage: 0.73 },
          3: { money: 0.90, pcxDamage: 1.20 },
        };
        const templeBonus = templeValues[equippedTempleRank];
        if (templeBonus) {
          moneyBonus += templeBonus.money;
          rockDamageBonus += templeBonus.pcxDamage;
        }
      }
      
      // Wizard ritual (3x ALL stats when active)
      if (prev.buildings.wizard_tower.ritualActive && 
          prev.buildings.wizard_tower.ritualEndTime && 
          Date.now() < prev.buildings.wizard_tower.ritualEndTime) {
        moneyBonus = (1 + moneyBonus) * 3 - 1;
        rockDamageBonus = (1 + rockDamageBonus) * 3 - 1;
        clickSpeedBonus = (1 + clickSpeedBonus) * 3 - 1;
        couponBonus = (1 + couponBonus) * 3 - 1;
      }
      
      // Active ability bonuses
      let damageMultiplier = 1;
      let allBonus = 0;
      if (prev.activeAbility) {
        const { startTime, duration, pickaxeId } = prev.activeAbility;
        if (duration > 0 && Date.now() < startTime + duration) {
          const abilityPickaxe = getPickaxeById(pickaxeId);
          const ability = abilityPickaxe?.activeAbility;
          if (ability) {
            if (ability.effect.type === 'damage_boost') damageMultiplier = ability.effect.value;
            if (ability.effect.type === 'all_boost') allBonus = ability.effect.value;
          }
        }
      }

      // Wizard ritual multiplier (3x all stats when active)
      let wizardRitualMultiplier = 1;
      if (prev.buildings.wizard_tower.ritualActive && 
          prev.buildings.wizard_tower.ritualEndTime && 
          Date.now() < prev.buildings.wizard_tower.ritualEndTime) {
        wizardRitualMultiplier = 3.0;
      }

      // Factory buff multipliers
      let factoryDamageMultiplier = 1;
      let factoryMoneyMultiplier = 1;
      let factorySpeedMultiplier = 1;
      const now = Date.now();
      for (const buff of prev.activeBuffs) {
        if (buff.startTime + buff.duration > now) {
          if (buff.type === 'damage') factoryDamageMultiplier += buff.multiplier;
          if (buff.type === 'money') factoryMoneyMultiplier += buff.multiplier;
          if (buff.type === 'clickSpeed') factorySpeedMultiplier += buff.multiplier;
        }
      }

      // Temple curse penalties
      let templeCurseMoneyPenalty = 1;
      if (prev.buildings.temple.hasHolyUnluckinessCurse) {
        templeCurseMoneyPenalty = 0.6; // 40% less money
      }
      if (prev.buildings.temple.hiddenCurseActive) {
        templeCurseMoneyPenalty *= 0.9; // Additional 10% less money
      }

      // Calculate click power (clickSpeedBonus multiplies damage: 50% = 1.5x, 100% = 2x)
      let clickPower = pickaxe.clickPower;
      clickPower = Math.ceil(clickPower * (1 + rockDamageBonus + allBonus) * damageMultiplier * (1 + clickSpeedBonus) * wizardRitualMultiplier * factoryDamageMultiplier * factorySpeedMultiplier);

      // Hard Mode: 15% less pickaxe damage
      if (prev.isHardMode) {
        clickPower = Math.ceil(clickPower * HARD_MODE_MODIFIERS.pickaxeDamageMultiplier);
      }

      // Motivation Pack boost (+100% to everything for 1 minute)
      const motivationMult = getMotivationMultiplier();
      if (motivationMult > 1) {
        clickPower = Math.ceil(clickPower * motivationMult);
      }

      clickPower = Math.max(1, clickPower); // Ensure at least 1 damage
      
      const newHP = Math.max(0, prev.currentRockHP - clickPower);
      const willBreak = newHP <= 0;

      // Calculate money earned (clickSpeedBonus also multiplies money: 50% = 1.5x, 100% = 2x)
      // safeMoney prevents NaN/Infinity from multiplier chain corrupting game state
      earnedMoney = rock.moneyPerClick;
      if (willBreak) {
        earnedMoney += rock.moneyPerBreak;
      }
      if (pickaxe.moneyMultiplier) {
        earnedMoney *= pickaxe.moneyMultiplier;
      }
      earnedMoney *= prev.prestigeMultiplier;
      earnedMoney *= (1 + (moneyBonus || 0) + (allBonus || 0));
      earnedMoney *= (1 + (clickSpeedBonus || 0)); // Click speed bonus multiplies money too
      earnedMoney *= (wizardRitualMultiplier || 1); // Wizard ritual 3x
      earnedMoney *= (factoryMoneyMultiplier || 1); // Factory money buff
      earnedMoney *= (templeCurseMoneyPenalty || 1); // Temple curse penalties
      if (motivationMult > 1) {
        earnedMoney *= motivationMult; // Motivation Pack boost
      }
      earnedMoney = safeMoney(earnedMoney);
      
      // Wandering Trader money tax (if deal is active)
      if (prev.wtMoneyTax > 0) {
        earnedMoney = safeMoney(earnedMoney * (1 - prev.wtMoneyTax));
      }

      // Update totals
      const newTotalClicks = prev.totalClicks + clickPower;
      let newRockHP = newHP;
      let newRocksMinedCount = prev.rocksMinedCount;
      let newCurrentRockId = prev.currentRockId;

      // Check if rock broke
      if (willBreak) {
        brokeRock = true;
        newRocksMinedCount += 1;
        
        // Check for rock upgrade (scaled by prestige)
        const highestUnlocked = getHighestUnlockedRock(newTotalClicks, prev.prestigeCount);
        if (highestUnlocked.id > prev.currentRockId) {
          newCurrentRockId = highestUnlocked.id;
        }
        
        // Reset HP for new rock (scaled by prestige)
        const nextRock = getRockById(newCurrentRockId) || rock;
        newRockHP = getScaledRockHP(nextRock.clicksToBreak, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0);
      }

      // Check for lottery ticket drop (rebranded from coupons)
      // Hard Mode: 100% of drops become lottery tickets
      // Normal Mode: 70% chance each drop becomes a lottery ticket
      const meetsRequirements = 
        prev.currentRockId >= COUPON_REQUIREMENTS.minRockId &&
        prev.currentPickaxeId >= COUPON_REQUIREMENTS.minPickaxeId;

      let newCoupons = { ...prev.coupons };
      let newLotteryTickets = prev.lotteryTickets;
      if (meetsRequirements) {
        const luckBonus = (pickaxe.couponLuckBonus || 0) + couponBonus;
        const rand = Math.random();
        
        if (rand < COUPON_DROP_RATES.discount100 * (1 + luckBonus)) {
          couponDrop = 'discount100';
          if (prev.isHardMode) {
            // Hard Mode: 100% instant conversion to lottery ticket
            newLotteryTickets += 1;
          } else {
            // Normal Mode: 70% chance to become lottery ticket
            if (Math.random() < 0.70) newLotteryTickets += 1;
          }
        } else if (rand < COUPON_DROP_RATES.discount50 * (1 + luckBonus)) {
          couponDrop = 'discount50';
          if (prev.isHardMode) {
            newLotteryTickets += 1;
          } else {
            if (Math.random() < 0.70) newLotteryTickets += 1;
          }
        } else if (rand < COUPON_DROP_RATES.discount30 * (1 + luckBonus)) {
          couponDrop = 'discount30';
          if (prev.isHardMode) {
            newLotteryTickets += 1;
          } else {
            if (Math.random() < 0.70) newLotteryTickets += 1;
          }
        }
      }

      return {
        ...prev,
        yatesDollars: safeAdd(prev.yatesDollars, earnedMoney),
        totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, earnedMoney),
        totalClicks: newTotalClicks,
        currentRockHP: newRockHP,
        currentRockId: newCurrentRockId,
        rocksMinedCount: newRocksMinedCount,
        coupons: newCoupons,
        lotteryTickets: newLotteryTickets,
      };
    });

    return { earnedMoney, brokeRock, couponDrop };
  }, [isEmployee, checkClickRate, triggerAntiCheatWarning]);

  const canAffordPickaxe = useCallback((pickaxeId: number) => {
    const pickaxe = getPickaxeById(pickaxeId);
    if (!pickaxe) return false;
    const scaledPrice = Math.floor(pickaxe.price * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0));
    return gameState.yatesDollars >= scaledPrice;
  }, [gameState.yatesDollars, gameState.prestigeCount, gameState.isHardMode]);

  const ownsPickaxe = useCallback((pickaxeId: number) => {
    return gameState.ownedPickaxeIds.includes(pickaxeId);
  }, [gameState.ownedPickaxeIds]);

  const buyPickaxe = useCallback((pickaxeId: number) => {
    const pickaxe = getPickaxeById(pickaxeId);
    if (!pickaxe) return false;
    if (gameState.ownedPickaxeIds.includes(pickaxeId)) return false;
    const scaledPrice = Math.floor(pickaxe.price * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0));
    if (gameState.yatesDollars < scaledPrice) return false;

    window._clickTimestamps = [];
    window._clickTimestamps = [];

    setGameState((prev) => ({
      ...prev,
      yatesDollars: prev.yatesDollars - scaledPrice,
      ownedPickaxeIds: [...prev.ownedPickaxeIds, pickaxeId],
      currentPickaxeId: pickaxeId, // Auto-equip after purchase
      // Reset anti-cheat block if not from appeal (user clearly has money = legitimate play)
      isBlocked: prev.appealPending ? prev.isBlocked : false,
    }));

    return true;
  }, [gameState.ownedPickaxeIds, gameState.yatesDollars, gameState.prestigeCount]);

  const buyAllAffordablePickaxes = useCallback((): number => {
    let bought = 0;
    setGameState(prev => {
      let money = prev.yatesDollars;
      const owned = new Set(prev.ownedPickaxeIds);
      const priceMultiplier = getPrestigePriceMultiplier(prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0);

      const skippedIds = new Set<number>();
      if (prev.chosenPath === 'darkness') {
        LIGHT_PICKAXE_IDS.forEach(id => skippedIds.add(id));
      } else if (prev.chosenPath === 'light') {
        DARKNESS_PICKAXE_IDS.forEach(id => skippedIds.add(id));
      } else {
        LIGHT_PICKAXE_IDS.forEach(id => skippedIds.add(id));
        DARKNESS_PICKAXE_IDS.forEach(id => skippedIds.add(id));
      }

      for (const pickaxe of PICKAXES) {
        if (owned.has(pickaxe.id)) continue;
        if (skippedIds.has(pickaxe.id)) continue;
        const price = Math.floor(pickaxe.price * priceMultiplier);
        if (money < price) continue;

        const prevIds = Array.from(owned);
        const regularOwned = prevIds.filter(id => !skippedIds.has(id));
        const highest = regularOwned.length > 0 ? Math.max(...regularOwned) : 0;
        let nextId = highest + 1;
        while (skippedIds.has(nextId) && nextId <= 30) nextId++;
        if (pickaxe.id !== nextId) continue;

        money -= price;
        owned.add(pickaxe.id);
        bought++;
      }

      if (bought === 0) return prev;

      window._clickTimestamps = [];
      const newOwned = Array.from(owned);
      return {
        ...prev,
        yatesDollars: money,
        ownedPickaxeIds: newOwned,
        currentPickaxeId: Math.max(...newOwned),
        isBlocked: prev.appealPending ? prev.isBlocked : false,
      };
    });
    return bought;
  }, []);

  const equipPickaxe = useCallback((pickaxeId: number) => {
    if (!gameState.ownedPickaxeIds.includes(pickaxeId)) return;
    setGameState((prev) => ({
      ...prev,
      currentPickaxeId: pickaxeId,
    }));
  }, [gameState.ownedPickaxeIds]);

  const selectRock = useCallback((rockId: number) => {
    const rock = getRockById(rockId);
    if (!rock) return;
    if (gameState.totalClicks < rock.unlockAtClicks) return;

    setGameState((prev) => ({
      ...prev,
      currentRockId: rockId,
      currentRockHP: getScaledRockHP(rock.clicksToBreak, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0),
    }));
  }, [gameState.totalClicks]);

  const getUnlockedRocks = useCallback(() => {
    return ROCKS.filter((rock) => gameState.totalClicks >= rock.unlockAtClicks);
  }, [gameState.totalClicks]);

  const resetGame = useCallback(() => {
    setGameState({ ...defaultGameState, isHardMode: gameState.isHardMode });
    const storageKey = getStorageKey(userId, gameState.isHardMode);
    localStorage.removeItem(storageKey);
  }, [userId, gameState.isHardMode]);

  const markCutsceneSeen = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      hasSeenCutscene: true,
    }));
  }, []);

  const useCoupon = useCallback((type: 'discount30' | 'discount50' | 'discount100') => {
    if (gameState.coupons[type] <= 0) return false;
    
    setGameState((prev) => ({
      ...prev,
      coupons: {
        ...prev.coupons,
        [type]: prev.coupons[type] - 1,
      },
    }));
    
    return true;
  }, [gameState.coupons]);

  const spendMoney = useCallback((amount: number) => {
    if (gameState.yatesDollars < amount) return false;
    
    setGameState((prev) => ({
      ...prev,
      yatesDollars: prev.yatesDollars - amount,
    }));
    
    return true;
  }, [gameState.yatesDollars]);

  // Premium product functions
  const addPremiumProduct = useCallback((productId: number) => {
    setGameState((prev) => {
      if (prev.ownedPremiumProductIds.includes(productId)) return prev;
      return {
        ...prev,
        ownedPremiumProductIds: [...prev.ownedPremiumProductIds, productId],
      };
    });
  }, []);

  const ownsPremiumProduct = useCallback((productId: number) => {
    return gameState.ownedPremiumProductIds.includes(productId);
  }, [gameState.ownedPremiumProductIds]);

  const buyShopProduct = useCallback((productId: number) => {
    const stockItem = shopStock.items.find(item => item.productId === productId);
    if (!stockItem || stockItem.quantity <= 0) return false;
    
    const product = products.find(p => p.id === productId);
    if (!product) return false;
    
    const price = Math.floor(product.priceFloat * 15); // 15x multiplier
    if (gameState.yatesDollars < price) return false;
    
    // Deduct money
    setGameState((prev) => ({
      ...prev,
      yatesDollars: prev.yatesDollars - price,
    }));
    
    // Reduce stock quantity
    setShopStock((prev) => ({
      ...prev,
      items: prev.items.map(item => 
        item.productId === productId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ),
    }));

    // Add 50% of sale to company budget
    addProductSaleToBudget(price, product.name);

    // Save purchase to Supabase for both employees and clients
    if (userId && userType) {
      savePurchase({
        user_id: userId,
        user_type: userType,
        product_id: productId,
        product_name: product.name,
        purchase_type: 'cash',
        amount_paid: price,
      });
    }
    
    return true;
  }, [gameState.yatesDollars, shopStock.items, userId, userType]);

  const getTimeUntilRestock = useCallback(() => {
    const elapsed = Date.now() - shopStock.lastRestockTime;
    return Math.max(0, SHOP_RESTOCK_INTERVAL - elapsed);
  }, [shopStock.lastRestockTime]);

  const buyAutoclicker = useCallback(() => {
    if (gameState.hasAutoclicker) return false;
    const scaledCost = Math.floor(AUTOCLICKER_COST * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0));
    if (gameState.yatesDollars < scaledCost) return false;

    setGameState((prev) => ({
      ...prev,
      yatesDollars: prev.yatesDollars - scaledCost,
      hasAutoclicker: true,
      autoclickerEnabled: true,
    }));

    return true;
  }, [gameState.hasAutoclicker, gameState.yatesDollars, gameState.prestigeCount]);

  const toggleAutoclicker = useCallback(() => {
    if (!gameState.hasAutoclicker) return;
    
    setGameState((prev) => ({
      ...prev,
      autoclickerEnabled: !prev.autoclickerEnabled,
    }));
  }, [gameState.hasAutoclicker]);

  // Check if user can prestige (requirements scale with prestige count)
  // Money requirement removed - just need rock + pickaxe
  const canPrestige = useCallback(() => {
    const rockRequired = getPrestigeRockRequirement(gameState.prestigeCount);
    const pickaxeRequired = getPrestigePickaxeRequirement(gameState.prestigeCount, gameState.chosenPath);
    const meetsRock = gameState.currentRockId >= rockRequired;
    const meetsPickaxe = pickaxeRequired === -1 || gameState.ownedPickaxeIds.includes(pickaxeRequired);
    return meetsRock && meetsPickaxe;
  }, [gameState.currentRockId, gameState.ownedPickaxeIds, gameState.prestigeCount, gameState.chosenPath]);

  // Perform prestige - reset progress, gain multiplier
  // Yates (000000) keeps all money, others get 1/32 sent to company budget
  // Totem protection also keeps money (but consumes the protection)
  // After MAX_PRESTIGE_WITH_BUFFS (230), can still prestige but no buffs/tokens/company money
  // force=true bypasses requirements (for terminal command)
  const prestige = useCallback((force: boolean = false) => {
    if (!force && !canPrestige()) return null;
    
    const isYates = userId === YATES_ACCOUNT_ID;
    // Check if player owns the totem trinket (not just the flag - the flag can get out of sync)
    const ownsTotem = gameState.ownedTrinketIds.includes('totem');
    const hasProtection = ownsTotem;
    const currentMoney = gameState.yatesDollars;
    const keepsMoney = isYates || hasProtection;
    
    // Check if past max prestige - no company money after 230
    const isPastMaxPrestige = gameState.prestigeCount >= MAX_PRESTIGE_WITH_BUFFS;
    const amountToCompany = (keepsMoney || isPastMaxPrestige) ? 0 : Math.floor(currentMoney / 32);
    
    // Calculate new multiplier: starts at 1.1, +0.1 per prestige (caps at 230)
    const newPrestigeCount = gameState.prestigeCount + 1;
    // After max prestige, multiplier stays at the max value (1.0 + 230 * 0.1 = 24.0)
    const newMultiplier = isPastMaxPrestige 
      ? gameState.prestigeMultiplier  // Keep current multiplier, no increase
      : 1.0 + (newPrestigeCount * 0.1);
    
    // Tokens only given up to max prestige
    const tokensToAdd = isPastMaxPrestige ? 0 : PRESTIGE_TOKENS_PER_PRESTIGE;
    
    // Track fastest prestige time (for ranking)
    const prestigeTime = Date.now() - (gameState.gameStartTime || Date.now());
    const newFastestTime = gameState.fastestPrestigeTime === null 
      ? prestigeTime 
      : Math.min(gameState.fastestPrestigeTime, prestigeTime);

    setGameState((prev) => {
      // HARD MODE: Trinket wipe every 5 prestiges (keep 3 best)
      let newOwnedTrinketIds = prev.ownedTrinketIds;
      let newEquippedTrinketIds = prev.equippedTrinketIds;
      let newOwnedRelicIds = prev.ownedRelicIds;
      let newOwnedTalismanIds = prev.ownedTalismanIds;
      
      if (prev.isHardMode && newPrestigeCount % HARD_MODE_MODIFIERS.trinketWipeInterval === 0) {
        // Every 5 prestiges in Hard Mode, wipe trinkets but keep 3
        // Prioritize keeping equipped trinkets, then relics/talismans, then by rarity
        const keepCount = HARD_MODE_MODIFIERS.trinketKeepCount;
        
        // Keep equipped ones first
        const keptTrinkets = [...prev.equippedTrinketIds].slice(0, keepCount);
        
        // If we need more, add from relics/talismans
        if (keptTrinkets.length < keepCount) {
          const relicBases = prev.ownedRelicIds.map(id => id.replace('_relic', ''));
          const talismanBases = prev.ownedTalismanIds.map(id => id.replace('_talisman', ''));
          const converted = [...new Set([...relicBases, ...talismanBases])];
          for (const id of converted) {
            if (keptTrinkets.length >= keepCount) break;
            if (!keptTrinkets.includes(id)) keptTrinkets.push(id);
          }
        }
        
        // If still need more, add from remaining owned
        if (keptTrinkets.length < keepCount) {
          for (const id of prev.ownedTrinketIds) {
            if (keptTrinkets.length >= keepCount) break;
            if (!keptTrinkets.includes(id)) keptTrinkets.push(id);
          }
        }
        
        newOwnedTrinketIds = keptTrinkets;
        newEquippedTrinketIds = prev.equippedTrinketIds.filter(id => keptTrinkets.includes(id));
        newOwnedRelicIds = prev.ownedRelicIds.filter(id => keptTrinkets.includes(id.replace('_relic', '')));
        newOwnedTalismanIds = prev.ownedTalismanIds.filter(id => keptTrinkets.includes(id.replace('_talisman', '')));
        
        console.log(`💀 HARD MODE: Trinket wipe at prestige ${newPrestigeCount}! Kept ${keptTrinkets.length} trinkets.`);
      } else if (hasProtection) {
        // Normal totem protection logic
        newOwnedTrinketIds = prev.ownedTrinketIds.filter(id => id !== 'totem');
        newEquippedTrinketIds = prev.equippedTrinketIds.filter(id => id !== 'totem');
      }
      
      // HARD MODE: Reset buildings on prestige
      const newBuildings = prev.isHardMode
        ? getDefaultBuildingStates() // Complete reset
        : {
            ...prev.buildings,
            temple: {
              ...prev.buildings.temple,
              goldenCookieClicks: 0,
              hiddenCurseActive: false,
              hasCookieCurse: false,
              hasHolyUnluckinessCurse: false,
            },
          };
      
      return {
        ...prev,
        // Reset rocks and pickaxes (rock HP scaled by new prestige count)
        currentRockId: 1,
        currentRockHP: getScaledRockHP(ROCKS[0].clicksToBreak, newPrestigeCount, prev.isHardMode, prev.sideLevel || 0),
        currentPickaxeId: 1,
        ownedPickaxeIds: [1],
        totalClicks: 0,
        // Reset miners
        minerCount: 0,
        // Yates or totem protection keeps money, others lose it
        yatesDollars: keepsMoney ? prev.yatesDollars : 0,
        // Trinkets (with Hard Mode wipe logic)
        ownedTrinketIds: newOwnedTrinketIds,
        equippedTrinketIds: newEquippedTrinketIds,
        ownedRelicIds: newOwnedRelicIds,
        ownedTalismanIds: newOwnedTalismanIds,
        // Update prestige stats and give tokens (no buffs after max)
        prestigeCount: newPrestigeCount,
        prestigeMultiplier: newMultiplier,
        prestigeTokens: prev.prestigeTokens + tokensToAdd,
        // Give 1 Stoken every 5 prestiges (Darkness path only, tracked for all)
        stokens: prev.stokens + (newPrestigeCount % 5 === 0 ? 1 : 0),
        // Consume totem protection if it was used
        hasTotemProtection: false,
        // Ranking: track fastest prestige time and reset game start
        fastestPrestigeTime: newFastestTime,
        gameStartTime: Date.now(), // Reset for next prestige attempt
        // Buildings (with Hard Mode reset logic)
        buildings: newBuildings,
        // Hard Mode prestige counter (for trinket wipe tracking)
        hardModePrestigeCount: prev.isHardMode ? prev.hardModePrestigeCount + 1 : prev.hardModePrestigeCount,
      };
    });

    // Force immediate save to Supabase after prestige (bypass debounce)
    // This prevents the merge logic from restoring old pre-prestige data on refresh
    if (userId && userType) {
      const rock = ROCKS[0];
      forceImmediateSave({
        user_id: userId,
        user_type: userType,
        yates_dollars: keepsMoney ? currentMoney : 0,
        total_clicks: 0,
        current_pickaxe_id: 1,
        current_rock_id: 1,
        current_rock_hp: rock.clicksToBreak,
        rocks_mined_count: 0,
        owned_pickaxe_ids: [1],
        miner_count: 0,
        prestige_count: newPrestigeCount,
        prestige_multiplier: newMultiplier,
        prestige_tokens: gameState.prestigeTokens + tokensToAdd,
        has_totem_protection: false,
        owned_trinket_ids: hasProtection 
          ? gameState.ownedTrinketIds.filter(id => id !== 'totem')
          : gameState.ownedTrinketIds,
        equipped_trinket_ids: hasProtection
          ? gameState.equippedTrinketIds.filter(id => id !== 'totem')
          : gameState.equippedTrinketIds,
        // Ranking system
        fastest_prestige_time: newFastestTime,
        game_start_time: Date.now(),
        total_money_earned: gameState.totalMoneyEarned,
        // Persist stocks unlock across prestige
        has_stocks_unlocked: gameState.hasStocksUnlocked,
        // Persist currencies across prestige
        stokens: gameState.stokens + (newPrestigeCount % 5 === 0 ? 1 : 0),
        lottery_tickets: gameState.lotteryTickets,
      });
    }

    return { amountToCompany, newMultiplier };
  }, [canPrestige, gameState.yatesDollars, gameState.prestigeCount, gameState.prestigeMultiplier, gameState.ownedTrinketIds, gameState.equippedTrinketIds, gameState.prestigeTokens, gameState.stokens, gameState.lotteryTickets, gameState.gameStartTime, gameState.fastestPrestigeTime, gameState.totalMoneyEarned, gameState.hasStocksUnlocked, userId, userType]);

  // =====================
  // TRINKET FUNCTIONS
  // =====================
  
  const trinketShopItems = gameState.trinketShopItems
    .map(id => TRINKETS.find(t => t.id === id))
    .filter((t): t is Trinket => t !== undefined);
  
  const getTrinketShopTimeLeft = useCallback(() => {
    const elapsed = Date.now() - gameState.trinketShopLastRefresh;
    return Math.max(0, TRINKET_SHOP_REFRESH_INTERVAL - elapsed);
  }, [gameState.trinketShopLastRefresh]);

  // Reset trinket shop for 40% of current money
  const resetTrinketShop = useCallback((): boolean => {
    const cost = Math.floor(gameState.yatesDollars * 0.4);
    if (cost <= 0 || gameState.yatesDollars < cost) return false;
    
    const newItems = generateTrinketShopItems();
    setGameState(prev => ({
      ...prev,
      yatesDollars: prev.yatesDollars - cost,
      trinketShopItems: newItems,
      trinketShopLastRefresh: Date.now(),
    }));
    return true;
  }, [gameState.yatesDollars]);
  
  const ownsTrinket = useCallback((trinketId: string) => {
    return gameState.ownedTrinketIds.includes(trinketId);
  }, [gameState.ownedTrinketIds]);
  
  const buyTrinket = useCallback((trinketId: string) => {
    const trinket = TRINKETS.find(t => t.id === trinketId);
    if (!trinket) return false;
    if (gameState.ownedTrinketIds.includes(trinketId)) return false;
    const scaledCost = Math.floor(trinket.cost * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0));
    if (gameState.yatesDollars < scaledCost) return false;
    
    setGameState(prev => ({
        ...prev,
      yatesDollars: prev.yatesDollars - scaledCost,
      ownedTrinketIds: [...prev.ownedTrinketIds, trinketId],
      // If it's the totem, activate protection
      hasTotemProtection: trinket.effects.prestigeProtection ? true : prev.hasTotemProtection,
      // Remove from shop
      trinketShopItems: prev.trinketShopItems.filter(id => id !== trinketId),
      }));

      return true;
  }, [gameState.ownedTrinketIds, gameState.yatesDollars, gameState.prestigeCount]);
  
  const canEquipDualTrinkets = useCallback(() => {
    return gameState.ownedPrestigeUpgradeIds.includes('dual_trinkets');
  }, [gameState.ownedPrestigeUpgradeIds]);

  const canEquipTripleTrinkets = useCallback(() => {
    return gameState.ownedPrestigeUpgradeIds.includes('triple_trinkets');
  }, [gameState.ownedPrestigeUpgradeIds]);

  const equipTrinket = useCallback((itemId: string) => {
    // Check if owned - could be trinket, relic, or talisman
    const isRelic = itemId.endsWith('_relic');
    const isTalisman = itemId.endsWith('_talisman');
    
    let isOwned = false;
    if (isRelic) {
      isOwned = (gameState.ownedRelicIds || []).includes(itemId);
    } else if (isTalisman) {
      isOwned = (gameState.ownedTalismanIds || []).includes(itemId);
    } else {
      isOwned = gameState.ownedTrinketIds.includes(itemId);
    }
    
    if (!isOwned) return false;
    if (gameState.equippedTrinketIds.includes(itemId)) return false;
    
    const maxEquipped = canEquipTripleTrinkets() ? 3 : canEquipDualTrinkets() ? 2 : 1;

    setGameState(prev => {
      let newEquipped = [...prev.equippedTrinketIds, itemId];
      // If over limit, remove oldest
      if (newEquipped.length > maxEquipped) {
        newEquipped = newEquipped.slice(-maxEquipped);
      }
      return { ...prev, equippedTrinketIds: newEquipped };
    });

    return true;
  }, [gameState.ownedTrinketIds, gameState.ownedRelicIds, gameState.ownedTalismanIds, gameState.equippedTrinketIds, canEquipDualTrinkets, canEquipTripleTrinkets]);

  const unequipTrinket = useCallback((trinketId: string) => {
    setGameState(prev => ({
      ...prev,
      equippedTrinketIds: prev.equippedTrinketIds.filter(id => id !== trinketId),
    }));
  }, []);

  const getEquippedTrinkets = useCallback(() => {
    return gameState.equippedTrinketIds
      .map(id => {
        // Handle relic and talisman IDs by stripping the suffix
        const baseId = id.replace('_relic', '').replace('_talisman', '');
        return TRINKETS.find(t => t.id === baseId);
      })
      .filter((t): t is Trinket => t !== undefined);
  }, [gameState.equippedTrinketIds]);

  const getTotalBonuses = useCallback(() => {
    return calculateTotalBonuses();
  }, [calculateTotalBonuses]);

  // =====================
  // RELIC & TALISMAN FUNCTIONS
  // =====================

  const ownsRelic = useCallback((trinketId: string): boolean => {
    return (gameState.ownedRelicIds || []).includes(`${trinketId}_relic`);
  }, [gameState.ownedRelicIds]);

  const ownsTalisman = useCallback((trinketId: string): boolean => {
    return (gameState.ownedTalismanIds || []).includes(`${trinketId}_talisman`);
  }, [gameState.ownedTalismanIds]);

  const getRelicConversionCost = useCallback((trinketId: string) => {
    return RELIC_CONVERSION_COSTS[trinketId] || null;
  }, []);

  const getTalismanConversionCost = useCallback((trinketId: string) => {
    return TALISMAN_CONVERSION_COSTS[trinketId] || null;
  }, []);

  const convertToRelic = useCallback((trinketId: string, payWithTokens: boolean): boolean => {
    // Must be on Light path
    if (gameState.chosenPath !== 'light') return false;
    // Must own the trinket
    if (!gameState.ownedTrinketIds.includes(trinketId)) return false;
    // Can't already have the relic
    if ((gameState.ownedRelicIds || []).includes(`${trinketId}_relic`)) return false;
    
    const cost = RELIC_CONVERSION_COSTS[trinketId];
    if (!cost) return false;
    
    const relicId = `${trinketId}_relic`;
    const wasEquipped = gameState.equippedTrinketIds.includes(trinketId);
    
    // Check affordability based on payment method
    if (payWithTokens) {
      if (gameState.prestigeTokens < cost.prestigeTokens) return false;
      setGameState(prev => {
        // If the base trinket was equipped, swap it for the relic
        let newEquippedIds = prev.equippedTrinketIds;
        if (wasEquipped) {
          newEquippedIds = prev.equippedTrinketIds.map(id => id === trinketId ? relicId : id);
        }
        return {
          ...prev,
          prestigeTokens: prev.prestigeTokens - cost.prestigeTokens,
          ownedRelicIds: [...(prev.ownedRelicIds || []), relicId],
          equippedTrinketIds: newEquippedIds,
        };
      });
    } else {
      if (gameState.yatesDollars < cost.money) return false;
      setGameState(prev => {
        // If the base trinket was equipped, swap it for the relic
        let newEquippedIds = prev.equippedTrinketIds;
        if (wasEquipped) {
          newEquippedIds = prev.equippedTrinketIds.map(id => id === trinketId ? relicId : id);
        }
        return {
          ...prev,
          yatesDollars: prev.yatesDollars - cost.money,
          ownedRelicIds: [...(prev.ownedRelicIds || []), relicId],
          equippedTrinketIds: newEquippedIds,
        };
      });
    }
    return true;
  }, [gameState.chosenPath, gameState.ownedTrinketIds, gameState.ownedRelicIds, gameState.prestigeTokens, gameState.yatesDollars, gameState.equippedTrinketIds]);

  const convertToTalisman = useCallback((trinketId: string): boolean => {
    // Must be on Darkness path
    if (gameState.chosenPath !== 'darkness') return false;
    // Must own the trinket
    if (!gameState.ownedTrinketIds.includes(trinketId)) return false;
    // Can't already have the talisman
    if ((gameState.ownedTalismanIds || []).includes(`${trinketId}_talisman`)) return false;
    
    const cost = TALISMAN_CONVERSION_COSTS[trinketId];
    if (!cost) return false;
    // Check if can afford
    if (gameState.minerCount < cost.miners) return false;
    if (gameState.yatesDollars < cost.money) return false;
    
    const talismanId = `${trinketId}_talisman`;
    const wasEquipped = gameState.equippedTrinketIds.includes(trinketId);
    
    setGameState(prev => {
      // If the base trinket was equipped, swap it for the talisman
      let newEquippedIds = prev.equippedTrinketIds;
      if (wasEquipped) {
        newEquippedIds = prev.equippedTrinketIds.map(id => id === trinketId ? talismanId : id);
      }
      return {
        ...prev,
        minerCount: prev.minerCount - cost.miners,
        yatesDollars: prev.yatesDollars - cost.money,
        ownedTalismanIds: [...(prev.ownedTalismanIds || []), talismanId],
        equippedTrinketIds: newEquippedIds,
      };
    });
    return true;
  }, [gameState.chosenPath, gameState.ownedTrinketIds, gameState.ownedTalismanIds, gameState.minerCount, gameState.yatesDollars, gameState.equippedTrinketIds]);

  // =====================
  // MINER FUNCTIONS
  // =====================
  
  const getMinerCostFn = useCallback(() => {
    return getMinerCost(gameState.minerCount, gameState.prestigeCount, gameState.isHardMode);
  }, [gameState.minerCount, gameState.prestigeCount, gameState.isHardMode]);

  const buyMiner = useCallback(() => {
    if (gameState.minerCount >= MINER_MAX_COUNT) return false;
    
    // Temple rank 2/3 blocks miner purchases
    const equippedRank = gameState.buildings.temple.equippedRank;
    if (equippedRank === 2 || equippedRank === 3) {
      return false; // Can't buy miners with these ranks equipped
    }
    
    const cost = getMinerCost(gameState.minerCount, gameState.prestigeCount, gameState.isHardMode);
    if (gameState.yatesDollars < cost) return false;
    
    setGameState(prev => ({
      ...prev,
      yatesDollars: prev.yatesDollars - cost,
      minerCount: prev.minerCount + 1,
    }));
    
    return true;
  }, [gameState.minerCount, gameState.yatesDollars, gameState.buildings.temple.equippedRank]);

  // =====================
  // PRESTIGE UPGRADE FUNCTIONS
  // =====================

  const ownsPrestigeUpgrade = useCallback((upgradeId: string) => {
    return gameState.ownedPrestigeUpgradeIds.includes(upgradeId);
  }, [gameState.ownedPrestigeUpgradeIds]);
    
  const buyPrestigeUpgrade = useCallback((upgradeId: string) => {
    const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    if (gameState.ownedPrestigeUpgradeIds.includes(upgradeId)) return false;
    if (gameState.prestigeTokens < upgrade.cost) return false;
    // Check if this upgrade requires another upgrade first
    if (upgrade.requires && !gameState.ownedPrestigeUpgradeIds.includes(upgrade.requires)) return false;

    setGameState(prev => ({
      ...prev,
      prestigeTokens: prev.prestigeTokens - upgrade.cost,
      ownedPrestigeUpgradeIds: [...prev.ownedPrestigeUpgradeIds, upgradeId],
    }));

    return true;
  }, [gameState.ownedPrestigeUpgradeIds, gameState.prestigeTokens]);

  // Toggle auto-prestige (CM command only)
  const toggleAutoPrestige = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      autoPrestigeEnabled: !prev.autoPrestigeEnabled,
    }));
  }, [gameState.autoPrestigeEnabled]);

  // =====================
  // PICKAXE ABILITY FUNCTIONS
  // =====================

  // Check if current pickaxe has an active ability available
  const getCurrentPickaxeAbility = useCallback(() => {
    const pickaxe = getPickaxeById(gameState.currentPickaxeId);
    return pickaxe?.activeAbility || null;
  }, [gameState.currentPickaxeId]);

  // Get remaining cooldown time for current pickaxe's ability
  const getAbilityCooldownRemaining = useCallback(() => {
    const ability = getCurrentPickaxeAbility();
    if (!ability) return 0;
    const cooldownEnd = gameState.abilityCooldowns[ability.id] || 0;
    return Math.max(0, cooldownEnd - Date.now());
  }, [gameState.abilityCooldowns, getCurrentPickaxeAbility]);

  // Check if an ability is currently active
  const isAbilityActive = useCallback(() => {
    if (!gameState.activeAbility) return false;
    const { startTime, duration } = gameState.activeAbility;
    if (duration === 0) return false; // instant abilities are never "active"
    return Date.now() < startTime + duration;
  }, [gameState.activeAbility]);

  // Get remaining time for active ability
  const getActiveAbilityTimeRemaining = useCallback(() => {
    if (!gameState.activeAbility) return 0;
    const { startTime, duration } = gameState.activeAbility;
    if (duration === 0) return 0;
    return Math.max(0, (startTime + duration) - Date.now());
  }, [gameState.activeAbility]);

  // Activate the current pickaxe's ability
  const activateAbility = useCallback(() => {
    const ability = getCurrentPickaxeAbility();
    if (!ability) return false;

    // Check cooldown
    const cooldownEnd = gameState.abilityCooldowns[ability.id] || 0;
    if (Date.now() < cooldownEnd) return false;

    // Check cost
    if (gameState.yatesDollars < ability.cost) return false;

    // Handle instant break ability specially
    if (ability.effect.type === 'instant_break') {
      const rock = getRockById(gameState.currentRockId) || ROCKS[0];
      const money = safeMoney(rock.moneyPerBreak * gameState.prestigeMultiplier);
      
      setGameState(prev => ({
        ...prev,
        yatesDollars: safeAdd(prev.yatesDollars - ability.cost, money),
        currentRockHP: getScaledRockHP(rock.clicksToBreak, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0), // Reset to full scaled HP
        rocksMinedCount: prev.rocksMinedCount + 1,
        abilityCooldowns: {
          ...prev.abilityCooldowns,
          [ability.id]: Date.now() + ability.cooldown,
        },
      }));
      return true;
    }

    // For duration-based abilities
    setGameState(prev => ({
      ...prev,
      yatesDollars: prev.yatesDollars - ability.cost,
      activeAbility: {
        pickaxeId: prev.currentPickaxeId,
        abilityId: ability.id,
        startTime: Date.now(),
        duration: ability.duration,
      },
      abilityCooldowns: {
        ...prev.abilityCooldowns,
        [ability.id]: Date.now() + ability.cooldown,
      },
    }));

    return true;
  }, [gameState.currentPickaxeId, gameState.abilityCooldowns, gameState.yatesDollars, gameState.currentRockId, gameState.prestigeMultiplier, getCurrentPickaxeAbility]);

  // Clear expired ability
  useEffect(() => {
    if (!gameState.activeAbility) return;
    
    const { startTime, duration } = gameState.activeAbility;
    if (duration === 0) return; // instant abilities don't need cleanup
    
    const timeLeft = (startTime + duration) - Date.now();
    if (timeLeft <= 0) {
      setGameState(prev => ({ ...prev, activeAbility: null }));
      return;
    }

    // Set timer to clear when it expires
    const timeout = setTimeout(() => {
      setGameState(prev => ({ ...prev, activeAbility: null }));
    }, timeLeft);

    return () => clearTimeout(timeout);
  }, [gameState.activeAbility]);

  // Submit appeal for anti-cheat violation
  const submitAppeal = useCallback(async (reason: string): Promise<boolean> => {
    if (!userId || !userType) return false;
    
    try {
      const username = employee?.name || client?.username || 'Unknown';
      
      // Create appeal record
      const { error: appealError } = await supabase.from('cheat_appeals').insert({
        user_id: userId,
        user_type: userType,
        username: username,
        appeal_reason: reason,
        status: 'pending',
      });

      if (appealError) {
        console.error('Error creating appeal:', appealError);
        return false;
      }

      // Send inbox messages to Logan (000001) and Bernardo (123456)
      const appealMessage = `🚨 CHEAT APPEAL from ${username}\n\nUser ID: ${userId}\nType: ${userType}\n\nReason: "${reason}"\n\nPlease review and approve/deny this appeal.`;
      
      // Message to Logan
      await supabase.from('employee_messages').insert({
        recipient_id: '000001',
        sender_name: 'Anti-Cheat System',
        sender_handle: 'anticheat.system',
        subject: `⚠️ Cheat Appeal: ${username}`,
        content: appealMessage,
        is_read: false,
      });

      // Message to Bernardo
      await supabase.from('employee_messages').insert({
        recipient_id: '123456',
        sender_name: 'Anti-Cheat System',
        sender_handle: 'anticheat.system',
        subject: `⚠️ Cheat Appeal: ${username}`,
        content: appealMessage,
        is_read: false,
      });

      // Update game state to pending appeal
      setGameState((prev) => ({
        ...prev,
        appealPending: true,
        isBlocked: true,
      }));

      return true;
    } catch (err) {
      console.error('Error submitting appeal:', err);
      return false;
    }
  }, [userId, userType, employee?.name, client?.username]);

  // Admin functions for internal terminal (only employees can use these)
  const addMoney = useCallback((amount: number) => {
    const safeAmount = safeMoney(amount);
    setGameState(prev => ({
      ...prev,
      yatesDollars: safeAdd(prev.yatesDollars, safeAmount),
    }));
  }, []);

  const addMiners = useCallback((amount: number) => {
    setGameState(prev => ({
      ...prev,
      minerCount: Math.min(MINER_MAX_COUNT, prev.minerCount + amount),
    }));
  }, []);

  const addPrestigeTokens = useCallback((amount: number) => {
    setGameState(prev => ({
      ...prev,
      prestigeTokens: prev.prestigeTokens + amount,
    }));
  }, []);

  // Add prestige count without resetting (for store purchase)
  const addPrestigeCount = useCallback((amount: number) => {
    setGameState(prev => {
      const newCount = prev.prestigeCount + amount;
      const isPastMax = prev.prestigeCount >= MAX_PRESTIGE_WITH_BUFFS;
      const newMultiplier = isPastMax ? prev.prestigeMultiplier : 1.0 + (newCount * 0.1);
      return {
        ...prev,
        prestigeCount: newCount,
        prestigeMultiplier: newMultiplier,
      };
    });
  }, []);

  // Skip rocks forward (for store purchase)
  const skipRocks = useCallback((amount: number) => {
    setGameState(prev => {
      let targetRockId: number;
      if (amount === -1) {
        // Skip to max unlocked rock
        const highest = getHighestUnlockedRock(prev.totalClicks);
        targetRockId = highest.id;
      } else {
        targetRockId = Math.min(prev.currentRockId + amount, ROCKS[ROCKS.length - 1].id);
      }
      // Don't go backwards
      if (targetRockId <= prev.currentRockId) return prev;
      const targetRock = getRockById(targetRockId);
      if (!targetRock) return prev;
      return {
        ...prev,
        currentRockId: targetRockId,
        currentRockHP: getScaledRockHP(targetRock.clicksToBreak, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0),
      };
    });
  }, []);

  const giveTrinket = useCallback((trinketId: string) => {
    const trinket = TRINKETS.find(t => t.id === trinketId);
    if (!trinket) return false;
    setGameState(prev => ({
      ...prev,
      ownedTrinketIds: [...new Set([...prev.ownedTrinketIds, trinketId])],
    }));
    return true;
  }, []);

  const givePickaxe = useCallback((pickaxeId: number) => {
    setGameState(prev => ({
      ...prev,
      ownedPickaxeIds: [...new Set([...prev.ownedPickaxeIds, pickaxeId])],
    }));
  }, []);

  const setTotalClicks = useCallback((clicks: number) => {
    setGameState(prev => ({
      ...prev,
      totalClicks: clicks,
    }));
  }, []);

  // Unlock all achievements (for terminal command)
  const unlockAllAchievements = useCallback(() => {
    const allIds = ACHIEVEMENTS.map(a => a.id);
    setGameState(prev => ({
      ...prev,
      unlockedAchievementIds: [...new Set([...(prev.unlockedAchievementIds || []), ...allIds])],
    }));
  }, []);

  // MAX ALL UPGRADES - Admin command to max out Progressive Upgrades
  const maxAll = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      // Max out all Progressive Upgrades to their max levels
      progressiveUpgrades: {
        pcxDamage: 500,    // Pickaxe Strength max
        money: 500,        // Money Bonus max
        generalSpeed: 300, // General Speed max
        minerSpeed: 200,   // Miner Speed max
        minerDamage: 500,  // Miner Damage max
      },
    }));
  }, []);

  const giveAllTrinkets = useCallback(() => {
    const allBaseIds = TRINKETS.map(t => t.id);
    const allRelicIds = allBaseIds.map(id => `${id}_relic`);
    const allTalismanIds = allBaseIds.map(id => `${id}_talisman`);
    setGameState(prev => ({
      ...prev,
      ownedTrinketIds: [...new Set([...prev.ownedTrinketIds, ...allBaseIds])],
      ownedRelicIds: [...new Set([...(prev.ownedRelicIds || []), ...allRelicIds])],
      ownedTalismanIds: [...new Set([...(prev.ownedTalismanIds || []), ...allTalismanIds])],
    }));
  }, []);

  // =====================
  // TITLE FUNCTIONS
  // =====================

  const ownsTitle = useCallback((titleId: string) => {
    return gameState.ownedTitleIds?.includes(titleId) || false;
  }, [gameState.ownedTitleIds]);

  const giveTitle = useCallback((titleId: string) => {
    const title = TITLES.find(t => t.id === titleId);
    if (!title) return false;
    setGameState(prev => ({
      ...prev,
      ownedTitleIds: [...new Set([...(prev.ownedTitleIds || []), titleId])],
      // Track win counts for Da Goat
      titleWinCounts: {
        ...(prev.titleWinCounts || {}),
        [titleId]: ((prev.titleWinCounts || {})[titleId] || 0) + 1,
      },
    }));
    return true;
  }, []);

  const equipTitle = useCallback((titleId: string) => {
    if (!gameState.ownedTitleIds?.includes(titleId)) return false;
    if (gameState.equippedTitleIds?.includes(titleId)) return false;
    
    // Check if player has Title Master upgrade (allows 2 titles)
    const hasTitleMaster = gameState.ownedPrestigeUpgradeIds?.includes('title_master');
    const maxEquipped = hasTitleMaster ? 2 : 1;

    setGameState(prev => {
      let newEquipped = [...(prev.equippedTitleIds || []), titleId];
      // If over limit, remove oldest
      if (newEquipped.length > maxEquipped) {
        newEquipped = newEquipped.slice(-maxEquipped);
      }
      return { ...prev, equippedTitleIds: newEquipped };
    });

    return true;
  }, [gameState.ownedTitleIds, gameState.equippedTitleIds, gameState.ownedPrestigeUpgradeIds]);

  const unequipTitle = useCallback((titleId: string) => {
    setGameState(prev => ({
      ...prev,
      equippedTitleIds: (prev.equippedTitleIds || []).filter(id => id !== titleId),
    }));
  }, []);

  // Calculate bonuses from equipped titles
  const getTitleBonuses = useCallback(() => {
    const bonuses = {
      moneyBonus: 0,
      allBonus: 0,
      speedBonus: 0,
      pcxDiscount: 0,
      prestigeMoneyRetention: 0,
    };

    for (const titleId of (gameState.equippedTitleIds || [])) {
      const title = TITLES.find(t => t.id === titleId);
      if (title) {
        bonuses.moneyBonus += title.buffs.moneyBonus || 0;
        bonuses.allBonus += title.buffs.allBonus || 0;
        bonuses.speedBonus += title.buffs.speedBonus || 0;
        bonuses.pcxDiscount += title.buffs.pcxDiscount || 0;
        bonuses.prestigeMoneyRetention += title.buffs.prestigeMoneyRetention || 0;
      }
    }

    return bonuses;
  }, [gameState.equippedTitleIds]);

  // =====================
  // PATH SYSTEM FUNCTIONS
  // =====================

  // Select path (Light or Darkness) - called from side buttons in MiningGame
  // force=true allows admin terminal to override existing path choice
  const selectPath = useCallback((path: GamePath, force: boolean = false) => {
    console.log('🛤️ selectPath called with:', path);
    if (!path) {
      console.log('❌ No path provided');
      return;
    }
    
    // Get current path from ref to avoid stale closure
    const currentPath = gameStateRef.current.chosenPath;
    if (currentPath && !force) {
      console.log('❌ Path already chosen:', currentPath);
      return;
    }

    console.log('✅ Setting path to:', path);
    
    // Update state
    setGameState(prev => ({
      ...prev,
      chosenPath: path,
    }));

    // Force immediate save to Supabase - path selection is critical
    if (userId && userType) {
      console.log('💾 Force saving path to Supabase');
      forceImmediateSave({
        user_id: userId,
        user_type: userType,
        chosen_path: path,
      });
    }
    
    // Also save to localStorage immediately (use correct key for mode)
    try {
      const storageKey = getStorageKey(userId, gameState.isHardMode);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.chosenPath = path;
        localStorage.setItem(storageKey, JSON.stringify(parsed));
        console.log('💾 Saved path to localStorage');
      }
    } catch (e) {
      console.error('Failed to save path to localStorage:', e);
    }
  }, [userId, userType]);

  // Side Levels — progress check
  const getSideLevelProgress = useCallback((): { level: number; requirements: Record<string, { current: number; required: number; met: boolean }> } | null => {
    if (!gameState.chosenPath) return null;
    const level = gameState.sideLevel || 1;
    if (level >= SIDE_LEVEL_MAX) return { level, requirements: {} };

    const nextLevel = level + 1;

    if (gameState.chosenPath === 'darkness') {
      const reqs = getDarkSideLevelRequirements(nextLevel);
      return {
        level,
        requirements: {
          'Miners Sacrificed': { current: gameState.totalMinersSacrificed || 0, required: reqs.totalMinersSacrificed, met: (gameState.totalMinersSacrificed || 0) >= reqs.totalMinersSacrificed },
          'Mining Level': { current: gameState.rocksMinedCount || 0, required: reqs.miningLevelReached, met: (gameState.rocksMinedCount || 0) >= reqs.miningLevelReached },
          'Total Money Earned': { current: gameState.totalMoneyEarned || 0, required: reqs.totalMoneyEarned, met: (gameState.totalMoneyEarned || 0) >= reqs.totalMoneyEarned },
        },
      };
    }

    const reqs = getLightSideLevelRequirements(nextLevel);
    return {
      level,
      requirements: {
        'Prestige Rank': { current: gameState.prestigeCount || 0, required: reqs.prestigeCount!, met: (gameState.prestigeCount || 0) >= reqs.prestigeCount! },
        'Golden Cookies': { current: gameState.totalGoldenCookiesCollected || 0, required: reqs.goldenCookiesCollected!, met: (gameState.totalGoldenCookiesCollected || 0) >= reqs.goldenCookiesCollected! },
        'Total Money Earned': { current: gameState.totalMoneyEarned || 0, required: reqs.totalMoneyEarned, met: (gameState.totalMoneyEarned || 0) >= reqs.totalMoneyEarned },
        'Zero Miners': { current: gameState.minerCount, required: 0, met: gameState.minerCount === 0 },
      },
    };
  }, [gameState.chosenPath, gameState.sideLevel, gameState.totalMinersSacrificed, gameState.rocksMinedCount, gameState.totalMoneyEarned, gameState.prestigeCount, gameState.totalGoldenCookiesCollected, gameState.minerCount]);

  const canLevelUpSide = useCallback((): boolean => {
    const progress = getSideLevelProgress();
    if (!progress) return false;
    if (progress.level >= SIDE_LEVEL_MAX) return false;
    return Object.values(progress.requirements).every(r => r.met);
  }, [getSideLevelProgress]);

  const levelUpSide = useCallback((): { success: boolean; buff?: { stat: string; amount: number } } => {
    if (!canLevelUpSide()) return { success: false };
    const buff = rollSideLevelBuff();
    setGameState(prev => {
      const newBuffs = { ...(prev.sideLevelBuffs || {}) };
      newBuffs[buff.stat] = (newBuffs[buff.stat] || 0) + buff.amount;
      const newLevel = (prev.sideLevel || 1) + 1;
      const rock = getRockById(prev.currentRockId) || ROCKS[0];
      const newMaxHP = getScaledRockHP(rock.clicksToBreak, prev.prestigeCount, prev.isHardMode, newLevel);
      return {
        ...prev,
        sideLevel: newLevel,
        sideLevelBuffs: newBuffs,
        currentRockHP: Math.min(prev.currentRockHP, newMaxHP),
      };
    });
    return { success: true, buff };
  }, [canLevelUpSide]);

  // Check if player can buy a pickaxe based on their path
  const canBuyPickaxeForPath = useCallback((pickaxeId: number): boolean => {
    // If no path chosen yet, can buy any non-restricted pickaxe
    if (!gameState.chosenPath) {
      return !DARKNESS_PICKAXE_IDS.includes(pickaxeId) && !LIGHT_PICKAXE_IDS.includes(pickaxeId);
    }
    
    // Darkness path can buy darkness pickaxes
    if (gameState.chosenPath === 'darkness') {
      return !LIGHT_PICKAXE_IDS.includes(pickaxeId);
    }
    
    // Light path can buy light pickaxes
    if (gameState.chosenPath === 'light') {
      return !DARKNESS_PICKAXE_IDS.includes(pickaxeId);
    }
    
    return true;
  }, [gameState.chosenPath]);

  // Check if player can mine a rock based on their path (not implemented as restriction, just for UI)
  const canMineRockForPath = useCallback((rockId: number): boolean => {
    // All rocks can be mined regardless of path for now
    // Path-specific rocks just provide better bonuses for the matching path
    return true;
  }, []);

  // Buy multiple miners at once (bulk buy) — single state update to avoid stale closure debt bug
  const buyMiners = useCallback((count: number): number => {
    let totalBought = 0;
    setGameState(prev => {
      let money = prev.yatesDollars;
      let miners = prev.minerCount;
      for (let i = 0; i < count; i++) {
        if (miners >= MINER_MAX_COUNT) break;
        const cost = getMinerCost(miners, prev.prestigeCount, prev.isHardMode, prev.sideLevel || 0);
        if (money < cost) break;
        money -= cost;
        miners++;
        totalBought++;
      }
      if (totalBought === 0) return prev;
      return { ...prev, yatesDollars: money, minerCount: miners };
    });
    return totalBought;
  }, []);

  // Get what buff would be applied for sacrificing X miners
  const getSacrificeBuffForCount = useCallback((count: number): { buff: SacrificeBuff; duration: number } | null => {
    // Find the highest tier that matches
    let bestTier = null;
    for (const tier of SACRIFICE_BUFF_TIERS) {
      if (count >= tier.miners) {
        bestTier = tier;
      }
    }
    
    if (!bestTier) return null;
    
    return {
      buff: {
        ...bestTier.buff,
        endsAt: Date.now() + bestTier.duration,
      },
      duration: bestTier.duration,
    };
  }, []);

  // Sacrifice miners for temporary buff (Darkness path only)
  // Sacrificing 100+ miners = Apocalypse (shadow miners) with 60% backfire
  // Sacrificing <100 miners = Blood Ritual (buff) with 0.5% + 0.5%/miner backfire
  const sacrificeMiners = useCallback((count: number): boolean => {
    if (gameState.chosenPath !== 'darkness') return false;
    if (gameState.minerCount < count) return false;
    if (count <= 0 || count > 300) return false;
    
    const buffInfo = getSacrificeBuffForCount(count);
    if (!buffInfo) return false;
    
    const isApocalypse = count >= 100;
    
    if (isApocalypse) {
      // APOCALYPSE RITUAL: 60% backfire chance
      const backfired = Math.random() < 0.60;
      
      // Calculate shadow miners to grant
      const baseShadowMiners = Math.max(10, Math.floor(count / 10));
      // If backfired, random 10-90% of miners just die (don't become shadows)
      const lossPercent = backfired ? (0.1 + Math.random() * 0.8) : 0;
      const shadowMinersToGrant = Math.floor(baseShadowMiners * (1 - lossPercent));
      
      setGameState(prev => ({
        ...prev,
        minerCount: prev.minerCount - count,
        totalMinersSacrificed: (prev.totalMinersSacrificed || 0) + count,
        sacrificeBuff: buffInfo.buff,
        buildings: {
          ...prev.buildings,
          wizard_tower: {
            ...prev.buildings.wizard_tower,
            shadowMiners: prev.buildings.wizard_tower.shadowMiners + shadowMinersToGrant,
          },
        },
      }));
    } else {
      const backfireChance = 0.005 + (count * 0.005);
      const backfired = Math.random() < backfireChance;
      
      const finalBuff = backfired ? {
        ...buffInfo.buff,
        moneyBonus: -buffInfo.buff.moneyBonus,
        pcxDamageBonus: -buffInfo.buff.pcxDamageBonus,
        minerDamageBonus: -buffInfo.buff.minerDamageBonus,
        allBonus: -buffInfo.buff.allBonus,
      } : buffInfo.buff;
      
      setGameState(prev => ({
        ...prev,
        minerCount: prev.minerCount - count,
        totalMinersSacrificed: (prev.totalMinersSacrificed || 0) + count,
        sacrificeBuff: finalBuff,
      }));
    }
    
    return true;
  }, [gameState.chosenPath, gameState.minerCount, getSacrificeBuffForCount]);

  // Shady Sam — add a stat swap (Darkness path only)
  const addShadySamSwap = useCallback((debuffStat: ShadySamStat, buffStat: ShadySamStat, amount: number): boolean => {
    if (gameState.chosenPath !== 'darkness') return false;
    if (debuffStat === buffStat) return false;
    if (amount <= 0) return false;
    const cost = getShadySamSwapCost(amount);
    if (gameState.yatesDollars < cost) return false;

    const swap: ShadySamSwap = {
      id: `sam_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      debuffStat,
      buffStat,
      amount: amount / 100,
    };

    setGameState(prev => ({
      ...prev,
      yatesDollars: prev.yatesDollars - cost,
      shadySamSwaps: [...prev.shadySamSwaps, swap],
    }));

    return true;
  }, [gameState.chosenPath, gameState.yatesDollars]);

  const removeShadySamSwap = useCallback((swapId: string): void => {
    setGameState(prev => ({
      ...prev,
      shadySamSwaps: prev.shadySamSwaps.filter(s => s.id !== swapId),
    }));
  }, []);

  // Check if player can activate the Golden Cookie ritual
  const canActivateRitual = useCallback((): boolean => {
    if (gameState.chosenPath !== 'darkness') return false;
    if (gameState.goldenCookieRitualActive) return false; // Already active
    // Need 1T$ AND 420 miners to sacrifice
    if (gameState.yatesDollars < 1000000000000) return false; // 1T$
    if (gameState.minerCount < 420) return false;
    return true;
  }, [gameState.chosenPath, gameState.goldenCookieRitualActive, gameState.yatesDollars, gameState.minerCount]);

  // Activate the Golden Cookie ritual (sacrifices 420 miners)
  // 30% chance to backfire - miners die but no cookie activation
  const activateGoldenCookieRitual = useCallback((): boolean => {
    if (!canActivateRitual()) return false;
    
    // 30% backfire chance
    const backfired = Math.random() < 0.30;
    
    setGameState(prev => ({
      ...prev,
      minerCount: prev.minerCount - 420, // Sacrifice 420 miners regardless
      goldenCookieRitualActive: backfired ? false : true, // Only activate if no backfire
    }));
    
    return !backfired; // Return false if backfired
  }, [canActivateRitual]);

  // Claim a reward from clicking the Golden/Dark Cookie
  // Works for Light path (always) and Darkness path (with ritual)
  // Gives money bonuses and rare rewards
  const claimGoldenCookieReward = useCallback((): { type: string; value: number | string } | null => {
    // Check eligibility: Light path always, Darkness path needs ritual
    const isLightPath = gameState.chosenPath === 'light';
    const isDarknessWithRitual = gameState.chosenPath === 'darkness' && gameState.goldenCookieRitualActive;
    
    if (!isLightPath && !isDarknessWithRitual) return null;
    
    // Track golden cookie collection for side levels
    setGameState(prev => ({ ...prev, totalGoldenCookiesCollected: (prev.totalGoldenCookiesCollected || 0) + 1 }));
    
    const roll = Math.random();
    let cumulative = 0;
    
    // NOTE: Yates Pickaxe removed from golden cookies - now obtained via secret challenge at /yates-inc/???
    
    // 1% - Yates Totem trinket
    cumulative += 0.01;
    if (roll < cumulative) {
      if (!gameState.ownedTrinketIds.includes('yates_totem')) {
        const newOwnedTrinkets = [...gameState.ownedTrinketIds, 'yates_totem'];
        setGameState(prev => ({ ...prev, ownedTrinketIds: newOwnedTrinkets }));
        if (userId && userType) {
          forceImmediateSave({ user_id: userId, user_type: userType, owned_trinket_ids: newOwnedTrinkets });
        }
        return { type: 'yates_totem', value: 'yates_totem' };
      }
      setGameState(prev => ({ ...prev, yatesDollars: safeAdd(prev.yatesDollars, 5000), totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, 5000) }));
      return { type: 'money', value: 5000 };
    }
    
    // 47% - Small money bonus (+0.5% of current, min $500)
    cumulative += 0.47;
    if (roll < cumulative) {
      const bonus = safeMoney(Math.max(500, Math.floor(gameState.yatesDollars * 0.005)));
      setGameState(prev => ({ ...prev, yatesDollars: safeAdd(prev.yatesDollars, bonus), totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, bonus) }));
      return { type: 'money', value: bonus };
    }
    
    // 51% - Medium money bonus (+1% of current, min $1000)
    cumulative += 0.51;
    if (roll < cumulative) {
      const bonus = safeMoney(Math.max(1000, Math.floor(gameState.yatesDollars * 0.01)));
      setGameState(prev => ({ ...prev, yatesDollars: safeAdd(prev.yatesDollars, bonus), totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, bonus) }));
      return { type: 'money', value: bonus };
    }
    
    // 1% - Secret "OwO" title (+500% everything!)
    cumulative += 0.01;
    if (!gameState.ownedTitleIds?.includes('owo_secret')) {
      setGameState(prev => ({ ...prev, ownedTitleIds: [...(prev.ownedTitleIds || []), 'owo_secret'] }));
      return { type: 'owo_title', value: 'owo_secret' };
    }
    const bonus = safeMoney(Math.max(2000, Math.floor(gameState.yatesDollars * 0.24)));
    setGameState(prev => ({ ...prev, yatesDollars: safeAdd(prev.yatesDollars, bonus), totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, bonus) }));
    return { type: 'money', value: bonus };
  }, [gameState.chosenPath, gameState.goldenCookieRitualActive, gameState.yatesDollars, gameState.ownedTrinketIds, gameState.ownedTitleIds, userId, userType]);

  // =====================
  // BUILDING SYSTEM FUNCTIONS
  // =====================

  const canAffordBuilding = useCallback((buildingId: BuildingType): boolean => {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) return false;
    return canBuyBuilding(building, gameState);
  }, [gameState]);

  const getBuildingCostForType = useCallback((buildingId: BuildingType): number => {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) return Infinity;
    const currentCount = getBuildingCount(buildingId, gameState);
    return getBuildingCost(building, currentCount, gameState.yatesDollars);
  }, [gameState]);

  const buyBuilding = useCallback((buildingId: BuildingType): boolean => {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) return false;
    if (!canBuyBuilding(building, gameState)) return false;

    const currentCount = getBuildingCount(buildingId, gameState);
    const cost = getBuildingCost(building, currentCount, gameState.yatesDollars);

    setGameState(prev => {
      const newBuildings = { ...prev.buildings };
      
      switch (buildingId) {
        case 'mine':
          newBuildings.mine = {
            ...newBuildings.mine,
            count: newBuildings.mine.count + 1,
          };
          break;
        case 'bank':
          newBuildings.bank = {
            ...newBuildings.bank,
            owned: true,
          };
          break;
        case 'factory':
          const newFactoryCount = newBuildings.factory.count + 1;
          newBuildings.factory = {
            ...newBuildings.factory,
            count: newFactoryCount,
            bonusMiners: newBuildings.factory.bonusMiners + FACTORY_BONUS_MINERS,
            nextBuffTime: newBuildings.factory.nextBuffTime || getNextFactoryBuffTime(newFactoryCount),
          };
          break;
        case 'temple':
          newBuildings.temple = {
            ...newBuildings.temple,
            owned: true,
            nextBuffTime: Date.now() + TEMPLE_BUFF_INTERVAL_MIN + Math.random() * (TEMPLE_BUFF_INTERVAL_MAX - TEMPLE_BUFF_INTERVAL_MIN),
          };
          break;
        case 'wizard_tower':
          newBuildings.wizard_tower = {
            ...newBuildings.wizard_tower,
            owned: true,
          };
          break;
        case 'shipment':
          const newDelivery = generateShipmentDelivery(newBuildings.shipment.count + 1);
          newBuildings.shipment = {
            ...newBuildings.shipment,
            count: newBuildings.shipment.count + 1,
            pendingDeliveries: [...newBuildings.shipment.pendingDeliveries, newDelivery],
          };
          break;
      }

      return {
        ...prev,
        yatesDollars: prev.yatesDollars - cost,
        buildings: newBuildings,
      };
    });

    return true;
  }, [gameState]);

  // Mine functions - Mines now generate passive income (= 20 miner-equivalents per mine)
  // These functions are kept for backward compatibility but no longer do the old absorb behavior
  const absorbMinersIntoMine = useCallback((): boolean => {
    // No longer absorbs miners - mines just passively generate income
    return false;
  }, []);

  const getMineEfficiency = useCallback((): number => {
    // Each mine = 20 miner-equivalents of passive income
    return gameState.buildings.mine.count * MINE_MINER_EQUIVALENTS_PER_MINE;
  }, [gameState.buildings.mine.count]);

  // Bank functions
  const depositToBank = useCallback((amount: number): boolean => {
    if (!gameState.buildings.bank.owned) return false;
    if (gameState.buildings.bank.depositAmount > 0) return false;
    if (amount <= 0 || amount > gameState.yatesDollars) return false;

    const cap = getBankDepositCap(gameState.buildings.bank.bankTier ?? 0);
    const clampedAmount = Math.min(amount, cap);
    if (clampedAmount <= 0) return false;

    setGameState(prev => ({
      ...prev,
      yatesDollars: prev.yatesDollars - clampedAmount,
      buildings: {
        ...prev.buildings,
        bank: {
          ...prev.buildings.bank,
          depositAmount: clampedAmount,
          depositTimestamp: Date.now(),
        },
      },
    }));

    return true;
  }, [gameState.buildings.bank, gameState.yatesDollars]);

  const unlockBankTier = useCallback((): boolean => {
    if (!gameState.buildings.bank.owned) return false;
    const currentTier = gameState.buildings.bank.bankTier ?? 0;
    const nextTier = currentTier + 1;
    if (nextTier > BANK_MAX_TIER) return false;
    const cost = BANK_TIERS[nextTier].unlockCost;
    if (gameState.yatesDollars < cost) return false;

    setGameState(prev => ({
      ...prev,
      yatesDollars: prev.yatesDollars - cost,
      buildings: {
        ...prev.buildings,
        bank: {
          ...prev.buildings.bank,
          bankTier: nextTier,
        },
      },
    }));

    return true;
  }, [gameState.buildings.bank, gameState.yatesDollars]);

  // Get bank interest multiplier from equipped trinkets
  const getBankInterestMultiplier = useCallback((): number => {
    let multiplier = 1;
    for (const trinketId of gameState.equippedTrinketIds) {
      const isRelic = trinketId.endsWith('_relic');
      const isTalisman = trinketId.endsWith('_talisman');
      const baseId = trinketId.replace('_relic', '').replace('_talisman', '');

      // Yates Totem relic/talisman has hardcoded bank interest overrides
      if (baseId === 'yates_totem' && (isRelic || isTalisman)) {
        const override = isRelic ? YATES_TOTEM_RELIC_EFFECTS : YATES_TOTEM_TALISMAN_EFFECTS;
        if (override.bankInterestBonus) multiplier *= override.bankInterestBonus;
        continue;
      }

      const trinket = TRINKETS.find(t => t.id === baseId);
      if (trinket?.effects.bankInterestBonus) {
        multiplier *= trinket.effects.bankInterestBonus;
      }
    }
    return multiplier;
  }, [gameState.equippedTrinketIds]);

  const withdrawFromBank = useCallback((): { principal: number; interest: number; capped: boolean } | null => {
    if (!gameState.buildings.bank.owned) return null;
    if (gameState.buildings.bank.depositAmount <= 0) return null;
    if (!gameState.buildings.bank.depositTimestamp) return null;

    const principal = gameState.buildings.bank.depositAmount;
    const interestMultiplier = getBankInterestMultiplier();
    const interest = calculateBankInterest(
      principal,
      gameState.buildings.bank.depositTimestamp,
      Date.now(),
      interestMultiplier,
      gameState.sideLevel || 0
    );

    const fullAmount = principal + interest;
    const withdrawCap = Math.max(gameState.yatesDollars, (gameState.totalMoneyEarned || 0) / 2);
    const withdrawAmount = Math.min(fullAmount, withdrawCap);
    const capped = withdrawAmount < fullAmount;

    setGameState(prev => ({
      ...prev,
      yatesDollars: safeAdd(prev.yatesDollars, safeMoney(withdrawAmount)),
      totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, safeMoney(Math.min(interest, withdrawAmount))),
      buildings: {
        ...prev.buildings,
        bank: {
          ...prev.buildings.bank,
          depositAmount: 0,
          depositTimestamp: null,
          lastInterestClaim: Date.now(),
        },
      },
    }));

    return { principal, interest, capped };
  }, [gameState.buildings.bank, gameState.yatesDollars, gameState.totalMoneyEarned, getBankInterestMultiplier]);

  const getBankBalance = useCallback((): { principal: number; interest: number; totalTime: number } => {
    if (!gameState.buildings.bank.depositTimestamp || gameState.buildings.bank.depositAmount <= 0) {
      return { principal: 0, interest: 0, totalTime: 0 };
    }
    
    const principal = gameState.buildings.bank.depositAmount;
    const totalTime = Date.now() - gameState.buildings.bank.depositTimestamp;
    const interestMultiplier = getBankInterestMultiplier();
    const interest = calculateBankInterest(principal, gameState.buildings.bank.depositTimestamp, Date.now(), interestMultiplier, gameState.sideLevel || 0);
    
    return { principal, interest, totalTime };
  }, [gameState.buildings.bank, getBankInterestMultiplier]);

  // =====================
  // LOAN FUNCTIONS
  // =====================

  const takeLoan = useCallback((amount: number): boolean => {
    if (amount <= 0 || amount > LOAN_MAX_AMOUNT) return false;
    if (gameState.loanAmount > 0) return false; // One loan at a time
    if (!gameState.buildings.bank.owned) return false;

    const now = Date.now();
    setGameState(prev => ({
      ...prev,
      yatesDollars: safeAdd(prev.yatesDollars, safeMoney(amount)),
      loanAmount: amount,
      loanTakenAt: now,
      loanLastAccrualAt: now,
    }));

    return true;
  }, [gameState.loanAmount, gameState.buildings.bank.owned]);

  const repayLoan = useCallback((amount: number): boolean => {
    if (amount <= 0) return false;

    let didRepay = false;
    setGameState(prev => {
      if (prev.loanAmount <= 0) return prev;
      const repayAmount = Math.min(amount, prev.loanAmount, prev.yatesDollars);
      if (repayAmount <= 0) return prev;

      didRepay = true;
      const newDebt = Math.max(0, prev.loanAmount - repayAmount);
      return {
        ...prev,
        yatesDollars: prev.yatesDollars - repayAmount,
        loanAmount: newDebt,
        loanTakenAt: newDebt <= 0 ? null : prev.loanTakenAt,
        loanLastAccrualAt: newDebt <= 0 ? null : prev.loanLastAccrualAt,
      };
    });

    return didRepay;
  }, []);

  const getLoanStatus = useCallback((): { debt: number; dailyInterest: number; isAutoRepaying: boolean } => {
    const debt = gameState.loanAmount;
    const dailyInterest = debt * LOAN_DAILY_INTEREST_RATE;
    const isAutoRepaying = debt >= gameState.yatesDollars * LOAN_AUTO_REPAY_THRESHOLD;
    return { debt, dailyInterest, isAutoRepaying };
  }, [gameState.loanAmount, gameState.yatesDollars]);

  // Factory functions
  const getFactoryBonusMiners = useCallback((): number => {
    return gameState.buildings.factory.bonusMiners;
  }, [gameState.buildings.factory.bonusMiners]);

  // Temple functions (Light path)
  // Temple rank unlock costs (much higher now)
  const TEMPLE_RANK_COSTS: Record<number, number> = {
    1: 50_000_000_000_000, // 50T
    2: 250_000_000_000_000, // 250T
    3: 1_000_000_000_000_000, // 1Q
  };

  const buyTempleUpgrade = useCallback((upgradeType: string, rank: number): boolean => {
    if (!gameState.buildings.temple.owned) return false;
    if (gameState.chosenPath !== 'light') return false;
    if (rank < 1 || rank > 3) return false;

    // Check if already unlocked
    const alreadyUnlocked = gameState.buildings.temple.upgrades.some(u => u.rank === rank);
    if (alreadyUnlocked) return false;

    // Check if previous rank is unlocked (must unlock in order)
    if (rank > 1) {
      const prevUnlocked = gameState.buildings.temple.upgrades.some(u => u.rank === rank - 1);
      if (!prevUnlocked) return false;
    }

    // Check cost
    const cost = TEMPLE_RANK_COSTS[rank];
    if (!cost || gameState.yatesDollars < cost) return false;

    setGameState(prev => {
      const newUpgrades = [...prev.buildings.temple.upgrades, { type: 'all' as any, rank: rank as any }];

      return {
        ...prev,
        yatesDollars: prev.yatesDollars - cost,
        buildings: {
          ...prev.buildings,
          temple: {
            ...prev.buildings.temple,
            upgrades: newUpgrades,
          },
        },
      };
    });

    return true;
  }, [gameState.buildings.temple.owned, gameState.buildings.temple.upgrades, gameState.chosenPath, gameState.yatesDollars]);

  // Equip/unequip a temple rank
  const equipTempleRank = useCallback((rank: number | null): boolean => {
    if (!gameState.buildings.temple.owned) return false;
    
    // If rank is provided, check if it's unlocked
    if (rank !== null) {
      const isUnlocked = gameState.buildings.temple.upgrades.some(u => u.rank === rank);
      if (!isUnlocked) return false;
    }

    setGameState(prev => ({
      ...prev,
      buildings: {
        ...prev.buildings,
        temple: {
          ...prev.buildings.temple,
          equippedRank: rank as any,
        },
      },
    }));

    return true;
  }, [gameState.buildings.temple.owned, gameState.buildings.temple.upgrades]);

  // Get temple bonus based on EQUIPPED rank
  const getTempleUpgradeBonus = useCallback((upgradeType: string): number => {
    const equippedRank = gameState.buildings.temple.equippedRank;
    if (!equippedRank) return 0;

    const values: Record<number, Record<string, number>> = {
      1: { money: 0.27, pcxDamage: 0.36, prestigePower: 0.15, trinketPower: 0.24 },
      2: { money: 0.55, pcxDamage: 0.73, prestigePower: 0.30, trinketPower: 0.49 },
      3: { money: 0.90, pcxDamage: 1.20, prestigePower: 0.50, trinketPower: 0.81 },
    };

    return values[equippedRank]?.[upgradeType] || 0;
  }, [gameState.buildings.temple.equippedRank]);

  // Temple Prayer System - 20% chance to spawn golden cookie
  const PRAYER_COOLDOWN_MS = 3000; // 3 second cooldown between prayers
  
  const prayAtTemple = useCallback((): { success: boolean; message: string } => {
    // Must be on Light path with Temple owned
    if (gameState.chosenPath !== 'light') {
      return { success: false, message: 'Only followers of the Light may pray here.' };
    }
    if (!gameState.buildings.temple.owned) {
      return { success: false, message: 'You must own a Temple to pray.' };
    }
    
    // Check cooldown
    const now = Date.now();
    const lastPrayer = gameState.buildings.temple.lastPrayerTime;
    if (lastPrayer && now - lastPrayer < PRAYER_COOLDOWN_MS) {
      const remaining = Math.ceil((PRAYER_COOLDOWN_MS - (now - lastPrayer)) / 1000);
      return { success: false, message: `Wait ${remaining}s before praying again.` };
    }
    
    const roll = Math.random();
    const newPrayerCount = (gameState.buildings.temple.prayerCount || 0) + 1;
    // Temple Rank 3: guaranteed GC every 2 prays. Otherwise 20% chance.
    const isRank3 = gameState.buildings.temple.equippedRank === 3;
    const isSuccess = (isRank3 && newPrayerCount % 2 === 0) || roll < 0.20;
    
    setGameState(prev => ({
      ...prev,
      buildings: {
        ...prev.buildings,
        temple: {
          ...prev.buildings.temple,
          prayerCount: newPrayerCount,
          lastPrayerTime: now,
          pendingGoldenCookie: isSuccess ? true : prev.buildings.temple.pendingGoldenCookie,
        },
      },
    }));
    
    if (isSuccess) {
      return { success: true, message: '🍪 The Gods of Yates have blessed you! A Golden Cookie appears!' };
    } else {
      const messages = [
        'The gods remain silent... Keep praying!',
        'Your prayers echo into the void. Try again!',
        'The gods are busy. Pray harder!',
        'Not this time... The gods test your faith.',
        'Silence. Perhaps pray more fervently?',
        'Yates is sleeping... Try waking him up! 😴',
        'A thief stole your mail to Yates. Send another one! 📬',
        'Yates is having a meeting with the Higherups. Pray harder! 👔',
        'Maybe a little more? 🤏',
        '.....Nothing? 😶',
      ];
      return { success: false, message: messages[Math.floor(Math.random() * messages.length)] };
    }
  }, [gameState.chosenPath, gameState.buildings.temple.owned, gameState.buildings.temple.lastPrayerTime]);

  // Consume the pending golden cookie (called by GoldenCookie component)
  const consumePendingGoldenCookie = useCallback((): boolean => {
    if (!gameState.buildings.temple.pendingGoldenCookie) return false;
    
    setGameState(prev => ({
      ...prev,
      buildings: {
        ...prev.buildings,
        temple: {
          ...prev.buildings.temple,
          pendingGoldenCookie: false,
        },
      },
    }));
    
    return true;
  }, [gameState.buildings.temple.pendingGoldenCookie]);

  // Wizard Tower functions (Darkness path)
  const WIZARD_RITUAL_DURATION_MS = 60000; // 1 minute
  const WIZARD_RITUAL_MINER_COST = 367; // Must have 367 miners
  
  const startWizardRitual = useCallback((): boolean => {
    if (!gameState.buildings.wizard_tower.owned) return false;
    if (gameState.chosenPath !== 'darkness') return false;
    if (gameState.buildings.wizard_tower.ritualActive) return false;
    if (gameState.minerCount < WIZARD_RITUAL_MINER_COST) return false; // Need 367 miners

    // 41% chance to backfire - spawns 200 dark miners instead
    const backfired = Math.random() < 0.41;
    
    if (backfired) {
      // Backfire: Spawn 200 dark miners that steal money
      setGameState(prev => ({
        ...prev,
        buildings: {
          ...prev.buildings,
          wizard_tower: {
            ...prev.buildings.wizard_tower,
            darkMiners: prev.buildings.wizard_tower.darkMiners + 200,
            darkMinerNextSteal: prev.buildings.wizard_tower.darkMinerNextSteal || Date.now() + 120000, // 2 min
          },
        },
      }));
      return false; // Ritual failed
    }

    const ritualEndTime = Date.now() + WIZARD_RITUAL_DURATION_MS;
    
    setGameState(prev => ({
      ...prev,
      buildings: {
        ...prev.buildings,
        wizard_tower: {
          ...prev.buildings.wizard_tower,
          ritualActive: true,
          ritualEndTime,
        },
      },
    }));

    // Set timeout to end ritual
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        buildings: {
          ...prev.buildings,
          wizard_tower: {
            ...prev.buildings.wizard_tower,
            ritualActive: false,
            ritualEndTime: null,
          },
        },
      }));
    }, WIZARD_RITUAL_DURATION_MS);

    return true;
  }, [gameState.buildings.wizard_tower.owned, gameState.buildings.wizard_tower.ritualActive, gameState.chosenPath, gameState.minerCount]);

  const isWizardRitualActive = useCallback((): boolean => {
    if (!gameState.buildings.wizard_tower.ritualActive) return false;
    if (!gameState.buildings.wizard_tower.ritualEndTime) return false;
    return Date.now() < gameState.buildings.wizard_tower.ritualEndTime;
  }, [gameState.buildings.wizard_tower.ritualActive, gameState.buildings.wizard_tower.ritualEndTime]);

  // Shipment functions
  const collectShipmentDelivery = useCallback((deliveryId: string): { type: string; value: string | number } | null => {
    const delivery = gameState.buildings.shipment.pendingDeliveries.find(d => d.id === deliveryId);
    if (!delivery) return null;
    if (Date.now() < delivery.arrivalTime) return null;

    // Remove the delivery and add a new one
    const newDelivery = generateShipmentDelivery(gameState.buildings.shipment.count);
    
    setGameState(prev => ({
      ...prev,
      buildings: {
        ...prev.buildings,
        shipment: {
          ...prev.buildings.shipment,
          pendingDeliveries: [
            ...prev.buildings.shipment.pendingDeliveries.filter(d => d.id !== deliveryId),
            newDelivery,
          ],
          totalDeliveries: prev.buildings.shipment.totalDeliveries + 1,
        },
      },
    }));

    // Apply the reward based on type
    switch (delivery.type) {
      case 'money':
        const moneyAmount = safeMoney(typeof delivery.value === 'number' ? delivery.value : 0);
        setGameState(prev => ({
          ...prev,
          yatesDollars: safeAdd(prev.yatesDollars, moneyAmount),
          totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, moneyAmount),
        }));
        break;
      case 'prestige_tokens':
        const tokenAmount = typeof delivery.value === 'number' ? delivery.value : 0;
        setGameState(prev => ({
          ...prev,
          prestigeTokens: prev.prestigeTokens + tokenAmount,
        }));
        break;
      // TODO: Handle exotic_rock, trinket, and title rewards
    }

    return { type: delivery.type, value: delivery.value };
  }, [gameState.buildings.shipment]);

  const getPendingShipments = useCallback((): { id: string; type: string; arrivalTime: number; isReady: boolean }[] => {
    const now = Date.now();
    return gameState.buildings.shipment.pendingDeliveries.map(d => ({
      id: d.id,
      type: d.type,
      arrivalTime: d.arrivalTime,
      isReady: now >= d.arrivalTime,
    }));
  }, [gameState.buildings.shipment.pendingDeliveries]);

  // Buff/Debuff functions
  const getActiveBuffs = useCallback((): ActiveBuff[] => {
    const now = Date.now();
    return gameState.activeBuffs.filter(buff => now < buff.startTime + buff.duration);
  }, [gameState.activeBuffs]);

  const getActiveDebuffs = useCallback((): ActiveDebuff[] => {
    const now = Date.now();
    return gameState.activeDebuffs.filter(debuff => {
      if (debuff.duration === null) return true; // Permanent
      return now < debuff.startTime + debuff.duration;
    });
  }, [gameState.activeDebuffs]);

  const getTotalBuffMultiplier = useCallback((type: string): number => {
    const activeBuffs = getActiveBuffs();
    let total = 0;
    for (const buff of activeBuffs) {
      if (buff.type === type) {
        total += buff.multiplier;
      }
    }
    return total;
  }, [getActiveBuffs]);

  // Progressive Upgrades
  const buyProgressiveUpgrade = useCallback((upgradeId: ProgressiveUpgradeType): boolean => {
    const upgrade = PROGRESSIVE_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    
    const currentLevel = gameState.progressiveUpgrades[upgradeId];
    if (currentLevel >= upgrade.maxLevel) return false;
    
    const cost = getProgressiveUpgradeCost(upgrade, currentLevel);
    if (gameState.yatesDollars < cost) return false;

    setGameState(prev => ({
      ...prev,
      yatesDollars: prev.yatesDollars - cost,
      progressiveUpgrades: {
        ...prev.progressiveUpgrades,
        [upgradeId]: prev.progressiveUpgrades[upgradeId] + 1,
      },
    }));

    return true;
  }, [gameState.yatesDollars, gameState.progressiveUpgrades]);

  const getProgressiveUpgradeLevel = useCallback((upgradeId: ProgressiveUpgradeType): number => {
    return gameState.progressiveUpgrades[upgradeId] || 0;
  }, [gameState.progressiveUpgrades]);

  const getProgressiveUpgradeTotalBonus = useCallback((upgradeId: ProgressiveUpgradeType): number => {
    const upgrade = PROGRESSIVE_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return 0;
    return getProgressiveUpgradeBonus(upgrade, gameState.progressiveUpgrades[upgradeId] || 0);
  }, [gameState.progressiveUpgrades]);

  // Powerups
  // Golden Touch, Mining Frenzy, Building Boost cost 80% of current money
  // Other powerups use fixed costs
  const buyPowerup = useCallback((powerupId: PowerupType): boolean => {
    const powerup = POWERUPS.find(p => p.id === powerupId);
    if (!powerup) return false;
    
    // These three powerups cost 80% of current money
    const dynamicCostPowerups: PowerupType[] = ['goldenTouch', 'miningFrenzy', 'buildingBoost'];
    const cost = dynamicCostPowerups.includes(powerupId) 
      ? Math.floor(gameState.yatesDollars * 0.80)  // 80% of current money
      : powerup.cost;  // Fixed cost for others
    
    // Need at least some money for dynamic cost powerups
    if (dynamicCostPowerups.includes(powerupId) && gameState.yatesDollars < 1000) return false;
    if (!dynamicCostPowerups.includes(powerupId) && gameState.yatesDollars < cost) return false;

    setGameState(prev => ({
      ...prev,
      yatesDollars: prev.yatesDollars - cost,
      powerupInventory: {
        ...prev.powerupInventory,
        [powerupId]: (prev.powerupInventory[powerupId] || 0) + 1,
      },
    }));

    return true;
  }, [gameState.yatesDollars]);

  const usePowerup = useCallback((powerupId: PowerupType): boolean => {
    const count = gameState.powerupInventory[powerupId] || 0;
    if (count <= 0) return false;

    const powerup = POWERUPS.find(p => p.id === powerupId);
    if (!powerup) return false;

    // Consume the powerup
    setGameState(prev => ({
      ...prev,
      powerupInventory: {
        ...prev.powerupInventory,
        [powerupId]: prev.powerupInventory[powerupId] - 1,
      },
    }));

    // Apply the effect based on powerup type
    switch (powerupId) {
      case 'miningFrenzy':
      case 'buildingBoost':
        // Add as active buff
        const buff: ActiveBuff = {
          id: `powerup_${powerupId}_${Date.now()}`,
          type: powerup.effect.type as any,
          multiplier: powerup.effect.value,
          duration: powerup.duration || 0,
          startTime: Date.now(),
          source: 'powerup',
          name: powerup.name,
          icon: powerup.icon,
        };
        setGameState(prev => ({
          ...prev,
          activeBuffs: [...prev.activeBuffs, buff],
        }));
        break;
      case 'goldenTouch':
        // Add as active powerup with click tracking
        setGameState(prev => ({
          ...prev,
          activePowerups: [...prev.activePowerups, {
            type: 'goldenTouch',
            startTime: Date.now(),
            duration: null,
            remainingClicks: powerup.effect.clicks,
          }],
        }));
        break;
      case 'timeWarp':
        // Calculate 1 hour of miner income and add it
        const minerDamage = MINER_BASE_DAMAGE * gameState.minerCount;
        const ticksPerHour = 3600; // 1 tick per second for 1 hour
        const hourlyIncome = safeMoney(minerDamage * ticksPerHour);
        setGameState(prev => ({
          ...prev,
          yatesDollars: safeAdd(prev.yatesDollars, hourlyIncome),
          totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, hourlyIncome),
        }));
        break;
      case 'luckyStrike':
        setGameState(prev => ({
          ...prev,
          guaranteedCouponDrop: true,
        }));
        break;
    }

    return true;
  }, [gameState.powerupInventory, gameState.minerCount]);

  const getPowerupCount = useCallback((powerupId: PowerupType): number => {
    return gameState.powerupInventory[powerupId] || 0;
  }, [gameState.powerupInventory]);

  // =====================
  // WANDERING TRADER SYSTEM
  // =====================
  
  // Track permanent buffs from Wandering Trader purchases
  const [wanderingTraderPermBuffs, setWanderingTraderPermBuffs] = useState({
    moneyBonus: 0,
    couponLuckBonus: 0,
    minerSpeedBonus: 0,
    minerDamageBonus: 0,
  });

  const spawnWanderingTrader = useCallback((): boolean => {
    // Only available on Darkness path
    if (gameState.chosenPath !== 'darkness') return false;
    // Don't spawn if banned (unless using admin command)
    if (gameState.wtBanned) return false;
    
    // Determine number of offers based on deal level
    // Default 3, Deal 1 = 6 offers, Deal 2/3 = ALL offers available
    let offerCount = 3;
    if (gameState.wtDealLevel === 1) offerCount = 6;
    if (gameState.wtDealLevel >= 2) offerCount = 10; // Basically all types
    
    // Generate offers with rare chance modifier if suspicious
    const rareChanceMultiplier = gameState.wtSuspicious ? 0.5 : 1;
    const offers = generateWanderingTraderOffers(offerCount, rareChanceMultiplier);
    
    // Calculate next spawn time with modifiers
    let spawnMultiplier = 1;
    if (gameState.wtSuspicious) spawnMultiplier = 2; // 2x slower
    if (gameState.wtRedeemed) spawnMultiplier = 0.8; // 1.25x faster
    const baseNextSpawn = getWanderingTraderNextSpawn();
    const adjustedNextSpawn = Date.now() + (baseNextSpawn - Date.now()) * spawnMultiplier;
    
    setGameState(prev => ({
      ...prev,
      wanderingTraderVisible: true,
      wanderingTraderLastSpawn: Date.now(),
      wanderingTraderNextSpawn: adjustedNextSpawn,
      wanderingTraderShopItems: offers,
      wanderingTraderDespawnTime: Date.now() + WANDERING_TRADER_DURATION,
    }));
    
    return true;
  }, [gameState.chosenPath, gameState.wtBanned, gameState.wtDealLevel, gameState.wtSuspicious, gameState.wtRedeemed]);

  const dismissWanderingTrader = useCallback(() => {
    // Set next spawn to 5-10 minutes from now to prevent immediate re-spawn
    const nextSpawnDelay = (5 + Math.random() * 5) * 60 * 1000; // 5-10 minutes
    setGameState(prev => ({
      ...prev,
      wanderingTraderVisible: false,
      wanderingTraderShopItems: [],
      wanderingTraderDespawnTime: null,
      wanderingTraderNextSpawn: Date.now() + nextSpawnDelay,
    }));
  }, []);

  // Clear the despawn timer when player interacts with the trader (opens shop)
  const clearWanderingTraderTimer = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      wanderingTraderDespawnTime: null,
    }));
  }, []);

  // Apply WT dialog effects (deal accepted, ban, suspicious, etc.)
  const applyWTDialogEffect = useCallback((effect: 'suspicious' | 'deal_5' | 'deal_15' | 'deal_25' | 'ban' | 'gift' | 'redemption') => {
    setGameState(prev => {
      switch (effect) {
        case 'suspicious':
          return { ...prev, wtSuspicious: true };
        case 'deal_5':
          return { ...prev, wtDealLevel: 1 as const, wtMoneyTax: 0.05, wtDialogCompleted: true };
        case 'deal_15':
          return { ...prev, wtDealLevel: 2 as const, wtMoneyTax: 0.15, wtDialogCompleted: true };
        case 'deal_25':
          return { ...prev, wtDealLevel: 3 as const, wtMoneyTax: 0.25, wtDialogCompleted: true };
        case 'ban':
          return { ...prev, wtBanned: true };
        case 'gift':
          // Take 80% of money
          return { ...prev, yatesDollars: Math.floor(prev.yatesDollars * 0.2) };
        case 'redemption':
          return { ...prev, wtBanned: false, wtRedeemed: true, wtDealLevel: 2 as const, wtMoneyTax: 0.15, wtDialogCompleted: true };
        default:
          return prev;
      }
    });
  }, []);

  const isWanderingTraderVisible = useCallback((): boolean => {
    return gameState.wanderingTraderVisible && 
           (gameState.wanderingTraderDespawnTime === null || 
            Date.now() < gameState.wanderingTraderDespawnTime);
  }, [gameState.wanderingTraderVisible, gameState.wanderingTraderDespawnTime]);

  const getWanderingTraderOffers = useCallback((): WanderingTraderOffer[] => {
    return gameState.wanderingTraderShopItems;
  }, [gameState.wanderingTraderShopItems]);

  const getWanderingTraderTimeLeft = useCallback((): number => {
    if (!gameState.wanderingTraderDespawnTime) return 0;
    return Math.max(0, gameState.wanderingTraderDespawnTime - Date.now());
  }, [gameState.wanderingTraderDespawnTime]);

  // Stokens functions
  const addStokens = useCallback((amount: number) => {
    setGameState(prev => ({
      ...prev,
      stokens: prev.stokens + amount,
    }));
  }, []);

  const spendStokens = useCallback((amount: number): boolean => {
    if (gameState.stokens < amount) return false;
    setGameState(prev => ({
      ...prev,
      stokens: prev.stokens - amount,
    }));
    return true;
  }, [gameState.stokens]);

  const getStokens = useCallback((): number => {
    return gameState.stokens;
  }, [gameState.stokens]);

  // Lottery Ticket functions
  const addLotteryTickets = useCallback((amount: number) => {
    setGameState(prev => ({
      ...prev,
      lotteryTickets: prev.lotteryTickets + amount,
    }));
  }, []);

  const spendLotteryTickets = useCallback((amount: number): boolean => {
    if (gameState.lotteryTickets < amount) return false;
    setGameState(prev => ({
      ...prev,
      lotteryTickets: prev.lotteryTickets - amount,
    }));
    return true;
  }, [gameState.lotteryTickets]);

  const getLotteryTickets = useCallback((): number => {
    return gameState.lotteryTickets;
  }, [gameState.lotteryTickets]);

  // Roulette spin
  const spinRouletteWheel = useCallback((): RouletteResult => {
    const result = spinRoulette();
    
    // Apply the result
    switch (result.segment) {
      case 'money_loss':
        const lossAmount = Math.floor(gameState.yatesDollars * (result.value || 0.80));
        setGameState(prev => ({
          ...prev,
          yatesDollars: prev.yatesDollars - lossAmount,
        }));
        break;
      case 'prestige_tokens':
        setGameState(prev => ({
          ...prev,
          prestigeTokens: prev.prestigeTokens + (result.value || 10),
        }));
        break;
      case 'stokens':
        setGameState(prev => ({
          ...prev,
          stokens: prev.stokens + (result.value || 5),
        }));
        break;
      case 'special_trinket':
        if (result.trinketId) {
          // Fortune's Gambit comes pre-converted as a Relic
          // Add to ownedTrinketIds as base ID, and to ownedRelicIds with _relic suffix
          setGameState(prev => ({
            ...prev,
            ownedTrinketIds: [...prev.ownedTrinketIds, result.trinketId!],
            ownedRelicIds: [...prev.ownedRelicIds, `${result.trinketId!}_relic`],
          }));
        }
        break;
      // 'nothing' - no action needed
    }
    
    return result;
  }, [gameState.yatesDollars]);

  // Purchase Wandering Trader offer
  const purchaseWanderingTraderOffer = useCallback((offerId: string, selectedTrinketIds?: string[]): boolean => {
    const offer = gameState.wanderingTraderShopItems.find(o => o.id === offerId);
    if (!offer) return false;

    // Check and deduct cost
    switch (offer.cost.type) {
      case 'money':
        if (gameState.yatesDollars < (offer.cost.amount || 0)) return false;
        setGameState(prev => ({
          ...prev,
          yatesDollars: prev.yatesDollars - (offer.cost.amount || 0),
        }));
        break;
      case 'all_money':
        setGameState(prev => ({
          ...prev,
          yatesDollars: 0,
        }));
        break;
      case 'trinkets':
        const requiredCount = offer.cost.trinketCount || 2;
        if (!selectedTrinketIds || selectedTrinketIds.length !== requiredCount) return false;
        // Check ownership and remove trinkets
        for (const trinketId of selectedTrinketIds) {
          if (!gameState.ownedTrinketIds.includes(trinketId)) return false;
        }
        setGameState(prev => ({
          ...prev,
          ownedTrinketIds: prev.ownedTrinketIds.filter(id => !selectedTrinketIds.includes(id)),
          equippedTrinketIds: prev.equippedTrinketIds.filter(id => !selectedTrinketIds.includes(id)),
        }));
        break;
      case 'debuff':
        // Apply debuff along with the purchase
        if (offer.cost.debuff) {
          const debuff: ActiveDebuff = {
            id: `wt_debuff_${Date.now()}`,
            type: 'slowPickaxe',
            severity: Math.abs(offer.cost.debuff.value),
            duration: offer.cost.debuff.duration,
            startTime: Date.now(),
            name: `${Math.round(Math.abs(offer.cost.debuff.value) * 100)}% Slower Clicks`,
            icon: '🐌',
          };
          setGameState(prev => ({
            ...prev,
            activeDebuffs: [...prev.activeDebuffs, debuff],
          }));
        }
        break;
      case 'free':
        // No cost
        break;
    }

    // Apply effect
    switch (offer.effect.type) {
      case 'buff':
        if (offer.effect.buffType && offer.effect.value !== undefined) {
          const buff: ActiveBuff = {
            id: `wt_buff_${Date.now()}`,
            type: offer.effect.buffType === 'pcxDamage' ? 'damage' : 
                  offer.effect.buffType === 'couponLuck' ? 'money' : 
                  offer.effect.buffType as any,
            multiplier: offer.effect.value,
            duration: offer.effect.duration || 60000,
            startTime: Date.now(),
            source: 'event',
            name: offer.name,
            icon: '🧙',
          };
          setGameState(prev => ({
            ...prev,
            activeBuffs: [...prev.activeBuffs, buff],
          }));
        }
        break;
      case 'perm_buff':
        if (offer.effect.buffType && offer.effect.value !== undefined) {
          const buffValue = offer.effect.value;
          const buffKey = offer.effect.buffType === 'money' ? 'moneyBonus' :
                          offer.effect.buffType === 'couponLuck' ? 'couponLuckBonus' :
                          offer.effect.buffType === 'minerSpeed' ? 'minerSpeedBonus' :
                          offer.effect.buffType === 'minerDamage' ? 'minerDamageBonus' : 'moneyBonus';
          setWanderingTraderPermBuffs(prev => ({
            ...prev,
            [buffKey]: prev[buffKey] + buffValue,
          }));
        }
        break;
      case 'trinket':
        if (offer.effect.trinketId) {
          // Void Merchant's Pact comes pre-converted as a Talisman
          // Add to ownedTrinketIds as base ID, and to ownedTalismanIds with _talisman suffix
          setGameState(prev => ({
            ...prev,
            ownedTrinketIds: [...prev.ownedTrinketIds, offer.effect.trinketId!],
            ownedTalismanIds: [...prev.ownedTalismanIds, `${offer.effect.trinketId!}_talisman`],
          }));
        }
        break;
      case 'stokens':
        if (offer.effect.value) {
          setGameState(prev => ({
            ...prev,
            stokens: prev.stokens + offer.effect.value!,
          }));
        }
        break;
      case 'title':
        if (offer.effect.titleId) {
          setGameState(prev => ({
            ...prev,
            ownedTitleIds: [...prev.ownedTitleIds, offer.effect.titleId!],
          }));
        }
        break;
      case 'roulette':
        // Roulette is handled separately via spinRouletteWheel
        // This just indicates the purchase was successful
        break;
    }

    // Remove the purchased offer from shop
    setGameState(prev => ({
      ...prev,
      wanderingTraderShopItems: prev.wanderingTraderShopItems.filter(o => o.id !== offerId),
    }));

    return true;
  }, [gameState.wanderingTraderShopItems, gameState.yatesDollars, gameState.ownedTrinketIds, gameState.stokens]);

  // Auto-spawn Wandering Trader (Darkness path only)
  useEffect(() => {
    if (gameState.chosenPath !== 'darkness') return;
    if (gameState.wanderingTraderVisible) return;

    const timeUntilSpawn = gameState.wanderingTraderNextSpawn - Date.now();
    if (timeUntilSpawn <= 0) {
      // Spawn immediately if time has passed
      spawnWanderingTrader();
      return;
    }

    const timeout = setTimeout(() => {
      spawnWanderingTrader();
    }, timeUntilSpawn);

    return () => clearTimeout(timeout);
  }, [gameState.chosenPath, gameState.wanderingTraderVisible, gameState.wanderingTraderNextSpawn, spawnWanderingTrader]);

  // Auto-despawn Wandering Trader after 1 minute
  useEffect(() => {
    if (!gameState.wanderingTraderVisible || !gameState.wanderingTraderDespawnTime) return;

    const timeUntilDespawn = gameState.wanderingTraderDespawnTime - Date.now();
    if (timeUntilDespawn <= 0) {
      dismissWanderingTrader();
      return;
    }

    const timeout = setTimeout(() => {
      dismissWanderingTrader();
    }, timeUntilDespawn);

    return () => clearTimeout(timeout);
  }, [gameState.wanderingTraderVisible, gameState.wanderingTraderDespawnTime, dismissWanderingTrader]);

  // Clear expired buffs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setGameState(prev => ({
        ...prev,
        activeBuffs: prev.activeBuffs.filter(buff => now < buff.startTime + buff.duration),
        activeDebuffs: prev.activeDebuffs.filter(debuff => {
          if (debuff.duration === null) return true;
          return now < debuff.startTime + debuff.duration;
        }),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Factory buff generation
  useEffect(() => {
    if (gameState.buildings.factory.count === 0) return;
    if (!gameState.buildings.factory.nextBuffTime) return;

    const timeUntilBuff = gameState.buildings.factory.nextBuffTime - Date.now();
    if (timeUntilBuff > 0) {
      const timeout = setTimeout(() => {
        const buff = generateFactoryBuff();
        setGameState(prev => ({
          ...prev,
          activeBuffs: [...prev.activeBuffs, buff],
          buildings: {
            ...prev.buildings,
            factory: {
              ...prev.buildings.factory,
              lastBuffTime: Date.now(),
              nextBuffTime: getNextFactoryBuffTime(),
            },
          },
        }));
      }, timeUntilBuff);

      return () => clearTimeout(timeout);
    }
  }, [gameState.buildings.factory.count, gameState.buildings.factory.nextBuffTime]);

  // Clear expired sacrifice buff
  useEffect(() => {
    if (!gameState.sacrificeBuff) return;
    
    const timeLeft = gameState.sacrificeBuff.endsAt - Date.now();
    if (timeLeft <= 0) {
      setGameState(prev => ({ ...prev, sacrificeBuff: null }));
      return;
    }

    const timeout = setTimeout(() => {
      setGameState(prev => ({ ...prev, sacrificeBuff: null }));
    }, timeLeft);

    return () => clearTimeout(timeout);
  }, [gameState.sacrificeBuff]);

  // Temple tax mechanic - takes % of money every X minutes based on rank
  useEffect(() => {
    const equippedRank = gameState.buildings.temple.equippedRank;
    if (!equippedRank) return;

    const config: Record<1 | 2 | 3, { taxPercent: number; taxIntervalMs: number; rottenCookieChance: number }> = {
      1: { taxPercent: 0.05, taxIntervalMs: 5 * 60 * 1000, rottenCookieChance: 0.05 },
      2: { taxPercent: 0.12, taxIntervalMs: 12 * 60 * 1000, rottenCookieChance: 0.12 },
      3: { taxPercent: 0.25, taxIntervalMs: 25 * 60 * 1000, rottenCookieChance: 0.50 },
    };

    const rankConfig = config[equippedRank];
    const interval = setInterval(() => {
      setGameState(prev => {
        const taxAmount = Math.floor(prev.yatesDollars * rankConfig.taxPercent);
        let newState = {
          ...prev,
          yatesDollars: prev.yatesDollars - taxAmount,
          buildings: {
            ...prev.buildings,
            temple: {
              ...prev.buildings.temple,
              lastTaxTime: Date.now(),
            },
          },
        };

        // Rotten cookie chance - apply a random debuff
        if (Math.random() < rankConfig.rottenCookieChance) {
          const debuffRoll = Math.random();
          
          if (debuffRoll < 0.001) {
            // 0.1% - Cookie Curse (permanent until prestige)
            newState = {
              ...newState,
              buildings: {
                ...newState.buildings,
                temple: {
                  ...newState.buildings.temple,
                  hasCookieCurse: true,
                },
              },
            };
          } else if (debuffRoll < 0.002) {
            // 0.09% - Holy Unluckiness Curse (permanent until prestige)
            newState = {
              ...newState,
              buildings: {
                ...newState.buildings,
                temple: {
                  ...newState.buildings.temple,
                  hasHolyUnluckinessCurse: true,
                },
              },
            };
          } else if (debuffRoll < 0.2) {
            // Lose 15% money
            newState.yatesDollars = Math.floor(newState.yatesDollars * 0.85);
          } else if (debuffRoll < 0.4) {
            // Lose half miners
            newState = { ...newState, minerCount: Math.floor(newState.minerCount / 2) };
          } else if (debuffRoll < 0.6) {
            // Rock heals to 100%
            const currentRock = getRockById(newState.currentRockId);
            if (currentRock) {
              newState.currentRockHP = getScaledRockHP(currentRock.clicksToBreak, newState.prestigeCount, newState.isHardMode, newState.sideLevel || 0);
            }
          } else if (debuffRoll < 0.8) {
            // 2x rock health (for current rock only)
            newState.currentRockHP = Math.floor(newState.currentRockHP * 2);
          }
          // Other debuffs: lose buildings, 60% slower pickaxe handled elsewhere
        }

        return newState;
      });
    }, rankConfig.taxIntervalMs);

    return () => clearInterval(interval);
  }, [gameState.buildings.temple.equippedRank]);

  // Mine passive income when can't buy miners (temple rank 2/3)
  useEffect(() => {
    const equippedRank = gameState.buildings.temple.equippedRank;
    const mineCount = gameState.buildings.mine.count;
    
    // Only active when rank 2/3 equipped AND have mines
    if ((equippedRank !== 2 && equippedRank !== 3) || mineCount === 0) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        const currentPickaxe = PICKAXES.find(p => p.id === prev.currentPickaxeId) || PICKAXES[0];
        const currentRock = getRockById(prev.currentRockId);
        if (!currentRock) return prev;

        // 20% of click money per mine, every 0.5s
        const motivationMult = getMotivationMultiplier();
        const clickMoney = safeMoney(currentRock.moneyPerBreak * prev.prestigeMultiplier);
        const passiveIncome = safeMoney(clickMoney * 0.20 * mineCount * motivationMult);

        return {
          ...prev,
          yatesDollars: safeAdd(prev.yatesDollars, passiveIncome),
          totalMoneyEarned: safeAdd(prev.totalMoneyEarned || 0, passiveIncome),
        };
      });
    }, 500); // Every 0.5 seconds

    return () => clearInterval(interval);
  }, [gameState.buildings.temple.equippedRank, gameState.buildings.mine.count]);


  // Wealth tax for 1QI+ players (10-30% daily)
  const WEALTH_TAX_THRESHOLD = 1000000000000000000; // 1 Quintillion
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const wealthTaxAppliedRef = useRef(false);
  
  useEffect(() => {
    // Guard against re-triggering during the same session
    if (wealthTaxAppliedRef.current) return;
    
    // Only check if player has 1QI+ money
    if (gameState.yatesDollars < WEALTH_TAX_THRESHOLD) return;
    
    // Check if a day has passed since last tax
    const now = Date.now();
    const lastTax = gameState.lastTaxTime || 0;
    const timeSinceLastTax = now - lastTax;
    
    if (timeSinceLastTax < ONE_DAY_MS) return;
    
    // Mark as applying tax to prevent re-triggering
    wealthTaxAppliedRef.current = true;
    
    // Apply tax: random 10-30%
    const taxRate = 0.10 + (Math.random() * 0.20); // 10% to 30%
    const taxAmount = Math.floor(gameState.yatesDollars * taxRate);
    const remainingAmount = gameState.yatesDollars - taxAmount;
    
    // Update state
    setGameState(prev => ({
      ...prev,
      yatesDollars: remainingAmount,
      lastTaxTime: now,
    }));
    
    // Dispatch event for popup (only using event, not localStorage)
    const taxData = {
      originalAmount: gameState.yatesDollars,
      taxRate,
      taxAmount,
      remainingAmount,
    };
    window.dispatchEvent(new CustomEvent('yates-tax-collected', { detail: taxData }));

    // Route wealth tax into the company tax pool (Vote for Change)
    supabase
      .rpc('add_to_tax_pool', {
        p_amount: Math.min(taxAmount, 1e38),
        p_source: 'wealth_tax',
        p_description: `Wealth tax ${Math.round(taxRate * 100)}%`,
      })
      .then(({ error }) => {
        if (error) console.error('[TaxVote] failed to route wealth tax into pool:', error);
      });

    console.log(`💀 WEALTH TAX: Collected ${Math.round(taxRate * 100)}% ($${taxAmount.toLocaleString()}) from player with $${gameState.yatesDollars.toLocaleString()}`);
    
    // Reset the guard after a delay to allow future tax (next day)
    setTimeout(() => {
      wealthTaxAppliedRef.current = false;
    }, 5000);
  }, [gameState.yatesDollars, gameState.lastTaxTime]);

  // Always render - game will work with default state while data loads

  return (
    <GameContext.Provider
      value={{
        gameState,
        currentPickaxe,
        currentRock,
        mineRock,
        buyPickaxe,
        buyAllAffordablePickaxes,
        canAffordPickaxe,
        ownsPickaxe,
        equipPickaxe,
        selectRock,
        getUnlockedRocks,
        resetGame,
        markCutsceneSeen,
        useCoupon,
        spendMoney,
        addPremiumProduct,
        ownsPremiumProduct,
        shopStock,
        buyShopProduct,
        getTimeUntilRestock,
        buyAutoclicker,
        toggleAutoclicker,
        canPrestige,
        prestige,
        dismissWarning,
        clearClickHistory,
        submitAppeal,
        isBanned,
        banReason,
        // Trinket functions
        trinketShopItems,
        getTrinketShopTimeLeft,
        resetTrinketShop,
        buyTrinket,
        equipTrinket,
        unequipTrinket,
        ownsTrinket,
        getEquippedTrinkets,
        getTotalBonuses,
        // Relic & Talisman functions
        convertToRelic,
        convertToTalisman,
        ownsRelic,
        ownsTalisman,
        getRelicConversionCost,
        getTalismanConversionCost,
        // Miner functions
        buyMiner,
        buyMiners,
        getMinerCost: getMinerCostFn,
        // Prestige upgrade functions
        buyPrestigeUpgrade,
        ownsPrestigeUpgrade,
        canEquipDualTrinkets,
        canEquipTripleTrinkets,
        // Auto-prestige
        toggleAutoPrestige,
        // Admin functions (terminal)
        addMoney,
        addMiners,
        addPrestigeTokens,
        addPrestigeCount,
        skipRocks,
        giveTrinket,
        givePickaxe,
        setTotalClicks,
        unlockAllAchievements,
        maxAll,
        giveAllTrinkets,
        // Title functions
        giveTitle,
        equipTitle,
        unequipTitle,
        ownsTitle,
        getTitleBonuses,
        // Pickaxe ability functions
        activateAbility,
        getAbilityCooldownRemaining,
        isAbilityActive,
        getActiveAbilityTimeRemaining,
        // Path system functions
        selectPath,
        canLevelUpSide,
        levelUpSide,
        getSideLevelProgress,
        canBuyPickaxeForPath,
        canMineRockForPath,
        sacrificeMiners,
        getSacrificeBuffForCount,
        addShadySamSwap,
        removeShadySamSwap,
        activateGoldenCookieRitual,
        canActivateRitual,
        claimGoldenCookieReward,
        // Building system functions
        buyBuilding,
        canAffordBuilding,
        getBuildingCostForType,
        absorbMinersIntoMine,
        getMineEfficiency,
        depositToBank,
        withdrawFromBank,
        getBankBalance,
        unlockBankTier,
        takeLoan,
        repayLoan,
        getLoanStatus,
        getFactoryBonusMiners,
        buyTempleUpgrade,
        equipTempleRank,
        getTempleUpgradeBonus,
        prayAtTemple,
        consumePendingGoldenCookie,
        startWizardRitual,
        isWizardRitualActive,
        collectShipmentDelivery,
        getPendingShipments,
        getActiveBuffs,
        getActiveDebuffs,
        getTotalBuffMultiplier,
        buyProgressiveUpgrade,
        getProgressiveUpgradeLevel,
        getProgressiveUpgradeTotalBonus,
        buyPowerup,
        usePowerup,
        getPowerupCount,
        // Wandering Trader functions
        spawnWanderingTrader,
        dismissWanderingTrader,
        clearWanderingTraderTimer,
        isWanderingTraderVisible,
        applyWTDialogEffect,
        getWanderingTraderOffers,
        purchaseWanderingTraderOffer,
        getWanderingTraderTimeLeft,
        addStokens,
        spendStokens,
        getStokens,
        addLotteryTickets,
        spendLotteryTickets,
        getLotteryTickets,
        spinRouletteWheel,
        saveNow,
        wanderingTraderPermBuffs,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
