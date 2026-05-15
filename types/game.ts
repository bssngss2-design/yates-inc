// Mining Game Types

// Active ability definition for pickaxes with usable abilities
export interface PickaxeActiveAbility {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  duration: number; // ms, 0 for instant effects
  cooldown: number; // ms
  cost: number; // Yates dollars cost to use
  effect: {
    type: 'miner_speed' | 'damage_boost' | 'instant_break' | 'all_boost';
    value: number; // multiplier (e.g., 0.5 = +50%, 2 = 200%)
  };
}

export interface Pickaxe {
  id: number;
  name: string;
  image: string;
  price: number;
  clickPower: number;
  specialAbility?: string;
  moneyMultiplier?: number;
  couponLuckBonus?: number;
  activeAbility?: PickaxeActiveAbility; // New: active ability with button
}

export interface Rock {
  id: number;
  name: string;
  image: string;
  clicksToBreak: number;
  moneyPerBreak: number;
  moneyPerClick: number;
  unlockAtClicks: number;
}

export interface ShopStockItem {
  productId: number;
  quantity: number;
}

export interface ShopStock {
  items: ShopStockItem[];
  lastRestockTime: number; // timestamp
}

// =====================
// LIGHT VS DARKNESS PATH SYSTEM
// =====================

export type GamePath = 'light' | 'darkness' | null;

// =====================
// SIDE LEVELS SYSTEM (Light/Dark 1-100)
// =====================

export interface SideLevelRequirements {
  totalMinersSacrificed: number;
  miningLevelReached: number;
  totalMoneyEarned: number;
  // Light-only
  prestigeCount?: number;
  goldenCookiesCollected?: number;
  zeroMinersRequired?: boolean;
}

export const DARK_SIDE_MAX_REQUIREMENTS = {
  totalMinersSacrificed: 40000,
  miningLevelReached: 2000,
  totalMoneyEarned: 67e15, // 67QI
};

export const LIGHT_SIDE_MAX_REQUIREMENTS = {
  prestigeCount: 3,
  goldenCookiesCollected: 20,
  totalMoneyEarned: 100e15, // 100QI
};

export function getDarkSideLevelRequirements(level: number): SideLevelRequirements {
  return {
    totalMinersSacrificed: Math.ceil((DARK_SIDE_MAX_REQUIREMENTS.totalMinersSacrificed / 100) * level),
    miningLevelReached: Math.ceil((DARK_SIDE_MAX_REQUIREMENTS.miningLevelReached / 100) * level),
    totalMoneyEarned: (DARK_SIDE_MAX_REQUIREMENTS.totalMoneyEarned / 100) * level,
  };
}

export function getLightSideLevelRequirements(level: number): SideLevelRequirements & { prestigeCount: number; goldenCookiesCollected: number; zeroMinersRequired: boolean } {
  const prestigeReq = level <= 10 ? Math.min(level, 3) : 3;
  return {
    totalMinersSacrificed: 0,
    miningLevelReached: 0,
    totalMoneyEarned: (LIGHT_SIDE_MAX_REQUIREMENTS.totalMoneyEarned / 100) * level,
    prestigeCount: prestigeReq,
    goldenCookiesCollected: Math.ceil((LIGHT_SIDE_MAX_REQUIREMENTS.goldenCookiesCollected / 100) * level),
    zeroMinersRequired: true,
  };
}

export const SIDE_LEVEL_MAX = 100;

const SIDE_LEVEL_BUFF_STATS = ['moneyBonus', 'rockDamageBonus', 'clickSpeedBonus', 'couponBonus', 'minerSpeedBonus', 'minerDamageBonus'] as const;

export function rollSideLevelBuff(): { stat: string; amount: number } {
  const stat = SIDE_LEVEL_BUFF_STATS[Math.floor(Math.random() * SIDE_LEVEL_BUFF_STATS.length)];
  return { stat, amount: 0.10 }; // +10%
}

export function getSideLevelBankInterestRate(sideLevel: number): number {
  return sideLevel >= 25 ? 0.01 : BANK_BASE_INTEREST_RATE;
}

export function getSideLevelPickaxePriceMultiplier(sideLevel: number): number {
  return sideLevel >= 30 ? 3.0 : 1.0; // 200% inflated = 3x price
}

export function getSideLevelRockHPMultiplier(sideLevel: number): number {
  return sideLevel >= 45 ? 1.5 : 1.0; // 50% more health
}

export interface SacrificeBuff {
  moneyBonus: number;
  pcxDamageBonus: number;
  minerDamageBonus: number;
  allBonus: number;
  endsAt: number; // timestamp when buff expires
}

// Miner sacrifice buff tiers (Darkness path only)
export const SACRIFICE_BUFF_TIERS: { miners: number; buff: Omit<SacrificeBuff, 'endsAt'>; duration: number }[] = [
  { miners: 1, buff: { moneyBonus: 0.01, pcxDamageBonus: 0, minerDamageBonus: 0, allBonus: 0 }, duration: 2000 },
  { miners: 10, buff: { moneyBonus: 0.10, pcxDamageBonus: 0, minerDamageBonus: 0, allBonus: 0 }, duration: 10000 },
  { miners: 50, buff: { moneyBonus: 0.25, pcxDamageBonus: 0, minerDamageBonus: 0, allBonus: 0 }, duration: 25000 },
  { miners: 75, buff: { moneyBonus: 0.45, pcxDamageBonus: 0, minerDamageBonus: 0, allBonus: 0 }, duration: 40000 },
  { miners: 100, buff: { moneyBonus: 0.50, pcxDamageBonus: 0, minerDamageBonus: 0, allBonus: 0 }, duration: 50000 },
  { miners: 125, buff: { moneyBonus: 0.45, pcxDamageBonus: 0.15, minerDamageBonus: 0, allBonus: 0 }, duration: 40000 },
  { miners: 150, buff: { moneyBonus: 0.54, pcxDamageBonus: 0.30, minerDamageBonus: 0, allBonus: 0 }, duration: 60000 },
  { miners: 200, buff: { moneyBonus: 0.45, pcxDamageBonus: 0.45, minerDamageBonus: 0.10, allBonus: 0 }, duration: 70000 },
  { miners: 250, buff: { moneyBonus: 0.45, pcxDamageBonus: 0.45, minerDamageBonus: 0.45, allBonus: 0 }, duration: 80000 },
  { miners: 300, buff: { moneyBonus: 0, pcxDamageBonus: 0, minerDamageBonus: 0, allBonus: 0.50 }, duration: 30000 },
];

// Golden Cookie reward probabilities (must sum to 1.0)
export const GOLDEN_COOKIE_REWARDS = {
  yatesPickaxe: 0.10,      // 10% - Yates Pickaxe
  yatesTotem: 0.01,        // 1%  - Yates Totem trinket
  goldenTrophy: 0.005,     // 0.5% - Golden Trophy (Arghtfavts Trophye)
  silverTrophy: 0.005,     // 0.5% - Silver Trophy (Nrahgrvaths Trphye)
  moneySmall: 0.37,        // 37% - +0.5% of current money
  moneyMedium: 0.51,       // 51% - +1% of current money
  owoTitle: 0.01,          // 1%  - Secret "OwO" title (+500% everything!)
};

// Golden Cookie spawn timing (ms)
export const GOLDEN_COOKIE_MIN_SPAWN = 90000; // 1.5 minutes
export const GOLDEN_COOKIE_MAX_SPAWN = 90000; // 1.5 minutes (fixed interval)

// Miner sacrifice ritual requirements
export const RITUAL_MONEY_REQUIREMENT = 1000000000000; // 1T$
export const RITUAL_MINER_SACRIFICE = 420; // Must sacrifice 420 miners

// Path-restricted pickaxes (can only buy/use if on that path)
export const DARKNESS_PICKAXE_IDS = [18, 21, 25]; // Demon, Nightmare, Galaxy
export const LIGHT_PICKAXE_IDS = [22, 23]; // Sun, Light Saber
export const YATES_PICKAXE_ID = 26; // Only from Golden Cookie

// Path-restricted rocks (can only mine if on that path)
export const DARKNESS_ROCK_IDS = [21, 24]; // Devil, Moon
export const LIGHT_ROCK_IDS = [20]; // Angel rock

// =====================
// SHADY SAM SYSTEM (Darkness path only)
// =====================

export type ShadySamStat = 'couponLuck' | 'minerSpeed' | 'clickDamage' | 'pcxDamage' | 'moneyMultiplier' | 'minerDamage';

export const SHADY_SAM_STAT_LABELS: Record<ShadySamStat, string> = {
  couponLuck: 'Coupon Luck',
  minerSpeed: 'Miner Speed',
  clickDamage: 'Click Speed',
  pcxDamage: 'Pickaxe Damage',
  moneyMultiplier: 'Money',
  minerDamage: 'Miner Damage',
};

export const SHADY_SAM_STAT_ICONS: Record<ShadySamStat, string> = {
  couponLuck: '🎟️',
  minerSpeed: '⚡',
  clickDamage: '🖱️',
  pcxDamage: '⛏️',
  moneyMultiplier: '💰',
  minerDamage: '💪',
};

export interface ShadySamSwap {
  id: string;
  debuffStat: ShadySamStat;
  buffStat: ShadySamStat;
  amount: number; // e.g. 1.0 = 100%
}

export const SHADY_SAM_SWAP_COST = 1e15; // legacy flat cost, kept for reference
export function getShadySamSwapCost(percentAmount: number): number {
  if (percentAmount <= 0) return 0;
  return Math.floor(1000 * Math.pow(percentAmount, 2.6));
}

// Exotic rock delivered by Shipment — temporarily replaces the current rock
export interface ExoticRock {
  id: string;
  name: string;
  baseHP: number;
  moneyPerClick: number;
  breakReward: number;
  images: { full: string; hp70: string; hp30: string };
}

export const EXOTIC_ROCKS: ExoticRock[] = [
  {
    id: 'clown_rock',
    name: 'Clown Rock',
    baseHP: 100_000_000,
    moneyPerClick: 120_000_000,
    breakReward: 1_000_000_000,
    images: { full: '/game/rocks/exotic/clown_100.png', hp70: '/game/rocks/exotic/clown_70.png', hp30: '/game/rocks/exotic/clown_30.png' },
  },
  {
    id: 'schavitsky_rock',
    name: "Schavitsky's Rock",
    baseHP: 500_000_000,
    moneyPerClick: 350_000_000,
    breakReward: 5_000_000_000,
    images: { full: '/game/rocks/exotic/schavitsky_100.png', hp70: '/game/rocks/exotic/schavitsky_70.png', hp30: '/game/rocks/exotic/schavitsky_30.png' },
  },
];

export interface ExoticRockState {
  active: boolean;
  rockId: string | null;
  currentHP: number;
  maxHP: number;
}

export interface GameState {
  yatesDollars: number;
  totalClicks: number;
  currentPickaxeId: number;
  currentRockId: number;
  currentRockHP: number;
  rocksMinedCount: number;
  ownedPickaxeIds: number[];
  exoticRock: ExoticRockState;
  coupons: {
    discount30: number;
    discount50: number;
    discount100: number;
  };
  hasSeenCutscene: boolean;
  hasAutoclicker: boolean;
  autoclickerEnabled: boolean;
  prestigeCount: number;
  prestigeMultiplier: number;
  shopStock?: ShopStock; // Optional for backwards compatibility
  // Anti-cheat system
  antiCheatWarnings: number;       // 0-3
  isOnWatchlist: boolean;          // stricter detection after appeal approved
  isBlocked: boolean;              // currently blocked from earning
  appealPending: boolean;          // waiting for admin decision
  // Trinkets
  ownedTrinketIds: string[];
  equippedTrinketIds: string[];    // Can equip 1 (or 2 with prestige upgrade)
  trinketShopItems: string[];      // IDs of trinkets currently in shop
  trinketShopLastRefresh: number;  // timestamp
  hasTotemProtection: boolean;     // Totem active for next prestige
  hasStocksUnlocked: boolean;      // Stock market unlocked (persists across prestige)
  // Relics & Talismans (converted trinkets with boosted stats)
  ownedRelicIds: string[];         // e.g., ['avatar_ring_relic'] - Light path only
  ownedTalismanIds: string[];      // e.g., ['avatar_ring_talisman'] - Dark path only
  // Miners
  minerCount: number;
  minerLastTick: number;           // timestamp of last miner tick
  // Prestige upgrades
  prestigeTokens: number;
  ownedPrestigeUpgradeIds: string[];
  // Auto-prestige (CM command)
  autoPrestigeEnabled: boolean;
  // Pickaxe active abilities
  activeAbility: {
    pickaxeId: number;
    abilityId: string;
    startTime: number;
    duration: number;
  } | null;
  abilityCooldowns: Record<string, number>; // ability id -> cooldown end timestamp
  // Achievements (permanently unlocked, persists across prestiges)
  unlockedAchievementIds: string[];
  // Ranking system tracking
  totalMoneyEarned: number;           // All-time money earned (never resets except for ranking period)
  gameStartTime: number;              // Timestamp when game started (for speed ranking)
  fastestPrestigeTime: number | null; // Fastest time to first prestige in ms
  // Pro Player Titles
  ownedTitleIds: string[];            // Titles earned from rankings
  equippedTitleIds: string[];         // Currently equipped titles (max 1, or 2 with Title Master)
  titleWinCounts: Record<string, number>; // How many times each title was won (for Da Goat)
  // =====================
  // LIGHT VS DARKNESS PATH SYSTEM
  // =====================
  chosenPath: GamePath;              // Player's chosen path after first prestige
  sideLevel: number;                 // Current side level (1-100)
  sideLevelBuffs: Record<string, number>; // Permanent buffs from side level-ups (stat key -> bonus amount)
  totalGoldenCookiesCollected: number; // All-time golden cookies collected
  totalMinersSacrificed: number;     // All-time miners sacrificed
  goldenCookieRitualActive: boolean; // Has completed the ritual to spawn golden cookies
  sacrificeBuff: SacrificeBuff | null; // Current active sacrifice buff
  adminCommandsUntil: number | null; // Timestamp when admin commands expire (from golden cookie)
  lastTaxTime: number | null;        // Timestamp of last wealth tax (1QI+ = 10-30% daily)
  // =====================
  // BANK LOAN SYSTEM
  // =====================
  loanAmount: number;                // Current outstanding loan principal + accrued interest
  loanTakenAt: number | null;        // Timestamp when loan was taken
  loanLastAccrualAt: number | null;  // Timestamp of last interest accrual (for open-tab bonus)
  // Timestamp for sync conflict resolution
  localUpdatedAt: number;
  // Playtime tracking for "Blessed by the Heavens" title
  totalPlaytimeSeconds: number;
  // =====================
  // BUILDING SYSTEM STATE
  // =====================
  buildings: BuildingStates;
  activeBuffs: ActiveBuff[];
  activeDebuffs: ActiveDebuff[];
  progressiveUpgrades: ProgressiveUpgradeState;
  powerupInventory: PowerupInventory;
  activePowerups: ActivePowerup[];
  // Guaranteed coupon flag (from Lucky Strike powerup)
  guaranteedCouponDrop: boolean;
  // =====================
  // WANDERING TRADER SYSTEM (Darkness path only)
  // =====================
  stokens: number;                           // Special currency from Wandering Trader
  wanderingTraderVisible: boolean;           // Is trader currently on screen
  wanderingTraderLastSpawn: number;          // Timestamp of last spawn
  wanderingTraderNextSpawn: number;          // Timestamp of next auto spawn
  wanderingTraderShopItems: WanderingTraderOffer[]; // Current shop offers (3 items)
  wanderingTraderDespawnTime: number | null; // When trader will disappear
  // Wandering Trader Deal System
  wtDealLevel: 0 | 1 | 2 | 3;               // 0=none, 1=5% tax +3 offers, 2=15% all boosts, 3=25% all offers
  wtBanned: boolean;                         // Rejected final offer - never appears again
  wtSuspicious: boolean;                     // Chose "sketchy" - 50% rare chances, 2x spawn time
  wtRedeemed: boolean;                       // Completed redemption path after ban
  wtDialogCompleted: boolean;                // Browse More button disappears after deal/redemption
  wtMoneyTax: number;                        // Percentage of money earned that goes to WT (0, 0.05, 0.15, 0.25)
  // Wandering Trader permanent buffs (persisted)
  wanderingTraderPermBuffs: {
    moneyBonus: number;
    couponLuckBonus: number;
    minerSpeedBonus: number;
    minerDamageBonus: number;
  };
  // =====================
  // SHADY SAM (Darkness path only — stat swaps)
  // =====================
  shadySamSwaps: ShadySamSwap[];
  // Powerup cooldowns (timestamp when cooldown expires)
  powerupCooldowns: Record<string, number>;
  // =====================
  // PREMIUM PRODUCTS (from /products/premium shop)
  // =====================
  ownedPremiumProductIds: number[];          // IDs of purchased premium products
  // =====================
  // HARD MODE (separate game mode with harder gameplay)
  // =====================
  isHardMode: boolean;                       // Is this a Hard Mode save
  hardModePrestigeCount: number;             // Prestige count specific to Hard Mode (for trinket wipes)
  lotteryTickets: number;                    // Hard Mode currency (replaces powerups)
  hardModeAchievements: string[];            // Hard Mode specific achievements
  // =====================
  // ASCENSION TREE (prestige 10+ heavenly upgrade system)
  // =====================
  gems: number;                              // Gems from Gem Farms (25 gems = 1 HC on prestige)
  heavenlyChips: number;                     // Permanent currency for ascension upgrades
  totalHCEarned: number;                     // Lifetime HC earned (for display)
  ownedAscensionNodeIds: string[];           // Purchased ascension tree nodes
  isAscensionTreeOpen: boolean;              // Freeze all income while tree is open
}

// Premium product buff definitions
export const PREMIUM_PRODUCT_BUFFS: Record<number, {
  name: string;
  moneyMultiplier?: number;      // Multiplies money bonus (e.g., 2 = 2x)
  clickSpeedBonus?: number;      // Additive % (e.g., 2 = +200%)
  minerSpeedBonus?: number;      // Additive % (e.g., 2 = +200%)
  buildingSpeedBonus?: number;   // Additive % (affects temple, bank interest, wizard tower)
  yatesPcxDamageMultiplier?: number;  // Multiplies Yates pickaxe damage
  yatesPcxMoneyMultiplier?: number;   // Multiplies Yates pickaxe money
}> = {
  6: { // Gold Bar
    name: '16oz Gold Bar',
    moneyMultiplier: 1.2, // +120% money (1.2x base)
  },
  1: { // Patek Philippe Nautilus
    name: 'Patek Philippe Nautilus',
    moneyMultiplier: 2.0, // 2x money
  },
  2: { // Richard Mille
    name: 'Richard Mille',
    moneyMultiplier: 2.2, // 2.2x money
  },
  4: { // McLaren F1
    name: 'McLaren F1',
    clickSpeedBonus: 2.0,    // +200%
    minerSpeedBonus: 2.0,    // +200%
    buildingSpeedBonus: 2.0, // +200%
  },
  3: { // Luxury Yacht
    name: 'Luxury Yacht',
    yatesPcxDamageMultiplier: 2.0, // 2x Yates damage
    yatesPcxMoneyMultiplier: 2.0,  // 2x Yates money
  },
  5: { // Bugatti La Voiture Noire
    name: 'Bugatti La Voiture Noire',
    clickSpeedBonus: 6.0,    // +600% (3x McLaren)
    minerSpeedBonus: 6.0,    // +600%
    buildingSpeedBonus: 6.0, // +600%
  },
};

// Prestige requirements (Rock 19 = Titanium Quartz, Pickaxe 16 = Pin)
export const PRESTIGE_REQUIREMENTS = {
  minRockId: 19,
  minPickaxeId: 16,
  maxRockId: 29,      // Lotus Crystal
  maxPickaxeId: 25,   // Galaxy
  baseMoneyRequired: 1000000000, // $1B base money requirement
};

// Max prestige level where buffs stop
export const MAX_PRESTIGE_WITH_BUFFS = 230;

// Hard mode threshold - after this prestige, everything is 40% harder (legacy scaling)
export const HARD_MODE_PRESTIGE_THRESHOLD = 40;
export const HARD_MODE_MULTIPLIER = 1.4; // 40% harder

// =====================
// HARD MODE GAME MODE (separate save, harder gameplay)
// =====================
export const HARD_MODE_MODIFIERS = {
  priceMultiplier: 1.41,        // 41% more expensive (pickaxes, trinkets, buildings, etc.)
  rockHpMultiplier: 1.30,       // 30% more rock HP
  rockHpScalingMultiplier: 1.48, // 48% higher HP scaling for next rock
  pickaxeDamageMultiplier: 0.85, // 15% less pickaxe damage
  mythicRarityMultiplier: 0.70,  // 30% rarer mythic/secret trinkets
  prestigeRemovesBuildings: true,
  trinketWipeInterval: 5,        // Every 5 prestiges, lose all trinkets except 3
  trinketKeepCount: 3,           // How many trinkets to keep on wipe
};

// Lottery ticket conversion rate from existing coupons
export const LOTTERY_TICKET_CONVERSION_RATE = 0.30; // 30% of coupons become lottery tickets

// Hard Mode achievement definitions
export const HARD_MODE_ACHIEVEMENTS = {
  // Money milestones
  hardMillionaire: { id: 'hard_millionaire', name: 'Hard Millionaire', description: 'Earn $1M in Hard Mode', icon: '💰', requirement: 1_000_000 },
  hardBillionaire: { id: 'hard_billionaire', name: 'Kinda Rich', description: 'Earn $1B in Hard Mode', icon: '💵', requirement: 1_000_000_000 },
  hardTrillionaire: { id: 'hard_trillionaire', name: 'That\'s a lot of hard work', description: 'Earn $1T in Hard Mode', icon: '💎', requirement: 1_000_000_000_000 },
  hardQuadrillionaire: { id: 'hard_quadrillionaire', name: 'How many hours??', description: 'Earn $1Q in Hard Mode', icon: '👑', requirement: 1_000_000_000_000_000 },
  hardQuintillionaire: { id: 'hard_quintillionaire', name: 'Has to be Suhas', description: 'Earn $1Qi in Hard Mode', icon: '🏆', requirement: 1_000_000_000_000_000_000 },
  // Trinket rarity milestones
  hardCommonTrinket: { id: 'hard_common_trinket', name: 'Only one?', description: 'Own a common trinket in Hard Mode', icon: '⚪', rarity: 'common' },
  hardRareTrinket: { id: 'hard_rare_trinket', name: 'Eh there\'s some', description: 'Own a rare trinket in Hard Mode', icon: '🔵', rarity: 'rare' },
  hardEpicTrinket: { id: 'hard_epic_trinket', name: 'Kinda good', description: 'Own an epic trinket in Hard Mode', icon: '🟣', rarity: 'epic' },
  hardLegendaryTrinket: { id: 'hard_legendary_trinket', name: 'Now we are talking', description: 'Own a legendary trinket in Hard Mode', icon: '🟡', rarity: 'legendary' },
  hardMythicTrinket: { id: 'hard_mythic_trinket', name: 'Luck?', description: 'Own a mythic trinket in Hard Mode', icon: '🔴', rarity: 'mythic' },
  hardSecretTrinket: { id: 'hard_secret_trinket', name: 'That\'s some Progamer right there', description: 'Own a secret trinket in Hard Mode', icon: '✨', rarity: 'secret' },
};

// Get prestige money requirement (5% increase per prestige, +40% after prestige 40)
export function getPrestigeMoneyRequirement(prestigeCount: number): number {
  const base = Math.floor(PRESTIGE_REQUIREMENTS.baseMoneyRequired * Math.pow(1.05, prestigeCount));
  return prestigeCount >= HARD_MODE_PRESTIGE_THRESHOLD ? Math.floor(base * HARD_MODE_MULTIPLIER) : base;
}

// Get scaled prestige rock requirement (increases by 1 every 5 prestiges until max)
export function getPrestigeRockRequirement(prestigeCount: number): number {
  const increase = Math.floor(prestigeCount / 5);
  return Math.min(PRESTIGE_REQUIREMENTS.maxRockId, PRESTIGE_REQUIREMENTS.minRockId + increase);
}

// Get scaled prestige pickaxe requirement (increases by 1 every 5 prestiges until max)
// If the required pickaxe is path-locked against the player, returns -1 (skip requirement)
export function getPrestigePickaxeRequirement(prestigeCount: number, chosenPath?: GamePath): number {
  const increase = Math.floor(prestigeCount / 5);
  const required = Math.min(PRESTIGE_REQUIREMENTS.maxPickaxeId, PRESTIGE_REQUIREMENTS.minPickaxeId + increase);

  if (chosenPath === 'light' && DARKNESS_PICKAXE_IDS.includes(required)) return -1;
  if (chosenPath === 'darkness' && LIGHT_PICKAXE_IDS.includes(required)) return -1;

  return required;
}

// Yates special account (hidden admin - keeps money on prestige)
export const YATES_ACCOUNT_ID = '000000';

export const AUTOCLICKER_COST = 100000000; // $100M
export const AUTOCLICKER_CPS = 10; // 10 clicks per second

export interface CouponDrop {
  type: 'discount30' | 'discount50' | 'discount100';
  x: number;
  y: number;
  id: string;
}

export interface MoneyPopup {
  amount: number;
  x: number;
  y: number;
  id: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  id: string;
}

export const COUPON_REQUIREMENTS = {
  minRockId: 7, // Diamond (7th rock - coupons start dropping)
  minPickaxeId: 7, // Silver pickaxe
};

export const COUPON_DROP_RATES = {
  discount30: 0.005, // 0.5%
  discount50: 0.002, // 0.2%
  discount100: 0.0005, // 0.05%
};

export const SHOP_UNLOCK_REQUIREMENTS = {
  productsTab: {
    minRockId: 12, // Ruby (12th rock - products unlock)
    minPickaxeId: 12, // Alexandrite
  },
};

export const SHOP_RESTOCK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
export const SHOP_MIN_ITEMS = 3; // Minimum items in stock
export const SHOP_MAX_ITEMS = 6; // Maximum items in stock
export const SHOP_MIN_QUANTITY = 1; // Min quantity per item
export const SHOP_MAX_QUANTITY = 3; // Max quantity per item

// =====================
// TRINKET SYSTEM
// =====================

export type TrinketRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';

export interface TrinketEffects {
  moneyBonus?: number;        // % extra money
  rockDamageBonus?: number;   // % extra rock damage
  clickSpeedBonus?: number;   // % faster clicks (autoclicker)
  couponBonus?: number;       // % extra coupon drop rate
  minerSpeedBonus?: number;   // % faster miner ticks
  minerDamageBonus?: number;  // % extra miner damage
  minerMoneyBonus?: number;   // % extra money from miners
  couponLuckBonus?: number;   // % extra coupon luck
  allBonus?: number;          // % bonus to everything
  prestigeProtection?: boolean; // Keep money on prestige (consumable)
  trinketBonus?: number;      // % boost to all trinket effects
  bankInterestBonus?: number; // Multiplier for bank interest (e.g., 10 = 10x = 1% instead of 0.1%)
}

export interface Trinket {
  id: string;
  name: string;
  image: string;
  rarity: TrinketRarity;
  cost: number;
  shopChance: number;         // 0-1, chance to appear in shop
  effects: TrinketEffects;
  description: string;
}

export const TRINKET_SHOP_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes
export const TRINKET_SHOP_MIN_ITEMS = 1;
export const TRINKET_SHOP_MAX_ITEMS = 2;

export const TRINKETS: Trinket[] = [
  {
    id: 'avatar_ring',
    name: 'Avatar Ring',
    image: '/game/accessories/avatarring.png',
    rarity: 'common',
    cost: 780000,
    shopChance: 0.80,
    effects: { rockDamageBonus: 0.10 },
    description: '+10% rock damage',
  },
  {
    id: 'rainbow_collar',
    name: 'Rainbow Collar',
    image: '/game/accessories/RainbowColar.png',
    rarity: 'rare',
    cost: 20000000,
    shopChance: 0.80,
    effects: { moneyBonus: 0.15 },
    description: '+15% money',
  },
  {
    id: 'cosmic_crown',
    name: 'Cosmic Crown',
    image: '/game/accessories/CosmicCrown.png',
    rarity: 'epic',
    cost: 3500000,
    shopChance: 0.70,
    effects: { moneyBonus: 0.12, clickSpeedBonus: 0.05, rockDamageBonus: 0.09 },
    description: '+12% money, +5% click speed, +9% rock damage',
  },
  {
    id: 'totem',
    name: 'Totem',
    image: '/misc/totem.png',
    rarity: 'legendary',
    cost: 20000000,
    shopChance: 0.31,
    effects: { prestigeProtection: true },
    description: 'Keep your money on 1 prestige (consumable)',
  },
  {
    id: 'yates_totem',
    name: 'Yates Totem',
    image: '/misc/Yates totem.png',
    rarity: 'secret',
    cost: 67e30, // 67 Nonillion
    shopChance: 0, // Always in shop as permanent 3rd slot, not random
    effects: {
      moneyBonus: 2.5,
      rockDamageBonus: 2.5,
      minerSpeedBonus: 2.5,
      minerDamageBonus: 2.5,
      clickSpeedBonus: 2.5,
      couponLuckBonus: 2.5,
      bankInterestBonus: 2, // +1 point = 2x multiplier
    },
    description: '+250% EVERYTHING + 1pt bank interest - The ultimate trinket',
  },
  {
    id: 'spike',
    name: 'Spike',
    image: '/misc/spike.png',
    rarity: 'epic',
    cost: 900000,
    shopChance: 0.62,
    effects: { couponBonus: 0.80 },
    description: '+80% coupon drop rate',
  },
  {
    id: 'elder_ring',
    name: 'Elder Ring',
    image: '/game/accessories/elderring.png',
    rarity: 'mythic',
    cost: 56000000000,
    shopChance: 0.21,
    effects: { rockDamageBonus: 0.70, moneyBonus: 0.30 },
    description: '+70% pickaxe damage, +30% money',
  },
  {
    id: 'dream_collar',
    name: 'Dream Collar',
    image: '/game/accessories/Dreamcolar.png',
    rarity: 'legendary',
    cost: 35000000,
    shopChance: 0.31,
    effects: { moneyBonus: 0.50 },
    description: '+50% money',
  },
  {
    id: 'earth_ball',
    name: 'Earth Ball',
    image: '/game/accessories/earthball.png',
    rarity: 'epic',
    cost: 10000000,
    shopChance: 0.50,
    effects: { minerDamageBonus: 0.30, minerSpeedBonus: 0.30 },
    description: '+30% miner damage, +30% miner speed',
  },
  {
    id: 'solar_collar',
    name: 'Solar Collar',
    image: '/game/accessories/suncolar.png',
    rarity: 'epic',
    cost: 15000000,
    shopChance: 0.40,
    effects: { allBonus: 0.10 },
    description: '+10% to everything',
  },
  // New trinkets
  {
    id: 'miners_lucky_charm',
    name: "Miner's Lucky Charm",
    image: '/game/accessories/minersluckycharm.png',
    rarity: 'rare',
    cost: 3500000,
    shopChance: 0.65,
    effects: { minerSpeedBonus: 0.35, minerDamageBonus: 0.25 },
    description: '+35% miner speed, +25% miner damage',
  },
  {
    id: 'ancient_compass',
    name: 'Ancient Compass',
    image: '/game/accessories/ancientcompas.png',
    rarity: 'rare',
    cost: 5000000,
    shopChance: 0.55,
    effects: { clickSpeedBonus: 0.35, minerSpeedBonus: 0.25 },
    description: '+35% click speed, +25% miner speed',
  },
  {
    id: 'eternal_hourglass',
    name: 'Eternal Hourglass',
    image: '/game/accessories/hourglass.png',
    rarity: 'rare',
    cost: 8000000,
    shopChance: 0.50,
    effects: { minerSpeedBonus: 0.50, clickSpeedBonus: 0.35 },
    description: '+50% miner speed, +35% click speed',
  },
  {
    id: 'dragon_scale',
    name: 'Dragon Scale',
    image: '/game/accessories/dragonscale.png',
    rarity: 'epic',
    cost: 15000000,
    shopChance: 0.45,
    effects: { rockDamageBonus: 0.60, minerDamageBonus: 0.40 },
    description: '+60% pcx damage, +40% miner damage',
  },
  {
    id: 'obsidian_heart',
    name: 'Obsidian Heart',
    image: '/game/accessories/obsheart.png',
    rarity: 'epic',
    cost: 22000000000,
    shopChance: 0.35,
    effects: { rockDamageBonus: 0.75, moneyBonus: 0.50 },
    description: '+75% pcx damage, +50% money (Darkness)',
  },
  {
    id: 'crystal_prism',
    name: 'Crystal Prism',
    image: '/game/accessories/crystalprism.png',
    rarity: 'epic',
    cost: 22000000000,
    shopChance: 0.35,
    effects: { moneyBonus: 0.55, clickSpeedBonus: 0.45 },
    description: '+55% money, +45% click speed (Light)',
  },
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    image: '/game/accessories/phoenixfeather.png',
    rarity: 'legendary',
    cost: 50000000000,
    shopChance: 0.25,
    effects: { moneyBonus: 0.65, allBonus: 0.35 },
    description: '+65% money, +35% all bonus',
  },
  {
    id: 'void_stone',
    name: 'Void Stone',
    image: '/game/accessories/voidstone.png',
    rarity: 'legendary',
    cost: 65000000000,
    shopChance: 0.20,
    effects: { rockDamageBonus: 0.90, clickSpeedBonus: 0.70 },
    description: '+90% pcx damage, +70% click speed',
  },
  // Golden Cookie exclusive trophies
  {
    id: 'golden_trophy',
    name: 'Arghtfavts Trophye',
    image: '/game/accessories/trophy.png',
    rarity: 'secret',
    cost: 999999999999,
    shopChance: 0, // Golden cookie only
    effects: { 
      moneyBonus: 1.50,
      clickSpeedBonus: 2.30,
      rockDamageBonus: 0.45,
      minerDamageBonus: 0.45,
      minerSpeedBonus: 1.00
    },
    description: '+150% money, +230% click speed, +45% pcx/miner dmg, +100% miner speed',
    // Talisman: 200/200/150/150/200 | Relic: 150/150/100/100/150 (money, click, dmg, minerDmg, minerSpd)
  },
  {
    id: 'silver_trophy',
    name: 'Nrahgrvaths Trphye',
    image: '/game/accessories/silver.png',
    rarity: 'mythic',
    cost: 999999999999,
    shopChance: 0, // Golden cookie only
    effects: { 
      moneyBonus: 0.75,
      clickSpeedBonus: 1.15,
      rockDamageBonus: 0.225,
      minerDamageBonus: 0.225,
      minerSpeedBonus: 0.50
    },
    description: '+75% money, +115% click speed, +22.5% pcx/miner dmg, +50% miner speed',
  },
  // =====================
  // WANDERING TRADER SPECIAL TRINKETS
  // =====================
  {
    id: 'void_merchants_pact',
    name: "Void Merchant's Pact",
    image: '/game/accessories/wtRelic.png',
    rarity: 'secret',
    cost: 140000000000000000, // 140Q - only from Wandering Trader
    shopChance: 0, // Wandering Trader only
    effects: { 
      moneyBonus: 1.0,           // +100% money
      clickSpeedBonus: 1.0,      // +100% click speed
      allBonus: 1.0,             // +100% all (buildings get special treatment in-game)
      bankInterestBonus: 10,     // 10x bank interest (0.1% -> 1%)
    },
    description: '+100% money, click speed, buildings mega buffed! (Bank 1% interest, Factory +30% faster +15 miners, Mine 30 miners & 40% boost)',
  },
  {
    id: 'fortunes_gambit',
    name: "Fortune's Gambit",
    image: '/game/accessories/fbRelic.png',
    rarity: 'secret',
    cost: 999999999999999, // Priceless - only from Roulette
    shopChance: 0, // Roulette only
    effects: { 
      allBonus: 1.0,             // +100% to EVERYTHING
    },
    description: '+100% to ALL stats! A true gambler\'s reward.',
  },
];

export const RARITY_COLORS: Record<TrinketRarity, string> = {
  common: '#9ca3af',    // gray
  rare: '#3b82f6',      // blue
  epic: '#a855f7',      // purple
  legendary: '#f59e0b', // orange/gold
  mythic: '#dc2626',    // red (shiny)
  secret: '#ec4899',    // pink/magenta (shiny secret)
};

// =====================
// RELIC & TALISMAN SYSTEM
// =====================

// Relic multipliers (Light path) - lower but still good
export const RELIC_MULTIPLIERS: Record<TrinketRarity, number> = {
  common: 2,
  rare: 2.5,
  epic: 2.7,
  legendary: 4.1,
  mythic: 5.7,
  secret: 7,
};

// Talisman multipliers (Dark path) - higher risk, higher reward
export const TALISMAN_MULTIPLIERS: Record<TrinketRarity, number> = {
  common: 2,
  rare: 2.5,
  epic: 3.2,
  legendary: 5,
  mythic: 7,
  secret: 12,
};

// Legacy export for backwards compatibility
export const RARITY_CONVERSION_MULTIPLIERS = RELIC_MULTIPLIERS;

// Relic conversion costs (Light path only) - Prestige Tokens OR Money (player chooses)
export interface RelicConversionCost {
  prestigeTokens: number;  // Option 1: pay with tokens
  money: number;           // Option 2: pay with money
}

export const RELIC_CONVERSION_COSTS: Record<string, RelicConversionCost> = {
  avatar_ring: { prestigeTokens: 5, money: 1e12 },           // 1T
  rainbow_collar: { prestigeTokens: 5, money: 5e12 },       // 5T
  miners_lucky_charm: { prestigeTokens: 5, money: 10e12 },  // 10T
  ancient_compass: { prestigeTokens: 5, money: 25e12 },     // 25T
  eternal_hourglass: { prestigeTokens: 7, money: 50e12 },   // 50T
  cosmic_crown: { prestigeTokens: 10, money: 100e12 },      // 100T
  spike: { prestigeTokens: 10, money: 250e12 },             // 250T
  earth_ball: { prestigeTokens: 10, money: 500e12 },        // 500T
  solar_collar: { prestigeTokens: 12, money: 1e15 },        // 1Q
  dragon_scale: { prestigeTokens: 12, money: 3e15 },        // 3Q
  obsidian_heart: { prestigeTokens: 12, money: 5e15 },      // 5Q
  crystal_prism: { prestigeTokens: 12, money: 10e15 },      // 10Q
  totem: { prestigeTokens: 15, money: 25e15 },              // 25Q
  dream_collar: { prestigeTokens: 15, money: 50e15 },       // 50Q
  phoenix_feather: { prestigeTokens: 15, money: 100e15 },   // 100Q
  void_stone: { prestigeTokens: 17, money: 250e15 },        // 250Q
  elder_ring: { prestigeTokens: 20, money: 500e15 },        // 500Q
  silver_trophy: { prestigeTokens: 30, money: 750e15 },     // 750Q (Nrahgrvaths)
  golden_trophy: { prestigeTokens: 40, money: 1e18 },       // 1Qi (Arghtfavts)
  yates_totem: { prestigeTokens: 50, money: 3e18 },         // 3Qi
};

// Talisman conversion costs (Dark path only) - Miners + Money
export interface TalismanConversionCost {
  miners: number;
  money: number;
}

export const TALISMAN_CONVERSION_COSTS: Record<string, TalismanConversionCost> = {
  avatar_ring: { miners: 5, money: 5e12 },           // 5T
  rainbow_collar: { miners: 5, money: 10e12 },       // 10T
  miners_lucky_charm: { miners: 5, money: 25e12 },   // 25T
  ancient_compass: { miners: 5, money: 50e12 },      // 50T
  eternal_hourglass: { miners: 7, money: 100e12 },   // 100T
  cosmic_crown: { miners: 10, money: 250e12 },       // 250T
  spike: { miners: 15, money: 500e12 },              // 500T
  earth_ball: { miners: 20, money: 1e15 },           // 1Q
  solar_collar: { miners: 25, money: 3e15 },         // 3Q
  dragon_scale: { miners: 30, money: 5e15 },         // 5Q
  obsidian_heart: { miners: 45, money: 10e15 },      // 10Q
  crystal_prism: { miners: 50, money: 25e15 },       // 25Q
  totem: { miners: 75, money: 50e15 },               // 50Q
  dream_collar: { miners: 100, money: 100e15 },      // 100Q
  phoenix_feather: { miners: 150, money: 250e15 },   // 250Q
  void_stone: { miners: 200, money: 500e15 },        // 500Q
  elder_ring: { miners: 250, money: 750e15 },        // 750Q
  silver_trophy: { miners: 300, money: 1e18 },       // 1Qi (Nrahgrvaths)
  golden_trophy: { miners: 350, money: 3e18 },       // 3Qi (Arghtfavts)
  yates_totem: { miners: 420, money: 5e18 },         // 5Qi
};

// Yates Totem has hardcoded relic/talisman stats instead of using generic rarity multipliers
export const YATES_TOTEM_RELIC_EFFECTS: TrinketEffects = {
  moneyBonus: 3.2,
  rockDamageBonus: 3.2,
  minerSpeedBonus: 3.2,
  minerDamageBonus: 3.2,
  clickSpeedBonus: 3.2,
  couponLuckBonus: 3.2,
  bankInterestBonus: 2.2,   // +1.2 points = 2.2x
};

export const YATES_TOTEM_TALISMAN_EFFECTS: TrinketEffects = {
  moneyBonus: 4.0,
  rockDamageBonus: 4.0,
  minerSpeedBonus: 4.0,
  minerDamageBonus: 4.0,
  clickSpeedBonus: 4.0,
  couponLuckBonus: 4.0,
  bankInterestBonus: 2.5,   // +1.5 points = 2.5x
};

// Arghtfavts Trophy relic/talisman overrides (money, click, dmg, minerDmg, minerSpd)
export const GOLDEN_TROPHY_TALISMAN_EFFECTS: TrinketEffects = {
  moneyBonus: 2.0,
  clickSpeedBonus: 2.0,
  rockDamageBonus: 1.5,
  minerDamageBonus: 1.5,
  minerSpeedBonus: 2.0,
};
export const GOLDEN_TROPHY_RELIC_EFFECTS: TrinketEffects = {
  moneyBonus: 1.5,
  clickSpeedBonus: 1.5,
  rockDamageBonus: 1.0,
  minerDamageBonus: 1.0,
  minerSpeedBonus: 1.5,
};

// Void Merchant's Pact relic/talisman overrides
export const VOID_MERCHANT_RELIC_EFFECTS: TrinketEffects = {
  moneyBonus: 1.15,
  clickSpeedBonus: 1.15,
  allBonus: 1.15,
  bankInterestBonus: 10,
};
export const VOID_MERCHANT_TALISMAN_EFFECTS: TrinketEffects = {
  moneyBonus: 1.35,
  clickSpeedBonus: 1.35,
  allBonus: 1.35,
  bankInterestBonus: 10,
};

// Fortune's Gambit relic/talisman overrides
export const FORTUNES_GAMBIT_RELIC_EFFECTS: TrinketEffects = {
  allBonus: 0.75,
};
export const FORTUNES_GAMBIT_TALISMAN_EFFECTS: TrinketEffects = {
  allBonus: 0.99,
};

/** Returns hardcoded relic/talisman override effects for special trinkets, or null if none. */
export function getSpecialTrinketOverride(baseId: string, isRelic: boolean, isTalisman: boolean): TrinketEffects | null {
  if (!isRelic && !isTalisman) return null;
  const OVERRIDES: Record<string, { relic: TrinketEffects; talisman: TrinketEffects }> = {
    yates_totem:        { relic: YATES_TOTEM_RELIC_EFFECTS,     talisman: YATES_TOTEM_TALISMAN_EFFECTS },
    golden_trophy:      { relic: GOLDEN_TROPHY_RELIC_EFFECTS,   talisman: GOLDEN_TROPHY_TALISMAN_EFFECTS },
    void_merchants_pact:{ relic: VOID_MERCHANT_RELIC_EFFECTS,   talisman: VOID_MERCHANT_TALISMAN_EFFECTS },
    fortunes_gambit:    { relic: FORTUNES_GAMBIT_RELIC_EFFECTS, talisman: FORTUNES_GAMBIT_TALISMAN_EFFECTS },
  };
  const entry = OVERRIDES[baseId];
  if (!entry) return null;
  return isRelic ? entry.relic : entry.talisman;
}

// =====================
// MINER SYSTEM
// =====================

export const MINER_BASE_COST = 1000; // $1k for first miner
export const MINER_COST_MULTIPLIER = 1.0395; // Scales to ~$10B for miner 420
export const MINER_MAX_COUNT = Infinity;
export const MINER_TICK_INTERVAL = 1000; // 1 second between miner ticks
export const MINER_BASE_DAMAGE = 1190; // ~500k total damage at 420 miners (500k/420 ≈ 1190)
export const MINER_VISIBLE_MAX = 100; // Max visible sprites

// Rock health scaling per prestige (23% increase per prestige)
export const ROCK_HEALTH_PRESTIGE_SCALING = 0.23;

// Get scaled rock HP based on prestige count (+40% after prestige 40, +30% in Hard Mode, +50% at side level 45+)
export function getScaledRockHP(baseHP: number, prestigeCount: number, isHardMode: boolean = false, sideLevel: number = 0): number {
  const scaling = isHardMode ? HARD_MODE_MODIFIERS.rockHpScalingMultiplier - 1 : ROCK_HEALTH_PRESTIGE_SCALING;
  let base = Math.ceil(baseHP * (1 + prestigeCount * scaling));
  
  // Side level 45+: 50% more rock health
  base = Math.ceil(base * getSideLevelRockHPMultiplier(sideLevel));
  
  // Apply Hard Mode 30% HP boost
  if (isHardMode) {
    base = Math.ceil(base * HARD_MODE_MODIFIERS.rockHpMultiplier);
  }
  
  // Legacy +40% after prestige 40 (applies to both modes)
  return prestigeCount >= HARD_MODE_PRESTIGE_THRESHOLD ? Math.ceil(base * HARD_MODE_MULTIPLIER) : base;
}

// Get prestige price multiplier (10% increase every 5 prestiges, +40% after prestige 40, +41% in Hard Mode)
export function getPrestigePriceMultiplier(prestigeCount: number, isHardMode: boolean = false, sideLevel: number = 0): number {
  let base = Math.pow(1.10, Math.floor(prestigeCount / 5));
  
  // Side level 30+: 200% price inflation (3x)
  base *= getSideLevelPickaxePriceMultiplier(sideLevel);

  if (isHardMode) {
    base *= HARD_MODE_MODIFIERS.priceMultiplier;
  }
  
  // Legacy +40% after prestige 40 (applies to both modes)
  return prestigeCount >= HARD_MODE_PRESTIGE_THRESHOLD ? base * HARD_MODE_MULTIPLIER : base;
}

// Get miner cost with prestige scaling (10% increase every 5 prestiges)
export function getMinerCost(currentMinerCount: number, prestigeCount: number = 0, isHardMode: boolean = false, sideLevel: number = 0): number {
  const baseCost = Math.floor(MINER_BASE_COST * Math.pow(MINER_COST_MULTIPLIER, currentMinerCount));
  return Math.floor(baseCost * getPrestigePriceMultiplier(prestigeCount, isHardMode, sideLevel));
}

// =====================
// PRESTIGE UPGRADES
// =====================

export interface PrestigeUpgrade {
  id: string;
  name: string;
  cost: number;          // prestige tokens
  effects: TrinketEffects;
  description: string;
  maxPurchases: number;  // 1 for most, can be higher for stackable
  requires?: string;     // optional: ID of upgrade that must be owned first
}

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  {
    id: 'coupon_boost',
    name: 'Coupon Collector',
    cost: 2,
    effects: { couponBonus: 0.50 },
    description: '+50% coupon drop rate',
    maxPurchases: 1,
  },
  {
    id: 'miner_speed_1',
    name: 'Faster Miners I',
    cost: 3,
    effects: { minerSpeedBonus: 0.30 },
    description: '+30% miner speed',
    maxPurchases: 1,
  },
  {
    id: 'pcx_damage',
    name: 'Pickaxe Mastery',
    cost: 5,
    effects: { rockDamageBonus: 0.40 },
    description: '+40% pickaxe damage',
    maxPurchases: 1,
  },
  {
    id: 'miner_speed_2',
    name: 'Faster Miners II',
    cost: 6,
    effects: { minerSpeedBonus: 0.40 },
    description: '+40% miner speed',
    maxPurchases: 1,
  },
  {
    id: 'money_boost',
    name: 'Money Multiplier',
    cost: 8,
    effects: { moneyBonus: 0.30 },
    description: '+30% extra money',
    maxPurchases: 1,
  },
  {
    id: 'dual_trinkets',
    name: 'Dual Trinkets',
    cost: 10,
    effects: {},
    description: 'Equip 2 trinkets at once',
    maxPurchases: 1,
  },
  {
    id: 'triple_trinkets',
    name: 'Triple Trinkets',
    cost: 43,
    effects: {},
    description: 'Equip 3 trinkets at once (requires Dual Trinkets)',
    maxPurchases: 1,
    requires: 'dual_trinkets',
  },
  // === NEW PRESTIGE UPGRADES ===
  {
    id: 'miner_sprint',
    name: 'Miner Sprint',
    cost: 8,
    effects: { minerSpeedBonus: 0.50 },
    description: '+50% miner speed',
    maxPurchases: 1,
  },
  {
    id: 'money_printer',
    name: 'Money Printer',
    cost: 10,
    effects: { moneyBonus: 0.50 },
    description: '+50% money',
    maxPurchases: 1,
  },
  {
    id: 'rapid_clicker',
    name: 'Rapid Clicker',
    cost: 13,
    effects: { clickSpeedBonus: 0.52 },
    description: '+52% click speed',
    maxPurchases: 1,
  },
  {
    id: 'heavy_hitter',
    name: 'Heavy Hitter',
    cost: 13,
    effects: { rockDamageBonus: 0.54 },
    description: '+54% pickaxe damage',
    maxPurchases: 1,
  },
  {
    id: 'relic_hunter',
    name: 'Relic Hunter',
    cost: 16,
    effects: { couponBonus: 0.30 },
    description: '+30% relic luck',
    maxPurchases: 1,
  },
  {
    id: 'mega_boost',
    name: 'Mega Boost',
    cost: 25,
    effects: { moneyBonus: 1.0, rockDamageBonus: 0.50, trinketBonus: 0.31 },
    description: '+100% money, +50% pcx dmg, +31% trinket effects',
    maxPurchases: 1,
  },
  // === 10 NEW PRESTIGE UPGRADES ===
  {
    id: 'miner_damage_1',
    name: 'Miner Muscles I',
    cost: 7,
    effects: { minerDamageBonus: 0.35 },
    description: '+35% miner damage',
    maxPurchases: 1,
  },
  {
    id: 'miner_damage_2',
    name: 'Miner Muscles II',
    cost: 12,
    effects: { minerDamageBonus: 0.50 },
    description: '+50% miner damage',
    maxPurchases: 1,
  },
  {
    id: 'coupon_master',
    name: 'Coupon Master',
    cost: 15,
    effects: { couponBonus: 0.75, couponLuckBonus: 0.25 },
    description: '+75% coupon drop rate, +25% luck',
    maxPurchases: 1,
  },
  {
    id: 'supreme_clicker',
    name: 'Supreme Clicker',
    cost: 18,
    effects: { clickSpeedBonus: 0.75 },
    description: '+75% click speed',
    maxPurchases: 1,
  },
  {
    id: 'rock_crusher',
    name: 'Rock Crusher',
    cost: 20,
    effects: { rockDamageBonus: 0.80 },
    description: '+80% pickaxe damage',
    maxPurchases: 1,
  },
  {
    id: 'miner_overdrive',
    name: 'Miner Overdrive',
    cost: 22,
    effects: { minerSpeedBonus: 0.80, minerDamageBonus: 0.30 },
    description: '+80% miner speed, +30% miner dmg',
    maxPurchases: 1,
  },
  {
    id: 'gold_rush',
    name: 'Gold Rush',
    cost: 28,
    effects: { moneyBonus: 1.20, minerMoneyBonus: 0.50 },
    description: '+120% money, +50% miner money',
    maxPurchases: 1,
  },
  {
    id: 'ultimate_miner',
    name: 'Ultimate Miner',
    cost: 35,
    effects: { minerDamageBonus: 1.0, minerSpeedBonus: 0.60, minerMoneyBonus: 0.40 },
    description: '+100% miner dmg, +60% speed, +40% money',
    maxPurchases: 1,
  },
  {
    id: 'trinket_amplifier',
    name: 'Trinket Amplifier',
    cost: 40,
    effects: { trinketBonus: 0.75 },
    description: '+75% trinket effects',
    maxPurchases: 1,
  },
  {
    id: 'yates_blessing',
    name: "Yates' Blessing",
    cost: 50,
    effects: { allBonus: 0.50 },
    description: '+50% to ALL stats',
    maxPurchases: 1,
  },
  // Title Master - equip 2 titles at once
  {
    id: 'title_master',
    name: 'Title Master',
    cost: 30,
    effects: {},
    description: 'Equip 2 Pro Player titles at once',
    maxPurchases: 1,
  },
];

export const PRESTIGE_TOKENS_PER_PRESTIGE = 2;

// =====================
// PRO PLAYER TITLES SYSTEM
// =====================

export type TitleNameStyle = 'normal' | 'gold' | 'silver' | 'diamond';

export interface TitleBuffs {
  moneyBonus?: number;           // % extra money
  allBonus?: number;             // % to everything
  speedBonus?: number;           // % faster (clicks, miners, etc.)
  pcxDiscount?: number;          // % discount on pickaxes
  prestigeMoneyRetention?: number; // % of money kept on prestige
  minerSpeedBonus?: number;      // % faster miners
  minerDamageBonus?: number;     // % extra miner damage
  pcxDamageBonus?: number;       // % extra pickaxe damage
}

export interface Title {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconImage?: string;             // Optional image path (overrides emoji icon)
  category: 'money' | 'speed' | 'prestige' | 'secret';
  placement: 1 | 2 | 'secret';   // 1st place, 2nd place, or secret
  buffs: TitleBuffs;
  nameStyle: TitleNameStyle;
}

export const TITLES: Title[] = [
  // Money category
  {
    id: 'money_greedy',
    name: 'Money Greedy',
    description: '1st place in Money ranking',
    icon: '💰',
    category: 'money',
    placement: 1,
    buffs: { moneyBonus: 0.60 },
    nameStyle: 'gold',
  },
  {
    id: 'almost_there',
    name: 'Almost There',
    description: '2nd place in Money ranking',
    icon: '💵',
    category: 'money',
    placement: 2,
    buffs: { moneyBonus: 0.20 },
    nameStyle: 'normal',
  },
  // Speed category
  {
    id: 'speedrunner',
    name: 'Speedrunner',
    description: '1st place in Speed ranking',
    icon: '⚡',
    category: 'speed',
    placement: 1,
    buffs: { speedBonus: 0.30, pcxDiscount: 0.40 },
    nameStyle: 'diamond',
  },
  {
    id: 'just_2_seconds',
    name: 'Just 2 more seconds',
    description: '2nd place in Speed ranking',
    icon: '⏱️',
    category: 'speed',
    placement: 2,
    buffs: { speedBonus: 0.10 },
    nameStyle: 'normal',
  },
  // Prestige category
  {
    id: 'game_grinder',
    name: 'Game Grinder',
    description: '1st place in Prestige ranking',
    icon: '🎮',
    category: 'prestige',
    placement: 1,
    buffs: { allBonus: 0.40, prestigeMoneyRetention: 0.20 },
    nameStyle: 'gold',
  },
  {
    id: 'how_many_hours',
    name: 'How many hours??',
    description: '2nd place in Prestige ranking',
    icon: '⏰',
    category: 'prestige',
    placement: 2,
    buffs: { allBonus: 0.20 },
    nameStyle: 'silver',
  },
  // Secret title - get any title 3+ times
  {
    id: 'da_goat',
    name: 'Da Goat',
    description: 'Win any title 3+ times',
    icon: '🐐',
    category: 'secret',
    placement: 'secret',
    buffs: { allBonus: 0.56 },
    nameStyle: 'diamond',
  },
  // Secret title from Golden Cookie (1% chance)
  {
    id: 'owo_secret',
    name: 'OwO',
    description: 'You are one of the few who have this title!',
    icon: '👀',
    category: 'secret',
    placement: 'secret',
    buffs: { allBonus: 5.0 }, // +500% to everything!
    nameStyle: 'diamond',
  },
  // Light path exclusive title
  {
    id: 'blessed_by_heavens',
    name: 'Blessed by the Heavens',
    description: 'Light path master: own all pickaxes, unlock all rocks, 5+ hours played',
    icon: '☀️',
    category: 'secret',
    placement: 'secret',
    buffs: { moneyBonus: 0.60 }, // +60% money
    nameStyle: 'gold',
  },
  // Wandering Trader exclusive title (Darkness path only)
  {
    id: 'disgusting',
    name: 'Disgusting',
    description: 'Trading with a Wandering Trader??? EWW (this title is kinda gud tho aint gon lie)',
    icon: '🤮',
    category: 'secret',
    placement: 'secret',
    buffs: { 
      minerSpeedBonus: 0.81,    // +81% miner speed
      minerDamageBonus: 0.81,   // +81% miner damage (applies to Mines too)
      pcxDamageBonus: 0.41,     // +41% pickaxe damage
      speedBonus: 0.41,         // +41% click speed
      moneyBonus: 0.65,         // +65% money
    },
    nameStyle: 'diamond',
  },
  // Ascension tree (Heavenly upgrades)
  {
    id: 'bernardo_lvl',
    name: 'Bernardo lvl',
    description: 'Earned when you buy the final heavenly damage chip. That chip already gives +350% damage and ×2 all damage — equipping this title is flex; stats come from the tree.',
    icon: '💪',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'diamond',
  },
  {
    id: 'wizard_king',
    name: 'Wizard King',
    description: 'Earned when you max BOTH Wizard Tower ascension paths (A cheaper + B stronger). Equipping also gives +100% all stats.',
    icon: '🧙',
    category: 'secret',
    placement: 'secret',
    buffs: { allBonus: 1.0 },
    nameStyle: 'gold',
  },
  {
    id: 'asc_money_heheh',
    name: 'Money Heheh',
    description: 'Earned when you buy the last money heavenly chip (includes +60% money and ×8.5 ALL money). No extra bonus when equipped — bragging rights.',
    icon: '💸',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'gold',
  },
  {
    id: 'asc_click_master',
    name: 'Click Master',
    description: 'Earned on the final click-speed heavenly chip (+250% click, ×3.5 all click/cooldown). Equip: cosmetic only; power is already in your ascension bonuses.',
    icon: '🖱️',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'gold',
  },
  {
    id: 'asc_elon_musk',
    name: 'Elon Musk',
    description: 'Earned on the last building heavenly chip (+250% building, ×3.5 buildings, ×2 bank interest). Equip: cosmetic; bonuses already apply passively.',
    icon: '🚀',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'gold',
  },
  {
    id: 'asc_consumer_darkness',
    name: 'Consumer of Darkness',
    description: 'Earned on the final antimatter chip (full meter fill bonuses rolled into that purchase). Equip: cosmetic.',
    icon: '🌑',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'diamond',
  },
  {
    id: 'asc_geometry_correct',
    name: 'Geometryicoallycily Correct',
    description: 'Earned on the final prism / Yates-meter chip. Equip: cosmetic; meter speed is from the tree.',
    icon: '✨',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'diamond',
  },
  {
    id: 'asc_filthly_rich',
    name: 'Filthly Rich',
    description: 'Earned when you buy the last bank-interest chip (full +5% interest before multipliers). Equip: cosmetic.',
    icon: '🏦',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'gold',
  },
  {
    id: 'asc_luck_born',
    name: 'Luck Born',
    description: 'Earned on the final luck chip (+82 luck total on that node, stacked with earlier luck chips). Equip: cosmetic — your real luck is already in Bonuses from ascension.',
    icon: '🍀',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'diamond',
  },
  {
    id: 'asc_gilgamesh_treasury',
    name: 'Gilgamesh Tresury',
    description: 'Earned on the final drop-chance chip (+83 on that tier, stacked with the rest of the path). Equip: cosmetic.',
    icon: '🏺',
    iconImage: '/game/ascension/gilgamesh.png',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'gold',
  },
  {
    id: 'disgusting_human_being',
    name: 'Disgusting Human Being',
    description: 'Earned by maxing both Wandering Trader ascension paths (A and B). Equip: cosmetic.',
    icon: '🕶️',
    category: 'secret',
    placement: 'secret',
    buffs: {},
    nameStyle: 'gold',
  },
];

export const TITLE_NAME_STYLES: Record<TitleNameStyle, string> = {
  normal: 'text-white',
  gold: 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]',
  silver: 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.4)]',
  diamond: 'bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse drop-shadow-[0_0_12px_rgba(96,165,250,0.6)]',
};

// =====================
// ACHIEVEMENTS SYSTEM
// =====================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'pickaxe' | 'rock' | 'money' | 'prestige' | 'miner' | 'trinket';
}

export const ACHIEVEMENTS: Achievement[] = [
  // Pickaxe achievements
  {
    id: 'all_pickaxes',
    name: 'Tool Collector',
    description: 'Own all pickaxes',
    icon: '⛏️',
    category: 'pickaxe',
  },
  // Rock achievements
  {
    id: 'max_rock',
    name: 'Rock Bottom',
    description: 'Unlock the highest tier rock',
    icon: '🪨',
    category: 'rock',
  },
  // Money achievements
  {
    id: 'money_1m',
    name: 'Millionaire',
    description: 'Earn $1,000,000',
    icon: '💵',
    category: 'money',
  },
  {
    id: 'money_100m',
    name: 'Hundred Millionaire',
    description: 'Earn $100,000,000',
    icon: '💰',
    category: 'money',
  },
  {
    id: 'money_1b',
    name: 'Billionaire',
    description: 'Earn $1,000,000,000',
    icon: '💎',
    category: 'money',
  },
  {
    id: 'money_1t',
    name: 'Trillionaire',
    description: 'Earn $1,000,000,000,000',
    icon: '👑',
    category: 'money',
  },
  // Prestige achievements
  {
    id: 'prestige_1',
    name: 'Fresh Start',
    description: 'Prestige for the first time',
    icon: '✨',
    category: 'prestige',
  },
  {
    id: 'prestige_3',
    name: 'Rising Star',
    description: 'Prestige 3 times',
    icon: '⭐',
    category: 'prestige',
  },
  {
    id: 'prestige_5',
    name: 'Veteran Miner',
    description: 'Prestige 5 times',
    icon: '🌟',
    category: 'prestige',
  },
  {
    id: 'prestige_7',
    name: 'Elite Miner',
    description: 'Prestige 7 times',
    icon: '💫',
    category: 'prestige',
  },
  {
    id: 'prestige_10',
    name: 'Prestige Master',
    description: 'Prestige 10 times',
    icon: '👑',
    category: 'prestige',
  },
  {
    id: 'prestige_15',
    name: 'Prestige Expert',
    description: 'Prestige 15 times',
    icon: '🔥',
    category: 'prestige',
  },
  {
    id: 'prestige_20',
    name: 'Prestige Champion',
    description: 'Prestige 20 times',
    icon: '💪',
    category: 'prestige',
  },
  {
    id: 'prestige_27',
    name: 'Prestige Overlord',
    description: 'Prestige 27 times',
    icon: '⚡',
    category: 'prestige',
  },
  {
    id: 'prestige_30',
    name: 'Prestige Legend',
    description: 'Prestige 30 times',
    icon: '🏆',
    category: 'prestige',
  },
  // Miner achievements
  {
    id: 'miner_1',
    name: 'First Hire',
    description: 'Hire your first miner',
    icon: '👷',
    category: 'miner',
  },
  {
    id: 'miner_10',
    name: 'Small Crew',
    description: 'Hire 10 miners',
    icon: '👷‍♂️',
    category: 'miner',
  },
  {
    id: 'miner_100',
    name: 'Mining Company',
    description: 'Hire 100 miners',
    icon: '🏭',
    category: 'miner',
  },
  {
    id: 'miner_420',
    name: 'Full Capacity',
    description: 'Hire all 420 miners',
    icon: '🏆',
    category: 'miner',
  },
  // Trinket achievements
  {
    id: 'trinket_1',
    name: 'Shiny Object',
    description: 'Buy your first trinket',
    icon: '💍',
    category: 'trinket',
  },
  {
    id: 'trinket_5',
    name: 'Collector',
    description: 'Own 5 trinkets',
    icon: '📿',
    category: 'trinket',
  },
  {
    id: 'trinket_yates',
    name: 'Blessed by Yates',
    description: 'Own the Yates Totem',
    icon: '🗿',
    category: 'trinket',
  },
  {
    id: 'trinket_all',
    name: 'Trinket Hoarder',
    description: 'Own all trinkets',
    icon: '✨',
    category: 'trinket',
  },
];

// Achievement checking functions - returns true if permanently unlocked OR currently meets criteria
export function checkAchievementUnlocked(achievement: Achievement, state: GameState): boolean {
  // If already permanently unlocked, return true
  if (state.unlockedAchievementIds?.includes(achievement.id)) {
    return true;
  }
  
  // Otherwise check current state
  switch (achievement.id) {
    case 'all_pickaxes': return state.ownedPickaxeIds.length >= 25; // 25 total pickaxes
    case 'max_rock': return state.currentRockId >= 29; // 29 total rocks
    case 'money_1m': return state.yatesDollars >= 1000000;
    case 'money_100m': return state.yatesDollars >= 100000000;
    case 'money_1b': return state.yatesDollars >= 1000000000;
    case 'money_1t': return state.yatesDollars >= 1000000000000;
    case 'prestige_1': return state.prestigeCount >= 1;
    case 'prestige_3': return state.prestigeCount >= 3;
    case 'prestige_5': return state.prestigeCount >= 5;
    case 'prestige_7': return state.prestigeCount >= 7;
    case 'prestige_10': return state.prestigeCount >= 10;
    case 'prestige_15': return state.prestigeCount >= 15;
    case 'prestige_20': return state.prestigeCount >= 20;
    case 'prestige_27': return state.prestigeCount >= 27;
    case 'prestige_30': return state.prestigeCount >= 30;
    case 'miner_1': return state.minerCount >= 1;
    case 'miner_10': return state.minerCount >= 10;
    case 'miner_100': return state.minerCount >= 100;
    case 'miner_420': return state.minerCount >= 420;
    case 'trinket_1': return state.ownedTrinketIds.length >= 1;
    case 'trinket_5': return state.ownedTrinketIds.length >= 5;
    case 'trinket_yates': return state.ownedTrinketIds.includes('yates_totem');
    case 'trinket_all': return state.ownedTrinketIds.length >= TRINKETS.length;
    default: return false;
  }
}

// Check if achievement should be unlocked based on current state only
export function shouldUnlockAchievement(achievement: Achievement, state: GameState): boolean {
  switch (achievement.id) {
    case 'all_pickaxes': return state.ownedPickaxeIds.length >= 25;
    case 'max_rock': return state.currentRockId >= 29;
    case 'money_1m': return state.yatesDollars >= 1000000;
    case 'money_100m': return state.yatesDollars >= 100000000;
    case 'money_1b': return state.yatesDollars >= 1000000000;
    case 'money_1t': return state.yatesDollars >= 1000000000000;
    case 'prestige_1': return state.prestigeCount >= 1;
    case 'prestige_3': return state.prestigeCount >= 3;
    case 'prestige_5': return state.prestigeCount >= 5;
    case 'prestige_7': return state.prestigeCount >= 7;
    case 'prestige_10': return state.prestigeCount >= 10;
    case 'prestige_15': return state.prestigeCount >= 15;
    case 'prestige_20': return state.prestigeCount >= 20;
    case 'prestige_27': return state.prestigeCount >= 27;
    case 'prestige_30': return state.prestigeCount >= 30;
    case 'miner_1': return state.minerCount >= 1;
    case 'miner_10': return state.minerCount >= 10;
    case 'miner_100': return state.minerCount >= 100;
    case 'miner_420': return state.minerCount >= 420;
    case 'trinket_1': return state.ownedTrinketIds.length >= 1;
    case 'trinket_5': return state.ownedTrinketIds.length >= 5;
    case 'trinket_yates': return state.ownedTrinketIds.includes('yates_totem');
    case 'trinket_all': return state.ownedTrinketIds.length >= TRINKETS.length;
    default: return false;
  }
}

// =====================
// ASCENSION TREE (Heavenly Upgrade System — prestige 10+)
// =====================

export type AscensionPath = 'money' | 'damage' | 'clickSpeed' | 'building' | 'antimatter' | 'prism' | 'bank' | 'wizardA' | 'wizardB' | 'traderA' | 'traderB' | 'afkDuration' | 'afkProduction' | 'trinkets' | 'luck' | 'drops' | 'origin';

export interface AscensionNode {
  id: string;
  name: string;
  description: string;
  cost: number; // Heavenly Chips
  pathId: AscensionPath;
  requires: string | null; // ID of prerequisite node (null = requires origin only)
  isCapstone: boolean;
  effects: {
    moneyBonus?: number;
    damageBonus?: number;
    clickSpeedBonus?: number;
    buildingBonus?: number;
    antimatterFillRate?: number;
    prismFillRate?: number;
    bankInterest?: number;
    wizardCostReduction?: number;
    wizardPowerBonus?: number;
    traderRewardBonus?: number;
    traderCostReduction?: number;
    afkDurationHours?: number;
    afkProductionPercent?: number;
    trinketBonus?: number;
    luckBonus?: number;
    dropChanceBonus?: number;
    allMoneyMultiplier?: number;
    allDamageMultiplier?: number;
    allClickSpeedMultiplier?: number;
    allBuildingMultiplier?: number;
    bankInterestMultiplier?: number;
    titleReward?: string;
  };
  icon?: string; // path to pixel art icon (Phase 4)
  position: { x: number; y: number }; // position on the canvas (relative to center)
}

// Helper: optional isCapstone, optional icon (public path)
function node(
  id: string,
  name: string,
  desc: string,
  cost: number,
  pathId: AscensionPath,
  requires: string | null,
  effects: AscensionNode['effects'],
  x: number,
  y: number,
  isCapstone?: boolean,
  iconPath?: string
): AscensionNode {
  const cap = Boolean(isCapstone);
  const n: AscensionNode = {
    id,
    name,
    description: desc,
    cost,
    pathId,
    requires,
    isCapstone: cap,
    effects,
    position: { x, y },
  };
  if (iconPath) n.icon = iconPath;
  return n;
}

// Node positions computed as constellation arcs radiating from center
// Larger radius + curve spread reduces overlap on the inner rings
function arc(baseAngle: number, index: number, radius: number = 178, curve: number = 0.035): { x: number; y: number } {
  const angle = baseAngle + index * curve;
  const r = radius * (index + 1);
  return { x: Math.round(Math.cos(angle) * r), y: Math.round(Math.sin(angle) * r) };
}

export const ASCENSION_NODES: AscensionNode[] = [
  // ORIGIN
  node('origin', 'The Beginning', 'The first step to greatness. Unlocks all ascension paths.', 1, 'origin', null, {}, 0, 0),

  // PATH 1: MONEY — arcs to upper-right (angle ~-0.5 rad, ~-30°)
  ...[
    ['money_1', 'A Lil Money', '+10% extra money', 5, { moneyBonus: 0.10 }],
    ['money_2', 'Increasing', '+15% money', 8, { moneyBonus: 0.15 }],
    ['money_3', 'Getting Richer', '+25% money', 9, { moneyBonus: 0.25 }],
    ['money_4', 'Can Always Get More', '+30% money', 11, { moneyBonus: 0.30 }],
    ['money_5', 'Money Moneyyy', '+35% money', 13, { moneyBonus: 0.35 }],
    ['money_6', 'The More Money The Better', '+40% money', 15, { moneyBonus: 0.40 }],
    ['money_7', 'Almost Riche', '+45% money', 20, { moneyBonus: 0.45 }],
    ['money_8', 'Rich Now?', '+50% money', 22, { moneyBonus: 0.50 }],
    ['money_9', 'Ultimatium Moneytum', '+55% money', 24, { moneyBonus: 0.55 }],
    ['money_10', 'Golden Toilet Paper?', '+60% money', 26, { moneyBonus: 0.60, titleReward: 'asc_money_heheh' }],
  ].map((n, i) => node(n[0] as string, n[1] as string, n[2] as string, n[3] as number, 'money', i === 0 ? 'origin' : `money_${i}`, n[4] as AscensionNode['effects'], arc(-0.5, i, 140, 0.04).x, arc(-0.5, i, 140, 0.04).y)),

  // PATH 2: DAMAGE — arcs to right (angle ~0.1 rad)
  ...[
    ['dmg_1', 'Logan Strenght', '+30% damage', 5, { damageBonus: 0.30 }],
    ['dmg_2', 'A Little Stronger', '+40% damage', 7, { damageBonus: 0.40 }],
    ['dmg_3', 'Ez Logan Slimed', '+50% damage', 9, { damageBonus: 0.50 }],
    ['dmg_4', '50 Push Ups', '+70% damage', 12, { damageBonus: 0.70 }],
    ['dmg_5', 'Very Very Strong', '+90% damage', 16, { damageBonus: 0.90 }],
    ['dmg_6', 'Ryan', '+120% damage', 19, { damageBonus: 1.20 }],
    ['dmg_7', 'Too Strong', '+150% damage', 22, { damageBonus: 1.50 }],
    ['dmg_8', 'No Need For That Much', '+200% damage', 26, { damageBonus: 2.00 }],
    ['dmg_9', 'Yoo Chill With The Steroids', '+250% damage', 31, { damageBonus: 2.50 }],
    ['dmg_10', 'Arnalda Schatsnagger', '+350% damage', 36, { damageBonus: 3.50, titleReward: 'bernardo_lvl' }],
  ].map((n, i) => node(n[0] as string, n[1] as string, n[2] as string, n[3] as number, 'damage', i === 0 ? 'origin' : `dmg_${i}`, n[4] as AscensionNode['effects'], arc(0.1, i, 140, -0.02).x, arc(0.1, i, 140, -0.02).y)),

  // PATH 3: CLICK SPEED — arcs to lower-right (angle ~0.7 rad)
  ...[
    ['click_1', '1 CpS??', '+15% click speed', 5, { clickSpeedBonus: 0.15 }],
    ['click_2', '5 CpS??', '+25% click speed', 9, { clickSpeedBonus: 0.25 }],
    ['click_3', '10 CpS??', '+35% click speed', 12, { clickSpeedBonus: 0.35 }],
    ['click_4', 'Clickly Clockly', '+55% click speed', 15, { clickSpeedBonus: 0.55 }],
    ['click_5', 'Click Click Click', '+70% click speed', 17, { clickSpeedBonus: 0.70 }],
    ['click_6', 'Click More', '+95% click speed', 19, { clickSpeedBonus: 0.95 }],
    ['click_7', 'Speedy Clicker', '+120% click speed', 23, { clickSpeedBonus: 1.20 }],
    ['click_8', 'Chill Ur Mouse Gon Break', '+150% click speed', 26, { clickSpeedBonus: 1.50 }],
    ['click_9', 'Nhewuumm', '+180% click speed', 29, { clickSpeedBonus: 1.80 }],
    ['click_10', 'Unshackled Cursors', '+250% click speed', 33, { clickSpeedBonus: 2.50, titleReward: 'asc_click_master' }],
  ].map((n, i) => node(n[0] as string, n[1] as string, n[2] as string, n[3] as number, 'clickSpeed', i === 0 ? 'origin' : `click_${i}`, n[4] as AscensionNode['effects'], arc(0.7, i, 140, 0.03).x, arc(0.7, i, 140, 0.03).y)),

  // PATH 4: BUILDING POWER — arcs down (angle ~1.3 rad)
  ...[
    ['build_1', '$LA√3', '+2% building power', 2, { buildingBonus: 0.02 }],
    ['build_2', 'Put The Fries In The Bag', '+15% building power', 9, { buildingBonus: 0.15 }],
    ['build_3', 'Client Always Right', '+30% building power', 11, { buildingBonus: 0.30 }],
    ['build_4', 'Keep Working', '+40% building power', 12, { buildingBonus: 0.40 }],
    ['build_5', '30$ An Hour..Ok..', '+55% building power', 13, { buildingBonus: 0.55 }],
    ['build_6', 'Alr Boss', '+120% building power', 26, { buildingBonus: 1.20 }],
    ['build_7', 'Now Were Talking', '+150% building power', 27, { buildingBonus: 1.50 }],
    ['build_8', 'Keep Em Working', '+180% building power', 29, { buildingBonus: 1.80 }],
    ['build_9', 'Retired', '+220% building power', 33, { buildingBonus: 2.20 }],
    ['build_10', 'Wippety Woppity', '+250% building power', 35, { buildingBonus: 2.50, titleReward: 'asc_elon_musk' }],
  ].map((n, i) => node(n[0] as string, n[1] as string, n[2] as string, n[3] as number, 'building', i === 0 ? 'origin' : `build_${i}`, n[4] as AscensionNode['effects'], arc(1.3, i, 140, -0.03).x, arc(1.3, i, 140, -0.03).y)),

  // PATH 5: ANTIMATTER — arcs upper-left (angle ~-2.3 rad, DARK ONLY)
  ...[
    ['anti_1', 'Dark-', '+15% antimatter fill rate', 8, { antimatterFillRate: 0.15 }],
    ['anti_2', '-Ness', '+35% antimatter fill rate', 14, { antimatterFillRate: 0.35 }],
    ['anti_3', "I'm Batman", '+60% antimatter fill rate', 20, { antimatterFillRate: 0.60 }],
    ['anti_4', 'I Live In The Shadows', '+90% antimatter fill rate', 25, { antimatterFillRate: 0.90 }],
    ['anti_5', 'Atomic', '+166% antimatter fill rate', 45, { antimatterFillRate: 1.66, titleReward: 'asc_consumer_darkness' }],
  ].map((n, i) => node(n[0] as string, n[1] as string, n[2] as string, n[3] as number, 'antimatter', i === 0 ? 'origin' : `anti_${i}`, n[4] as AscensionNode['effects'], arc(-2.3, i, 175, 0.05).x, arc(-2.3, i, 175, 0.05).y)),

  // PATH 6: PRISM — arcs left (angle ~-3.0 rad, LIGHT ONLY)
  ...[
    ['prism_1', 'Reflaction', '+15% Yates meter fill rate', 8, { prismFillRate: 0.15 }],
    ['prism_2', 'Bandy', '+35% Yates meter fill rate', 14, { prismFillRate: 0.35 }],
    ['prism_3', 'Light + Light = Ligheter', '+60% Yates meter fill rate', 20, { prismFillRate: 0.60 }],
    ['prism_4', 'Dabura', '+90% Yates meter fill rate', 25, { prismFillRate: 0.90 }],
    ['prism_5', 'KA-tchin thicn tchin!', '+166% Yates meter fill rate', 45, { prismFillRate: 1.66, titleReward: 'asc_geometry_correct' }],
  ].map((n, i) => node(n[0] as string, n[1] as string, n[2] as string, n[3] as number, 'prism', i === 0 ? 'origin' : `prism_${i}`, n[4] as AscensionNode['effects'], arc(-3.0, i, 175, -0.04).x, arc(-3.0, i, 175, -0.04).y)),

  // PATH 7: BANK — arcs lower-left (angle ~2.4 rad)
  node('bank_1', '100 Credit score??', '+0.2% bank interest rate', 10, 'bank', 'origin', { bankInterest: 0.002 }, arc(2.5, 0, 172).x, arc(2.5, 0, 172).y),
  node('bank_2', '500 Alr', '+0.3% bank interest rate', 25, 'bank', 'bank_1', { bankInterest: 0.003 }, arc(2.5, 1, 172).x, arc(2.5, 1, 172).y),
  node('bank_3', '755 Now Were Talking', '+0.7% bank interest rate', 30, 'bank', 'bank_2', { bankInterest: 0.007 }, arc(2.5, 2, 172).x, arc(2.5, 2, 172).y),
  node('bank_4', 'Here\'s $500k', '+1% bank interest rate', 45, 'bank', 'bank_3', { bankInterest: 0.01 }, arc(2.5, 3, 172).x, arc(2.5, 3, 172).y),
  node('bank_5', '(yk what? just take whatever :)', '+1.5% bank interest rate', 55, 'bank', 'bank_4', { bankInterest: 0.015, titleReward: 'asc_filthly_rich' }, arc(2.5, 4, 172).x, arc(2.5, 4, 172).y, true),

  // PATH 8A: WIZARD CHEAPER — arcs down-left (angle ~2.0 rad, DARK)
  node('wizA_1', 'Aluackbuarbom', '-5% wizard tower costs', 6, 'wizardA', 'origin', { wizardCostReduction: 0.05 }, arc(1.9, 0, 168, 0.045).x, arc(1.9, 0, 168, 0.045).y),
  node('wizA_2', 'Wathcigau', '-10% wizard tower costs', 10, 'wizardA', 'wizA_1', { wizardCostReduction: 0.10 }, arc(1.9, 1, 168, 0.045).x, arc(1.9, 1, 168, 0.045).y),
  node('wizA_3', 'Wizard Noob', '-15% wizard tower costs', 16, 'wizardA', 'wizA_2', { wizardCostReduction: 0.15 }, arc(1.9, 2, 168, 0.045).x, arc(1.9, 2, 168, 0.045).y),
  node('wizA_4', 'Wizard Pro', '-20% wizard tower costs', 22, 'wizardA', 'wizA_3', { wizardCostReduction: 0.20 }, arc(1.9, 3, 168, 0.045).x, arc(1.9, 3, 168, 0.045).y),
  node('wizA_5', 'Wizard Hacker', '-25% wizard tower costs', 28, 'wizardA', 'wizA_4', { wizardCostReduction: 0.25 }, arc(1.9, 4, 168, 0.045).x, arc(1.9, 4, 168, 0.045).y),
  node('wizA_6', 'Wizard Of OZ', '-35% wizard tower costs', 33, 'wizardA', 'wizA_5', { wizardCostReduction: 0.35 }, arc(1.9, 5, 168, 0.045).x, arc(1.9, 5, 168, 0.045).y),

  // PATH 8B: WIZARD STRONGER (angle ~1.75 rad, DARK)
  node('wizB_1', 'Logan Strenght 2.o', '+2% ritual power', 3, 'wizardB', 'origin', { wizardPowerBonus: 0.02 }, arc(2.2, 0, 174, 0.038).x, arc(2.2, 0, 174, 0.038).y),
  node('wizB_2', 'Stronger Than Logan', '+4% ritual power', 7, 'wizardB', 'wizB_1', { wizardPowerBonus: 0.04 }, arc(2.2, 1, 174, 0.038).x, arc(2.2, 1, 174, 0.038).y),
  node('wizB_3', 'Magicaulyus Maximus', '+10% ritual power', 14, 'wizardB', 'wizB_2', { wizardPowerBonus: 0.10 }, arc(2.2, 2, 174, 0.038).x, arc(2.2, 2, 174, 0.038).y),
  node('wizB_4', 'Washabungus Binliugngus', '+15% ritual power', 19, 'wizardB', 'wizB_3', { wizardPowerBonus: 0.15 }, arc(2.2, 3, 174, 0.038).x, arc(2.2, 3, 174, 0.038).y),
  node('wizB_5', 'Vintroclumus Latringus', '+25% ritual power', 28, 'wizardB', 'wizB_4', { wizardPowerBonus: 0.25 }, arc(2.2, 4, 174, 0.038).x, arc(2.2, 4, 174, 0.038).y),
  node('wizB_6', 'Abra Cadabra', '+30% ritual power', 33, 'wizardB', 'wizB_5', { wizardPowerBonus: 0.30 }, arc(2.2, 5, 174, 0.038).x, arc(2.2, 5, 174, 0.038).y, true),

  // PATH 9A: TRADER STRONGER (angle ~-1.55 rad, DARK)
  node('traderA_1', 'Bum', '+5% trader rewards', 3, 'traderA', 'origin', { traderRewardBonus: 0.05 }, arc(-1.55, 0, 172, 0.028).x, arc(-1.55, 0, 172, 0.028).y),
  node('traderA_2', 'Why u buying ts?', '+10% trader rewards', 9, 'traderA', 'traderA_1', { traderRewardBonus: 0.10 }, arc(-1.55, 1, 172, 0.028).x, arc(-1.55, 1, 172, 0.028).y),
  node('traderA_3', 'Wondering..', '+15% trader rewards', 13, 'traderA', 'traderA_2', { traderRewardBonus: 0.15 }, arc(-1.55, 2, 172, 0.028).x, arc(-1.55, 2, 172, 0.028).y),
  node('traderA_4', '15$ For A Slice Of Bread', '+20% trader rewards', 19, 'traderA', 'traderA_3', { traderRewardBonus: 0.20 }, arc(-1.55, 3, 172, 0.028).x, arc(-1.55, 3, 172, 0.028).y),
  node('traderA_5', 'The Hated', '+25% trader rewards', 25, 'traderA', 'traderA_4', { traderRewardBonus: 0.25 }, arc(-1.55, 4, 172, 0.028).x, arc(-1.55, 4, 172, 0.028).y),

  // PATH 9B: TRADER CHEAPER (angle ~-1.22 rad, DARK)
  node('traderB_1', 'Cheap Cheap', '-10% trader prices', 9, 'traderB', 'origin', { traderCostReduction: 0.10 }, arc(-1.22, 0, 172, -0.028).x, arc(-1.22, 0, 172, -0.028).y),
  node('traderB_2', 'Jouel Jouel', '-15% trader prices', 15, 'traderB', 'traderB_1', { traderCostReduction: 0.15 }, arc(-1.22, 1, 172, -0.028).x, arc(-1.22, 1, 172, -0.028).y),
  node('traderB_3', 'Cannot Be Ts Homeless', '-20% trader prices', 25, 'traderB', 'traderB_2', { traderCostReduction: 0.20 }, arc(-1.22, 2, 172, -0.028).x, arc(-1.22, 2, 172, -0.028).y),
  node('traderB_4', 'Discoutus Masicmos', '-25% trader prices', 33, 'traderB', 'traderB_3', { traderCostReduction: 0.25 }, arc(-1.22, 3, 172, -0.028).x, arc(-1.22, 3, 172, -0.028).y),

  // PATH 10A: AFK DURATION — demon lords (full $/s offline cap). Order: new.md
  node('afkA_1', 'Satan', '1 hour — earn like you were online', 7, 'afkDuration', 'origin', { afkDurationHours: 1 }, arc(1.55, 0, 182, 0.02).x, arc(1.55, 0, 182, 0.02).y, false, '/game/ascension/satan.png'),
  node('afkA_2', 'Asmodeus', '4 hours — earn like you were online', 49, 'afkDuration', 'afkA_1', { afkDurationHours: 4 }, arc(1.55, 1, 182, 0.02).x, arc(1.55, 1, 182, 0.02).y, false, '/game/ascension/asmodeus.png'),
  node('afkA_3', 'Beelzebub', '8 hours — earn like you were online', 320, 'afkDuration', 'afkA_2', { afkDurationHours: 8 }, arc(1.55, 2, 182, 0.02).x, arc(1.55, 2, 182, 0.02).y, false, '/game/ascension/beelzebub.png'),
  node('afkA_4', 'Lucifer', '16 hours — earn like you were online', 800, 'afkDuration', 'afkA_3', { afkDurationHours: 16 }, arc(1.55, 3, 182, 0.02).x, arc(1.55, 3, 182, 0.02).y, false, '/game/ascension/lucifer.png'),
  node('afkA_5', 'Chimera', '1 day — earn like you were online', 1000, 'afkDuration', 'afkA_4', { afkDurationHours: 24 }, arc(1.55, 4, 182, 0.02).x, arc(1.55, 4, 182, 0.02).y, true, '/game/ascension/chimera.png'),

  // PATH 10B: AFK PRODUCTION — celestial choir (% of $/s while offline)
  node('afkB_1', 'Dominions', '25% of normal $/s while offline (+10% offline production)', 12, 'afkProduction', 'origin', { afkProductionPercent: 0.25 }, arc(0.95, 0, 172, -0.018).x, arc(0.95, 0, 172, -0.018).y, false, '/game/ascension/dominions.png'),
  node('afkB_2', 'Cherubim', '45% of normal $/s while offline', 35, 'afkProduction', 'afkB_1', { afkProductionPercent: 0.45 }, arc(0.95, 1, 172, -0.018).x, arc(0.95, 1, 172, -0.018).y, false, '/game/ascension/cherubim.png'),
  node('afkB_3', 'Seraphim', '65% of normal $/s while offline', 90, 'afkProduction', 'afkB_2', { afkProductionPercent: 0.65 }, arc(0.95, 2, 172, -0.018).x, arc(0.95, 2, 172, -0.018).y, false, '/game/ascension/seraphim.png'),
  node('afkB_4', 'God', '75% of normal $/s while offline (like the cookie example)', 200, 'afkProduction', 'afkB_3', { afkProductionPercent: 0.75 }, arc(0.95, 3, 172, -0.018).x, arc(0.95, 3, 172, -0.018).y, true, '/game/ascension/god.png'),

  // PATH 11: TRINKETS
  node('trinket_a1', 'Firs Time Collector', '+20% trinket effects', 9, 'trinkets', 'origin', { trinketBonus: 0.20 }, arc(-0.9, 0, 158).x, arc(-0.9, 0, 158).y),
  node('trinket_a2', 'Divine Enchatment', '+50% trinket effects', 13, 'trinkets', 'trinket_a1', { trinketBonus: 0.50 }, arc(-0.9, 1, 158).x, arc(-0.9, 1, 158).y),
  node('trinket_a3', 'Queen Victoria', '+100% trinket effects', 15, 'trinkets', 'trinket_a2', { trinketBonus: 1.0 }, arc(-0.9, 2, 158).x, arc(-0.9, 2, 158).y),
  node('trinket_a4', 'Eternal Infusion', '+150% trinket effects', 18, 'trinkets', 'trinket_a3', { trinketBonus: 1.5 }, arc(-0.9, 3, 158).x, arc(-0.9, 3, 158).y),
  node('trinket_a5', 'Arcane Empowrement', '+250% trinket effects', 29, 'trinkets', 'trinket_a4', { trinketBonus: 2.5 }, arc(-0.9, 4, 158).x, arc(-0.9, 4, 158).y, true),

  // PATH 12: LUCK
  node('luck_1', 'Asta', '+0.5 luck', 9, 'luck', 'origin', { luckBonus: 0.5 }, arc(-2.7, 0, 152).x, arc(-2.7, 0, 152).y, false, '/game/ascension/asta.png'),
  node('luck_2', 'Lucky Clover', '+1.5 luck', 15, 'luck', 'luck_1', { luckBonus: 1.5 }, arc(-2.7, 1, 152).x, arc(-2.7, 1, 152).y),
  node('luck_3', 'King Julious', '+2.5 luck', 19, 'luck', 'luck_2', { luckBonus: 2.5 }, arc(-2.7, 2, 152).x, arc(-2.7, 2, 152).y, false, '/game/ascension/king_julius.png'),
  node('luck_4', 'Arthur The Great', '+4 luck', 22, 'luck', 'luck_3', { luckBonus: 4 }, arc(-2.7, 3, 152).x, arc(-2.7, 3, 152).y),
  node('luck_5', 'Luckyest One', '+7 luck', 27, 'luck', 'luck_4', { luckBonus: 7 }, arc(-2.7, 4, 152).x, arc(-2.7, 4, 152).y),
  node('luck_6', 'Blessed Odds', '+4 luck', 45, 'luck', 'luck_5', { luckBonus: 4 }, arc(-2.7, 5, 152).x, arc(-2.7, 5, 152).y),
  node('luck_7', 'Yuno', '+7 luck', 75, 'luck', 'luck_6', { luckBonus: 7, titleReward: 'asc_luck_born' }, arc(-2.7, 6, 152).x, arc(-2.7, 6, 152).y, true, '/game/ascension/yuno.png'),

  // PATH 13: DROP CHANCE
  node('drop_1', 'Tresure Seeker', '+0.5 drop chance', 9, 'drops', 'origin', { dropChanceBonus: 0.5 }, arc(-0.15, 0, 152).x, arc(-0.15, 0, 152).y),
  node('drop_2', 'Tresure Overflow', '+1.5 drop chance', 13, 'drops', 'drop_1', { dropChanceBonus: 1.5 }, arc(-0.15, 1, 152).x, arc(-0.15, 1, 152).y),
  node('drop_3', 'Jouel Sense', '+3 drop chance', 18, 'drops', 'drop_2', { dropChanceBonus: 3 }, arc(-0.15, 2, 152).x, arc(-0.15, 2, 152).y),
  node('drop_4', 'Divine Chances', '+7 drop chance', 22, 'drops', 'drop_3', { dropChanceBonus: 7 }, arc(-0.15, 3, 152).x, arc(-0.15, 3, 152).y),
  node('drop_5', "Rimuru's Blessing", '+2 drop chance', 44, 'drops', 'drop_4', { dropChanceBonus: 2 }, arc(-0.15, 4, 152).x, arc(-0.15, 4, 152).y, false, '/game/ascension/rimuru.png'),
  node('drop_6', "Chorollo's Fortune", '+4 drop chance', 65, 'drops', 'drop_5', { dropChanceBonus: 4 }, arc(-0.15, 5, 152).x, arc(-0.15, 5, 152).y, false, '/game/ascension/chorollo.png'),
  node('drop_7', 'Hakari Jackpot', '+8 drop chance', 110, 'drops', 'drop_6', { dropChanceBonus: 8, titleReward: 'asc_gilgamesh_treasury' }, arc(-0.15, 6, 152).x, arc(-0.15, 6, 152).y, true, '/game/ascension/hakari.png'),
];

/** Old “cap” node IDs merged into the last chip per branch — migrate saves from two-step caps */
const ASCENSION_CAP_NODE_MIGRATION: Record<string, string> = {
  money_cap: 'money_10',
  dmg_cap: 'dmg_10',
  click_cap: 'click_10',
  build_cap: 'build_10',
  anti_cap: 'anti_5',
  prism_cap: 'prism_5',
  bank_cap: 'bank_5',
  wiz_cap: 'wizB_6',
  luck_cap: 'luck_7',
  drop_cap: 'drop_7',
};

/** Paths that require BOTH sub-paths completed before granting a title automatically */
export const COMBINED_PATH_TITLES: { titleId: string; requires: [string, string] }[] = [
  { titleId: 'wizard_king',            requires: ['wizA_6', 'wizB_6'] },
  { titleId: 'disgusting_human_being', requires: ['traderA_5', 'traderB_4'] },
];

export function migrateOwnedAscensionNodeIds(ids: string[] | undefined): string[] {
  const set = new Set(ids || []);
  for (const [deprecated, replacement] of Object.entries(ASCENSION_CAP_NODE_MIGRATION)) {
    if (set.has(deprecated)) {
      set.delete(deprecated);
      set.add(replacement);
    }
  }
  return [...set];
}

/** Human-readable equip buff lines for the Titles UI */
export function summarizeTitleBuffLines(title: Title): string[] {
  const b = title.buffs;
  const lines: string[] = [];
  if (b.moneyBonus) lines.push(`+${Math.round(b.moneyBonus * 100)}% money`);
  if (b.allBonus) lines.push(`+${Math.round(b.allBonus * 100)}% all stats`);
  if (b.speedBonus) lines.push(`+${Math.round(b.speedBonus * 100)}% speed`);
  if (b.pcxDiscount) lines.push(`−${Math.round(b.pcxDiscount * 100)}% pickaxe cost`);
  if (b.prestigeMoneyRetention) lines.push(`+${Math.round(b.prestigeMoneyRetention * 100)}% money kept on prestige`);
  if (b.minerSpeedBonus) lines.push(`+${Math.round(b.minerSpeedBonus * 100)}% miner speed`);
  if (b.minerDamageBonus) lines.push(`+${Math.round(b.minerDamageBonus * 100)}% miner damage`);
  if (b.pcxDamageBonus) lines.push(`+${Math.round(b.pcxDamageBonus * 100)}% pickaxe damage`);
  return lines;
}

/** Effect phrases for one ascension node (matches AscensionTree tooltip, excludes title unlock). */
export function summarizeAscensionNodeEffects(e: AscensionNode['effects']): string[] {
  const p: string[] = [];
  if (e.moneyBonus) p.push(`+${Math.round(e.moneyBonus * 100)}% money`);
  if (e.damageBonus) p.push(`+${Math.round(e.damageBonus * 100)}% damage`);
  if (e.clickSpeedBonus) p.push(`+${Math.round(e.clickSpeedBonus * 100)}% click speed`);
  if (e.buildingBonus) p.push(`+${Math.round(e.buildingBonus * 100)}% building power`);
  if (e.antimatterFillRate) p.push(`+${Math.round(e.antimatterFillRate * 100)}% antimatter fill`);
  if (e.prismFillRate) p.push(`+${Math.round(e.prismFillRate * 100)}% Yates meter fill`);
  if (e.bankInterest) p.push(`+${(e.bankInterest * 100).toFixed(2)}% bank interest`);
  if (e.wizardCostReduction) p.push(`−${Math.round(e.wizardCostReduction * 100)}% wizard costs`);
  if (e.wizardPowerBonus) p.push(`+${Math.round(e.wizardPowerBonus * 100)}% ritual power`);
  if (e.traderRewardBonus) p.push(`+${Math.round(e.traderRewardBonus * 100)}% trader rewards`);
  if (e.traderCostReduction) p.push(`−${Math.round(e.traderCostReduction * 100)}% trader prices`);
  if (e.afkDurationHours) p.push(`${e.afkDurationHours}h offline earnings cap`);
  if (e.afkProductionPercent) p.push(`${Math.round(e.afkProductionPercent * 100)}% offline $/s`);
  if (e.trinketBonus) p.push(`+${Math.round(e.trinketBonus * 100)}% trinket effects`);
  if (e.luckBonus) p.push(`+${e.luckBonus} luck`);
  if (e.dropChanceBonus) p.push(`+${e.dropChanceBonus} drop chance`);
  if (e.allMoneyMultiplier && e.allMoneyMultiplier > 1) p.push(`${e.allMoneyMultiplier}× all money`);
  if (e.allDamageMultiplier && e.allDamageMultiplier > 1) p.push(`${e.allDamageMultiplier}× all damage`);
  if (e.allClickSpeedMultiplier && e.allClickSpeedMultiplier > 1) p.push(`${e.allClickSpeedMultiplier}× all click speed`);
  if (e.allBuildingMultiplier && e.allBuildingMultiplier > 1) p.push(`${e.allBuildingMultiplier}× all buildings`);
  if (e.bankInterestMultiplier && e.bankInterestMultiplier > 1) p.push(`${e.bankInterestMultiplier}× bank interest`);
  return p;
}

/** Lines describing what the heavenly upgrade that grants this title does (passive tree bonus). */
export function getTitleAscensionUnlockLines(titleId: string): string[] {
  const node = ASCENSION_NODES.find((n) => n.effects.titleReward === titleId);
  if (!node) return [];
  return summarizeAscensionNodeEffects(node.effects);
}

/** Aggregated ascension effects for owned node IDs — single source for GameContext + mine tick */
export function sumAscensionEffects(ownedIds: string[]) {
  const bonuses = {
    moneyBonus: 0,
    damageBonus: 0,
    clickSpeedBonus: 0,
    buildingBonus: 0,
    bankInterest: 0,
    trinketBonus: 0,
    luckBonus: 0,
    dropChanceBonus: 0,
    antimatterFillRate: 0,
    prismFillRate: 0,
    wizardCostReduction: 0,
    wizardPowerBonus: 0,
    traderRewardBonus: 0,
    traderCostReduction: 0,
    afkDurationHours: 0,
    afkProductionPercent: 0,
    allMoneyMultiplier: 1,
    allDamageMultiplier: 1,
    allClickSpeedMultiplier: 1,
    allBuildingMultiplier: 1,
    bankInterestMultiplier: 1,
  };

  for (const nodeId of ownedIds || []) {
    const node = ASCENSION_NODES.find(n => n.id === nodeId);
    if (!node) continue;
    const e = node.effects;

    if (e.moneyBonus) bonuses.moneyBonus += e.moneyBonus;
    if (e.damageBonus) bonuses.damageBonus += e.damageBonus;
    if (e.clickSpeedBonus) bonuses.clickSpeedBonus += e.clickSpeedBonus;
    if (e.buildingBonus) bonuses.buildingBonus += e.buildingBonus;
    if (e.bankInterest) bonuses.bankInterest += e.bankInterest;
    if (e.trinketBonus) bonuses.trinketBonus += e.trinketBonus;
    if (e.luckBonus) bonuses.luckBonus += e.luckBonus;
    if (e.dropChanceBonus) bonuses.dropChanceBonus += e.dropChanceBonus;
    if (e.antimatterFillRate) bonuses.antimatterFillRate += e.antimatterFillRate;
    if (e.prismFillRate) bonuses.prismFillRate += e.prismFillRate;
    if (e.wizardCostReduction) bonuses.wizardCostReduction += e.wizardCostReduction;
    if (e.wizardPowerBonus) bonuses.wizardPowerBonus += e.wizardPowerBonus;
    if (e.traderRewardBonus) bonuses.traderRewardBonus += e.traderRewardBonus;
    if (e.traderCostReduction) bonuses.traderCostReduction += e.traderCostReduction;
    if (e.afkDurationHours) bonuses.afkDurationHours = Math.max(bonuses.afkDurationHours, e.afkDurationHours);
    if (e.afkProductionPercent) bonuses.afkProductionPercent = Math.max(bonuses.afkProductionPercent, e.afkProductionPercent);
    if (e.allMoneyMultiplier) bonuses.allMoneyMultiplier *= e.allMoneyMultiplier;
    if (e.allDamageMultiplier) bonuses.allDamageMultiplier *= e.allDamageMultiplier;
    if (e.allClickSpeedMultiplier) bonuses.allClickSpeedMultiplier *= e.allClickSpeedMultiplier;
    if (e.allBuildingMultiplier) bonuses.allBuildingMultiplier *= e.allBuildingMultiplier;
    if (e.bankInterestMultiplier) bonuses.bankInterestMultiplier *= e.bankInterestMultiplier;
  }

  return bonuses;
}

// =====================
// BUILDING SYSTEM
// =====================

export type BuildingType = 'mine' | 'bank' | 'factory' | 'temple' | 'wizard_tower' | 'shipment' | 'gem_farm' | 'alchemy_lab' | 'time_machine' | 'antimatter_condenser' | 'prism' | 'chancemaker' | 'fractal_engine';

export interface Building {
  id: BuildingType;
  name: string;
  description: string;
  image: string;
  baseCost: number;
  costMultiplier: number;
  maxCount: number; // -1 for unlimited, specific number for limited (e.g., 1 for bank)
  pathRestriction: GamePath | null; // null = no restriction, 'light' or 'darkness' = path-locked
}

// Mine: Each mine = 10 miners working at 2x efficiency (= 20 miner-equivalents of passive income per mine)
export interface MineState {
  count: number;
  lastTickTime: number; // Last time passive income was generated
}

// Bank: Only 1, deposit money for interest over time
export interface BankState {
  owned: boolean;
  depositAmount: number;
  depositTimestamp: number | null; // When deposit was made
  lastInterestClaim: number | null; // When interest was last claimed
  bankTier: number; // 0-11, controls max deposit cap
  bankActiveMinutes: number; // Cumulative minutes the tab was open while deposit exists
}

// Factory: +10 miners each, random buffs
export interface FactoryState {
  count: number;
  bonusMiners: number; // Total bonus miners from factories
  lastBuffTime: number; // Timestamp of last buff generation
  nextBuffTime: number; // Timestamp when next buff will trigger
}

// Temple: Light path only, permanent upgrades with 3 ranks
export type TempleUpgradeType = 'money' | 'pcxDamage' | 'prestigePower' | 'trinketPower';
export type TempleUpgradeRank = 1 | 2 | 3;

export interface TempleUpgrade {
  type: TempleUpgradeType;
  rank: TempleUpgradeRank;
}

export interface TempleState {
  owned: boolean;
  upgrades: TempleUpgrade[];
  equippedRank: TempleUpgradeRank | null; // Which rank is currently active (can only equip one)
  lastBuffTime: number;
  nextBuffTime: number;
  lastTaxTime: number | null; // For rank costs
  goldenCookieClicks: number; // Track clicks while temple equipped (for hidden curse)
  hiddenCurseActive: boolean; // 25+ golden cookies = permanent curse until prestige
  hasCookieCurse: boolean; // Permanent until prestige - rock randomly heals to 100%
  hasHolyUnluckinessCurse: boolean; // Permanent until prestige - rock heals + 40% less money
  // Prayer system - pray for 20% chance to spawn golden cookie
  prayerCount: number; // Total prayers made
  lastPrayerTime: number | null; // Cooldown tracking
  pendingGoldenCookie: boolean; // If true, a golden cookie should spawn
}

// Wizard Tower: Darkness path only, shadow miners and rituals
export interface WizardTowerState {
  owned: boolean;
  shadowMiners: number;
  darkMiners: number; // From Dark Ritual backfire - steal money
  darkMinerNextSteal: number | null; // Timestamp for next money steal
  ritualActive: boolean;
  ritualEndTime: number | null;
  lastBuffTime: number;
  nextBuffTime: number;
}

// Shipment: Delayed imports from other dimensions
export interface ShipmentDelivery {
  id: string;
  type: 'exotic_rock' | 'trinket' | 'prestige_tokens' | 'money' | 'title';
  value: string | number; // Item ID or amount
  arrivalTime: number; // Timestamp when delivery arrives
}

export interface ShipmentState {
  count: number;
  pendingDeliveries: ShipmentDelivery[];
  totalDeliveries: number;
}

// Gem Farm: grows gems passively, 1 gem = 500$, 1 gem/min
export interface GemFarmState {
  count: number;
  totalGemsHarvested: number;
  lastGemTime: number;
}

// Alchemy Lab: every 100 clicks → +5% money bonus for 5 sec (stacks)
export interface AlchemyLabState {
  count: number;
  clicksSinceLastProc: number;
}

// Time Machine: temporal tax — collects % of other players' earnings
export interface TimeMachineState {
  count: number;
  totalTaxCollected: number;
}

// Antimatter Condenser (Dark only): antimatter meter → massive buffs at 100%
export interface AntimatterCondenserState {
  owned: boolean;
  antimatterPercent: number;
  lastResetTime: number;
  villainTitleUnlocked: boolean;
}

// Prism (Light only): Yates meter → 2x all stats at 100%
export interface PrismState {
  owned: boolean;
  yatesMeterPercent: number;
  lastResetTime: number;
  blessedTitleUnlocked: boolean;
}

// Chancemaker: random buffs per building
export interface ChancemakerState {
  count: number;
  lastCheckTime: number;
}

// Fractal Engine: generates base $/sec scaled by buildings & pickaxes
export interface FractalEngineState {
  count: number;
  totalGenerated: number;
}

// Combined building state
export interface BuildingStates {
  mine: MineState;
  bank: BankState;
  factory: FactoryState;
  temple: TempleState;
  wizard_tower: WizardTowerState;
  shipment: ShipmentState;
  gem_farm: GemFarmState;
  alchemy_lab: AlchemyLabState;
  time_machine: TimeMachineState;
  antimatter_condenser: AntimatterCondenserState;
  prism: PrismState;
  chancemaker: ChancemakerState;
  fractal_engine: FractalEngineState;
}

// =====================
// BUFF/DEBUFF SYSTEM
// =====================

export type BuffType = 
  | 'clickSpeed' 
  | 'damage' 
  | 'money' 
  | 'goldenCookie' 
  | 'allStats'
  | 'minerSpeed'
  | 'minerDamage';

export type BuffSource = 
  | 'factory' 
  | 'temple' 
  | 'wizard' 
  | 'powerup' 
  | 'event' 
  | 'goldenCookie'
  | 'shadySam'
  | 'chancemaker';

export interface ActiveBuff {
  id: string;
  type: BuffType;
  multiplier: number; // e.g., 0.5 = +50%, 1.0 = +100%
  duration: number; // Total duration in ms
  startTime: number; // Timestamp when buff started
  source: BuffSource;
  name: string; // Display name for buff bar
  icon: string; // Emoji or icon path
}

export type DebuffType = 
  | 'moneyLoss'      // -15% of current money
  | 'slowPickaxe'    // 60% slower pickaxe
  | 'loseMiners'     // Lose half miners
  | 'loseBuilding'   // Lose 1-5 random buildings
  | 'doubleRockHP'   // 2x rock HP for current rock
  | 'healRock'       // Heal rock to 100%
  | 'cookieCurse'    // Rock randomly heals to 100%
  | 'holyUnlicknessCurse'; // Random heal + 40% harder money

export interface ActiveDebuff {
  id: string;
  type: DebuffType;
  severity: number; // For variable effects
  duration: number | null; // null = permanent/until cleared, number = ms
  startTime: number;
  name: string;
  icon: string;
}

// =====================
// PROGRESSIVE UPGRADES
// =====================

export type ProgressiveUpgradeType = 
  | 'pcxDamage' 
  | 'money' 
  | 'generalSpeed' 
  | 'minerSpeed' 
  | 'minerDamage';

export interface ProgressiveUpgrade {
  id: ProgressiveUpgradeType;
  name: string;
  description: string;
  icon: string;
  baseValue: number; // Starting bonus (e.g., 0.001 = 0.1%)
  valuePerLevel: number; // Bonus increase per level
  baseCost: number;
  costMultiplier: number; // Cost scaling per level
  maxLevel: number;
}

export interface ProgressiveUpgradeState {
  pcxDamage: number; // Current level
  money: number;
  generalSpeed: number;
  minerSpeed: number;
  minerDamage: number;
}

// =====================
// POWERUPS (Consumables)
// =====================

export type PowerupType = 
  | 'miningFrenzy'   // 5x click speed
  | 'goldenTouch'    // 10x money for 100 clicks
  | 'timeWarp'       // 1hr miner income
  | 'luckyStrike'    // Guaranteed coupon
  | 'buildingBoost'; // 2x building effects

export interface Powerup {
  id: PowerupType;
  name: string;
  description: string;
  icon: string;
  cost: number;
  duration: number | null; // null for instant/count-based, number for timed
  effect: {
    type: BuffType | 'instantMoney' | 'guaranteedCoupon';
    value: number;
    clicks?: number; // For click-based powerups like Golden Touch
  };
}

export interface PowerupInventory {
  miningFrenzy: number;
  goldenTouch: number;
  timeWarp: number;
  luckyStrike: number;
  buildingBoost: number;
}

// Active powerup state (for Golden Touch click tracking)
export interface ActivePowerup {
  type: PowerupType;
  startTime: number;
  duration: number | null;
  remainingClicks?: number; // For click-based powerups
}

// =====================
// BUILDING CONSTANTS
// =====================

export const BUILDINGS: Building[] = [
  // Cookie Clicker order: Farm, Mine, Factory, Bank, Temple, Wizard Tower, Shipment, Alchemy Lab, Time Machine, Antimatter Condenser, Prism, Chancemaker, Fractal Engine
  {
    id: 'gem_farm',
    name: 'Gem Farm',
    description: 'Grows gems passively. 1 gem = $500, 1 gem per minute per farm.',
    image: '/game/buildings/gemfarm.png',
    baseCost: 7000000, // 7M
    costMultiplier: 1.5,
    maxCount: -1,
    pathRestriction: null,
  },
  {
    id: 'mine',
    name: 'Mine',
    description: 'Each mine = 10 miners at 2x efficiency (20 miner-equivalents of passive income). Special: With Temple Rank 2/3, generates 20% of click money every 0.5s instead.',
    image: '/game/buildings/mine.png',
    baseCost: 200000000, // 200M
    costMultiplier: 1.8,
    maxCount: -1,
    pathRestriction: null,
  },
  {
    id: 'factory',
    name: 'Factory',
    description: 'Each factory provides +10 bonus miners and generates random pickaxe buffs.',
    image: '/game/buildings/factory.png',
    baseCost: 1500000000, // 1.5B
    costMultiplier: 1.6,
    maxCount: -1,
    pathRestriction: null,
  },
  {
    id: 'bank',
    name: 'Bank',
    description: 'Deposit money and earn interest over time. The longer you wait, the more profit!',
    image: '/game/buildings/bank.png',
    baseCost: 0, // 60-70% of current money
    costMultiplier: 1,
    maxCount: 1,
    pathRestriction: null,
  },
  {
    id: 'temple',
    name: 'Temple',
    description: 'Light path only. Miners generate 1.5x money. Unlock permanent upgrades with 3 ranks.',
    image: '/game/buildings/temple.png',
    baseCost: 500000000000, // 500B
    costMultiplier: 1,
    maxCount: 1,
    pathRestriction: 'light',
  },
  {
    id: 'wizard_tower',
    name: 'Wizard Tower',
    description: 'Darkness path only. Summon shadow miners and perform dark rituals for mega buffs.',
    image: '/game/buildings/wizard_tower.png',
    baseCost: 550000000000, // 550B
    costMultiplier: 1,
    maxCount: 1,
    pathRestriction: 'darkness',
  },
  {
    id: 'shipment',
    name: 'Shipment',
    description: 'Import rare ores from other dimensions. Deliveries take time but bring exotic rewards!',
    image: '/game/buildings/shipment.png',
    baseCost: 1250000000000, // 1.25T
    costMultiplier: 5.0,
    maxCount: 5,
    pathRestriction: null,
  },
  {
    id: 'alchemy_lab',
    name: 'Alchemy Lab',
    description: 'Every 100 clicks, grants +5% money bonus for 5 seconds. Stacks!',
    image: '/game/buildings/alchemylab.png',
    baseCost: 5400000000000, // 5.4T
    costMultiplier: 1.8,
    maxCount: -1,
    pathRestriction: null,
  },
  {
    id: 'time_machine',
    name: 'Time Machine',
    description: 'Temporal Tax: passively collects 0.1% of other players\' earnings per minute.',
    image: '/game/buildings/timemachine.png',
    baseCost: 21000000000000, // 21T
    costMultiplier: 2.0,
    maxCount: -1,
    pathRestriction: null,
  },
  {
    id: 'antimatter_condenser',
    name: 'Antimatter Condenser',
    description: 'Darkness only. Fill the antimatter meter to 100% for massive buffs and "The Villain" title!',
    image: '/game/buildings/antimatter_condenser.png',
    baseCost: 62000000000000, // 62T
    costMultiplier: 1,
    maxCount: 1,
    pathRestriction: 'darkness',
  },
  {
    id: 'prism',
    name: 'Prism',
    description: 'Light only. Fill the Yates meter to 100% for +2x all stats and 10x bank interest!',
    image: '/game/buildings/prism.png',
    baseCost: 62000000000000, // 62T
    costMultiplier: 1,
    maxCount: 1,
    pathRestriction: 'light',
  },
  {
    id: 'chancemaker',
    name: 'Chancemaker',
    description: 'Every 20 seconds per building: 5.5% chance for a random buff lasting 20s-5min.',
    image: '/game/buildings/chancemaker.png',
    baseCost: 45000000000000, // 45T
    costMultiplier: 2.0,
    maxCount: -1,
    pathRestriction: null,
  },
  {
    id: 'fractal_engine',
    name: 'Fractal Engine',
    description: 'Generates 15B$/sec base. +1% per building, +0.5% per pickaxe owned.',
    image: '/game/buildings/fractalengine.png',
    baseCost: 99999999999999, // 99T999B999M999K999
    costMultiplier: 2.5,
    maxCount: -1,
    pathRestriction: null,
  },
];

// Mine constants - Each mine = 10 miners at 2x efficiency = 20 miner-equivalents
export const MINE_MINER_EQUIVALENTS_PER_MINE = 20; // Each mine generates income like 20 miners
export const MINE_TICK_INTERVAL = 1000; // Every 1 second for passive income
export const MINE_EFFICIENCY_BONUS_PER_MINE = 0.05; // 5% efficiency bonus per additional mine

// Bank constants
export const BANK_COST_PERCENTAGE_MIN = 0.60; // 60% of current money
export const BANK_COST_PERCENTAGE_MAX = 0.70; // 70% of current money
export const BANK_BASE_INTEREST_RATE = 0.001; // 0.1% per minute base
export const BANK_TIME_MULTIPLIER = 0.0001; // Interest increases with time

// Bank Loan constants
export const LOAN_MAX_AMOUNT = 1e21; // Max loan: 1 Sextillion
export const LOAN_DAILY_INTEREST_RATE = 4.50; // 450% compound interest per IRL day
export const LOAN_OPEN_TAB_BONUS_RATE = 0.05; // 5% interest reduction per hour while game tab open
export const LOAN_AUTO_REPAY_THRESHOLD = 2; // If debt >= 2x current money, auto-route earnings to debt

export interface BankTierDef {
  label: string;
  unlockCost: number;
  maxDeposit: number; // Infinity for the final tier
}

export const BANK_TIERS: BankTierDef[] = [
  { label: '1K - 999K',  unlockCost: 10_000,                    maxDeposit: 999_999 },
  { label: '1M+',        unlockCost: 10_000_000,                maxDeposit: 999_999_999 },
  { label: '1B+',        unlockCost: 15_000_000_000,            maxDeposit: 999_999_999_999 },
  { label: '1T+',        unlockCost: 20_000_000_000_000,        maxDeposit: 999_999_999_999_999 },
  { label: '1Q+',        unlockCost: 3e15,                      maxDeposit: 999e15 },
  { label: '1Qi+',       unlockCost: 5e18,                      maxDeposit: 999e18 },
  { label: '1Sx+',       unlockCost: 500e18,                    maxDeposit: 999e21 },
  { label: '1Sp+',       unlockCost: 500e21,                    maxDeposit: 999e24 },
  { label: '1Oc+',       unlockCost: 700e24,                    maxDeposit: 999e27 },
  { label: '1No+',       unlockCost: 800e27,                    maxDeposit: 999e30 },
  { label: '1Dc+',       unlockCost: 880e30,                    maxDeposit: 999e33 },
  { label: '1Tr+',       unlockCost: 999e33,                    maxDeposit: Infinity },
];

export const BANK_MAX_TIER = BANK_TIERS.length - 1;

export function getBankDepositCap(tier: number): number {
  if (tier < 0) return BANK_TIERS[0].maxDeposit;
  if (tier > BANK_MAX_TIER) return Infinity;
  return BANK_TIERS[tier].maxDeposit;
}

export function getBankTierForAmount(amount: number): number {
  for (let i = BANK_TIERS.length - 1; i >= 0; i--) {
    if (i === 0) return 0;
    const prevCap = BANK_TIERS[i - 1].maxDeposit;
    if (amount > prevCap) return i;
  }
  return 0;
}

// Factory constants
export const FACTORY_BONUS_MINERS = 10;
export const FACTORY_BUFF_MIN_INTERVAL = 600000; // 10 minutes base
export const FACTORY_BUFF_MAX_INTERVAL = 720000; // 12 minutes base
export const FACTORY_BUFF_REDUCTION_PER_FACTORY = 5000; // -5 seconds per factory owned
export const FACTORY_BUFF_RANGES = {
  clickSpeed: { min: 0.01, max: 0.50, durationMin: 5000, durationMax: 20000 },
  damage: { min: 0.10, max: 1.00, durationMin: 2000, durationMax: 31000 },
  money: { min: 0.0001, max: 1.00, durationMin: 1000, durationMax: 60000 },
};

// Temple constants
export const TEMPLE_MINER_MONEY_MULTIPLIER = 1.5;
export const TEMPLE_BUFF_INTERVAL_MIN = 120000; // 2 minutes
export const TEMPLE_BUFF_INTERVAL_MAX = 180000; // 3 minutes
export const TEMPLE_UPGRADE_VALUES: Record<TempleUpgradeType, { rank1: number; rank2: number; rank3: number }> = {
  money: { rank1: 0.27, rank2: 0.55, rank3: 0.90 },
  pcxDamage: { rank1: 0.36, rank2: 0.73, rank3: 1.20 },
  prestigePower: { rank1: 0.15, rank2: 0.30, rank3: 0.50 },
  trinketPower: { rank1: 0.24, rank2: 0.49, rank3: 0.81 },
};
export const TEMPLE_RANK_COSTS = {
  rank1: { moneyPercentage: 0.05, interval: 600000 }, // 5% every 10min
  rank2: { canBuyMiners: false, canSacrifice: false },
  rank3: { moneyPercentage: 0.25, interval: 1200000, canBuyMiners: false, rottenCookieChance: 0.15 }, // 25% every 20min
};

// Wizard Tower constants
export const WIZARD_SHADOW_MINER_BASE = 10;
export const WIZARD_RITUAL_DURATION = 60000; // 1 minute ritual
export const WIZARD_RITUAL_BUFF_MULTIPLIER = 3.0; // 3x everything during ritual
export const WIZARD_RITUAL_MINER_COST = 367; // Must have 367 miners to perform ritual
export const WIZARD_BUFF_INTERVAL_MIN = 90000;
export const WIZARD_BUFF_INTERVAL_MAX = 150000;

// Temple Rank mechanics
export const TEMPLE_RANK_CONFIG: Record<1 | 2 | 3, {
  taxPercent: number;
  taxIntervalMs: number;
  rottenCookieChance: number;
  canBuyMiners: boolean;
}> = {
  1: { taxPercent: 0.05, taxIntervalMs: 5 * 60 * 1000, rottenCookieChance: 0.05, canBuyMiners: true },
  2: { taxPercent: 0.12, taxIntervalMs: 12 * 60 * 1000, rottenCookieChance: 0.12, canBuyMiners: false },
  3: { taxPercent: 0.25, taxIntervalMs: 25 * 60 * 1000, rottenCookieChance: 0.50, canBuyMiners: false },
};

// Hidden curse after 25 golden cookies while temple equipped
export const TEMPLE_HIDDEN_CURSE_THRESHOLD = 25;
export const TEMPLE_HIDDEN_CURSE_PRICE_MULTIPLIER = 1.6; // 60% more expensive
export const TEMPLE_HIDDEN_CURSE_ROCK_HP_MULTIPLIER = 10; // 10x rock health
export const TEMPLE_HIDDEN_CURSE_MONEY_PENALTY = 0.10; // 10% less money

// Mine passive income when can't buy miners (rank 2/3)
export const MINE_PASSIVE_INCOME_PERCENT = 0.20; // 20% of click money
export const MINE_PASSIVE_TICK_MS = 500; // Every 0.5 seconds
export const MINE_PASSIVE_SPEED_INCREASE = 0.001; // 0.1% faster each tick

// Shipment constants
export const SHIPMENT_DELIVERY_TIME_MIN = 300000; // 5 minutes
export const SHIPMENT_DELIVERY_TIME_MAX = 1800000; // 30 minutes
export const SHIPMENT_REWARDS = {
  exoticRock: 0.15,
  trinket: 0.10,
  prestigeTokens: 0.25,
  money: 0.45,
  title: 0.05,
};

// =====================
// PROGRESSIVE UPGRADE CONSTANTS
// =====================

export const PROGRESSIVE_UPGRADES: ProgressiveUpgrade[] = [
  {
    id: 'pcxDamage',
    name: 'Pickaxe Strength',
    description: 'Increase pickaxe damage',
    icon: '⛏️',
    baseValue: 0.001, // +0.1%
    valuePerLevel: 0.001,
    baseCost: 1000000000, // 1B
    costMultiplier: 1.04, // Much slower scaling
    maxLevel: 500,
  },
  {
    id: 'money',
    name: 'Money Bonus',
    description: 'Increase money earned',
    icon: '💰',
    baseValue: 0.001,
    valuePerLevel: 0.001,
    baseCost: 1000000000, // 1B
    costMultiplier: 1.04,
    maxLevel: 500,
  },
  {
    id: 'generalSpeed',
    name: 'General Speed',
    description: 'Increase overall speed',
    icon: '⚡',
    baseValue: 0.0005, // +0.05%
    valuePerLevel: 0.0005,
    baseCost: 2500000000, // 2.5B
    costMultiplier: 1.05,
    maxLevel: 300,
  },
  {
    id: 'minerSpeed',
    name: 'Miner Speed',
    description: 'Increase miner tick speed',
    icon: '👷',
    baseValue: 0.005, // +0.5%
    valuePerLevel: 0.005,
    baseCost: 1500000000, // 1.5B
    costMultiplier: 1.04,
    maxLevel: 200,
  },
  {
    id: 'minerDamage',
    name: 'Miner Power',
    description: 'Increase miner damage',
    icon: '💪',
    baseValue: 0.001,
    valuePerLevel: 0.001,
    baseCost: 1000000000, // 1B
    costMultiplier: 1.04,
    maxLevel: 500,
  },
];

// Get progressive upgrade cost at a specific level
export function getProgressiveUpgradeCost(upgrade: ProgressiveUpgrade, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

// Get progressive upgrade total bonus at a specific level
export function getProgressiveUpgradeBonus(upgrade: ProgressiveUpgrade, currentLevel: number): number {
  if (currentLevel === 0) return 0;
  return upgrade.baseValue + (upgrade.valuePerLevel * (currentLevel - 1));
}

// =====================
// POWERUP CONSTANTS
// =====================

export const POWERUPS: Powerup[] = [
  {
    id: 'miningFrenzy',
    name: 'Mining Frenzy',
    description: '5x click speed for 30 seconds',
    icon: '🔥',
    cost: 50000000000, // 50B
    duration: 30000,
    effect: { type: 'clickSpeed', value: 4.0 }, // +400% = 5x
  },
  {
    id: 'goldenTouch',
    name: 'Golden Touch',
    description: '10x money for 100 clicks',
    icon: '✨',
    cost: 100000000000, // 100B
    duration: null,
    effect: { type: 'money', value: 9.0, clicks: 100 }, // +900% = 10x
  },
  {
    id: 'timeWarp',
    name: 'Time Warp',
    description: 'Instantly gain 1 hour of miner income',
    icon: '⏰',
    cost: 250000000000, // 250B
    duration: null,
    effect: { type: 'instantMoney', value: 3600 }, // 3600 seconds of income
  },
  {
    id: 'luckyStrike',
    name: 'Lucky Strike',
    description: 'Guaranteed coupon drop on next rock break',
    icon: '🍀',
    cost: 500000000000, // 500B
    duration: null,
    effect: { type: 'guaranteedCoupon', value: 1 },
  },
  {
    id: 'buildingBoost',
    name: 'Building Boost',
    description: '2x all building effects for 5 minutes',
    icon: '🏗️',
    cost: 1000000000000, // 1T
    duration: 300000, // 5 minutes
    effect: { type: 'allStats', value: 1.0 }, // +100% = 2x
  },
];

// =====================
// DEBUFF CONSTANTS
// =====================

export const DEBUFF_EFFECTS = {
  moneyLoss: { percentage: 0.15 }, // -15%
  slowPickaxe: { multiplier: 0.40, durationMin: 30000, durationMax: 60000 }, // 60% slower = 40% speed
  loseMiners: { percentage: 0.50 }, // Lose 50%
  loseBuilding: { min: 1, max: 5 },
  doubleRockHP: { multiplier: 2.0 },
  cookieCurse: { chance: 0.0010 }, // 0.10% per tick
  holyUnlicknessCurse: { chance: 0.0009, moneyPenalty: 0.40 }, // 0.09%, 40% harder
};

// Rotten cookie debuff chances (when Temple rank 3 is active)
export const ROTTEN_COOKIE_DEBUFF_WEIGHTS = {
  moneyLoss: 0.25,
  slowPickaxe: 0.20,
  loseMiners: 0.15,
  loseBuilding: 0.10,
  doubleRockHP: 0.15,
  healRock: 0.10,
  cookieCurse: 0.03,
  holyUnlicknessCurse: 0.02,
};

// =====================
// DEFAULT STATE INITIALIZERS
// =====================

export function getDefaultBuildingStates(): BuildingStates {
  return {
    mine: {
      count: 0,
      lastTickTime: Date.now(),
    },
    bank: {
      owned: false,
      depositAmount: 0,
      depositTimestamp: null,
      lastInterestClaim: null,
      bankTier: 0,
      bankActiveMinutes: 0,
    },
    factory: {
      count: 0,
      bonusMiners: 0,
      lastBuffTime: 0,
      nextBuffTime: 0,
    },
    temple: {
      owned: false,
      upgrades: [],
      equippedRank: null,
      lastBuffTime: 0,
      nextBuffTime: 0,
      lastTaxTime: null,
      goldenCookieClicks: 0,
      hiddenCurseActive: false,
      hasCookieCurse: false,
      hasHolyUnluckinessCurse: false,
      prayerCount: 0,
      lastPrayerTime: null,
      pendingGoldenCookie: false,
    },
    wizard_tower: {
      owned: false,
      shadowMiners: 0,
      darkMiners: 0,
      darkMinerNextSteal: null,
      ritualActive: false,
      ritualEndTime: null,
      lastBuffTime: 0,
      nextBuffTime: 0,
    },
    shipment: {
      count: 0,
      pendingDeliveries: [],
      totalDeliveries: 0,
    },
    gem_farm: {
      count: 0,
      totalGemsHarvested: 0,
      lastGemTime: Date.now(),
    },
    alchemy_lab: {
      count: 0,
      clicksSinceLastProc: 0,
    },
    time_machine: {
      count: 0,
      totalTaxCollected: 0,
    },
    antimatter_condenser: {
      owned: false,
      antimatterPercent: 0,
      lastResetTime: 0,
      villainTitleUnlocked: false,
    },
    prism: {
      owned: false,
      yatesMeterPercent: 0,
      lastResetTime: 0,
      blessedTitleUnlocked: false,
    },
    chancemaker: {
      count: 0,
      lastCheckTime: Date.now(),
    },
    fractal_engine: {
      count: 0,
      totalGenerated: 0,
    },
  };
}

export function getDefaultProgressiveUpgradeState(): ProgressiveUpgradeState {
  return {
    pcxDamage: 0,
    money: 0,
    generalSpeed: 0,
    minerSpeed: 0,
    minerDamage: 0,
  };
}

export function getDefaultPowerupInventory(): PowerupInventory {
  return {
    miningFrenzy: 0,
    goldenTouch: 0,
    timeWarp: 0,
    luckyStrike: 0,
    buildingBoost: 0,
  };
}

// Get building cost at current count
export function getBuildingCost(building: Building, currentCount: number, currentMoney?: number): number {
  // Bank is special - costs 60-70% of current money
  if (building.id === 'bank' && currentMoney !== undefined) {
    const percentage = BANK_COST_PERCENTAGE_MIN + Math.random() * (BANK_COST_PERCENTAGE_MAX - BANK_COST_PERCENTAGE_MIN);
    return Math.floor(currentMoney * percentage);
  }
  return Math.floor(building.baseCost * Math.pow(building.costMultiplier, currentCount));
}

// Check if player can buy a building
export function canBuyBuilding(building: Building, state: GameState): boolean {
  // Check path restriction
  if (building.pathRestriction !== null && state.chosenPath !== building.pathRestriction) {
    return false;
  }
  
  // Check max count
  const currentCount = getBuildingCount(building.id, state);
  if (building.maxCount !== -1 && currentCount >= building.maxCount) {
    return false;
  }
  
  // Check cost
  const cost = getBuildingCost(building, currentCount, state.yatesDollars);
  return state.yatesDollars >= cost;
}

// Get current count of a building type
export function getBuildingCount(buildingId: BuildingType, state: GameState): number {
  switch (buildingId) {
    case 'mine': return state.buildings.mine.count;
    case 'bank': return state.buildings.bank.owned ? 1 : 0;
    case 'factory': return state.buildings.factory.count;
    case 'temple': return state.buildings.temple.owned ? 1 : 0;
    case 'wizard_tower': return state.buildings.wizard_tower.owned ? 1 : 0;
    case 'shipment': return state.buildings.shipment.count;
    case 'gem_farm': return state.buildings.gem_farm?.count || 0;
    case 'alchemy_lab': return state.buildings.alchemy_lab?.count || 0;
    case 'time_machine': return state.buildings.time_machine?.count || 0;
    case 'antimatter_condenser': return state.buildings.antimatter_condenser?.owned ? 1 : 0;
    case 'prism': return state.buildings.prism?.owned ? 1 : 0;
    case 'chancemaker': return state.buildings.chancemaker?.count || 0;
    case 'fractal_engine': return state.buildings.fractal_engine?.count || 0;
    default: return 0;
  }
}

// Calculate total miner efficiency bonus from mines
export function getMineEfficiencyBonus(mineCount: number): number {
  if (mineCount <= 1) return 0;
  return (mineCount - 1) * MINE_EFFICIENCY_BONUS_PER_MINE;
}

// Calculate bank interest based on active play time (only accrues while tab is open)
// bankActiveMinutes: cumulative minutes the tab was open while deposit exists
export function calculateBankInterest(depositAmount: number, depositTimestamp: number, now: number, interestMultiplier: number = 1, sideLevel: number = 0, bankActiveMinutes: number = 0, ascensionInterestBonus: number = 0): number {
  const minutesDeposited = bankActiveMinutes > 0 ? bankActiveMinutes : (now - depositTimestamp) / 60000;
  const baseRate = getSideLevelBankInterestRate(sideLevel) + ascensionInterestBonus;
  const baseInterestRate = baseRate * interestMultiplier;
  const interestRate = baseInterestRate + (minutesDeposited * BANK_TIME_MULTIPLIER);
  return Math.floor(depositAmount * interestRate * minutesDeposited);
}

// Generate a random factory buff
export function generateFactoryBuff(): ActiveBuff {
  const buffTypes: BuffType[] = ['clickSpeed', 'damage', 'money'];
  const type = buffTypes[Math.floor(Math.random() * buffTypes.length)];
  const ranges = FACTORY_BUFF_RANGES[type as keyof typeof FACTORY_BUFF_RANGES];
  
  const multiplier = ranges.min + Math.random() * (ranges.max - ranges.min);
  const duration = ranges.durationMin + Math.random() * (ranges.durationMax - ranges.durationMin);
  
  const names: Record<string, string> = {
    clickSpeed: 'Factory Speed Boost',
    damage: 'Factory Power Surge',
    money: 'Factory Profit Rush',
  };
  
  const icons: Record<string, string> = {
    clickSpeed: '⚡',
    damage: '💥',
    money: '💰',
  };
  
  return {
    id: `factory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    multiplier,
    duration,
    startTime: Date.now(),
    source: 'factory',
    name: names[type],
    icon: icons[type],
  };
}

// Get next factory buff time (reduces by 5 seconds per factory owned)
export function getNextFactoryBuffTime(factoryCount: number = 1): number {
  const reduction = (factoryCount - 1) * FACTORY_BUFF_REDUCTION_PER_FACTORY;
  const minInterval = Math.max(60000, FACTORY_BUFF_MIN_INTERVAL - reduction); // Min 1 minute
  const maxInterval = Math.max(90000, FACTORY_BUFF_MAX_INTERVAL - reduction); // Min 1.5 minutes
  return Date.now() + minInterval + Math.random() * (maxInterval - minInterval);
}

// Get next shipment delivery time based on shipment count
export function getNextShipmentDeliveryTime(shipmentCount: number): number {
  // More shipments = faster deliveries (diminishing returns)
  const speedBonus = Math.min(0.5, shipmentCount * 0.05); // Max 50% faster
  const baseTime = SHIPMENT_DELIVERY_TIME_MIN + Math.random() * (SHIPMENT_DELIVERY_TIME_MAX - SHIPMENT_DELIVERY_TIME_MIN);
  return Date.now() + Math.floor(baseTime * (1 - speedBonus));
}

// Generate a random shipment delivery
export function generateShipmentDelivery(shipmentCount: number): ShipmentDelivery {
  const roll = Math.random();
  let type: ShipmentDelivery['type'];
  let value: string | number;
  
  if (roll < SHIPMENT_REWARDS.exoticRock) {
    type = 'exotic_rock';
    const exoticRocks = EXOTIC_ROCKS;
    const picked = exoticRocks[Math.floor(Math.random() * exoticRocks.length)];
    value = picked ? picked.id : 'clown_rock';
  } else if (roll < SHIPMENT_REWARDS.exoticRock + SHIPMENT_REWARDS.trinket) {
    type = 'trinket';
    const pool = TRINKETS.filter(t => ['common', 'rare', 'epic'].includes(t.rarity));
    const picked = pool[Math.floor(Math.random() * pool.length)];
    value = picked ? picked.id : 'avatar_ring';
  } else if (roll < SHIPMENT_REWARDS.exoticRock + SHIPMENT_REWARDS.trinket + SHIPMENT_REWARDS.prestigeTokens) {
    type = 'prestige_tokens';
    value = 1 + Math.floor(Math.random() * 3);
  } else if (roll < 1 - SHIPMENT_REWARDS.title) {
    type = 'money';
    value = Math.floor(1000000 * Math.pow(10, Math.random() * 6));
  } else {
    type = 'title';
    value = 'dimensional_traveler';
  }
  
  return {
    id: `shipment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    value,
    arrivalTime: getNextShipmentDeliveryTime(shipmentCount),
  };
}

// Get display name for a shipment delivery
export function getShipmentDeliveryName(delivery: ShipmentDelivery): string {
  switch (delivery.type) {
    case 'exotic_rock': {
      const rock = EXOTIC_ROCKS.find(r => r.id === delivery.value);
      return rock ? rock.name : 'Exotic Rock';
    }
    case 'trinket': {
      const trinket = TRINKETS.find(t => t.id === delivery.value);
      return trinket ? trinket.name : 'Mystery Trinket';
    }
    case 'prestige_tokens':
      return `${delivery.value} Prestige Token${(delivery.value as number) > 1 ? 's' : ''}`;
    case 'money': {
      const n = delivery.value as number;
      if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
      if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
      return `$${n.toLocaleString()}`;
    }
    case 'title':
      return 'Dimensional Traveler (Title)';
    default:
      return 'Unknown Delivery';
  }
}

// =====================
// WANDERING TRADER SYSTEM (Darkness path only)
// =====================

export const WANDERING_TRADER_MIN_SPAWN = 5 * 60 * 1000;  // 5 minutes
export const WANDERING_TRADER_MAX_SPAWN = 15 * 60 * 1000; // 15 minutes
export const WANDERING_TRADER_DURATION = 60 * 1000;       // 1 minute on screen

export type WanderingTraderOfferType = 
  | 'empc_temp'           // 10% EMPC for 1min, -11% click speed
  | 'empc_perm'           // 40% perm EMPC, costs all money
  | 'cps_temp'            // 50% CPS for 2min, costs 2 trinkets
  | 'roulette'            // 1 roulette spin, 50Q
  | 'special_relic'       // Void Merchant's Pact, 140Q
  | 'stokens'             // Buy Stokens with money
  | 'pcx_dmg_temp'        // 10-50% pcx damage for 1min
  | 'coupon_luck_perm'    // 100-3400% coupon luck perm
  | 'miner_speed_perm'    // 10-280% miner speed perm
  | 'miner_speed_temp'    // 10-280% miner speed for 3min
  | 'miner_dmg_perm'      // 10-400% miner damage perm
  | 'title_disgusting';   // "Disgusting" title with mega buffs

export interface WanderingTraderOffer {
  id: string;
  type: WanderingTraderOfferType;
  name: string;
  description: string;
  cost: WanderingTraderCost;
  effect: WanderingTraderEffect;
  variant?: number; // For offers with multiple variants (e.g., 10%, 20%, etc.)
}

export interface WanderingTraderCost {
  type: 'money' | 'trinkets' | 'all_money' | 'debuff' | 'free';
  amount?: number;           // For money costs
  trinketCount?: number;     // For trinket costs
  debuff?: {                 // For debuff costs
    type: 'clickSpeed';
    value: number;           // e.g., -0.11 = -11%
    duration: number;        // ms
  };
}

export interface WanderingTraderEffect {
  type: 'buff' | 'perm_buff' | 'roulette' | 'trinket' | 'stokens' | 'title';
  buffType?: 'money' | 'clickSpeed' | 'pcxDamage' | 'couponLuck' | 'minerSpeed' | 'minerDamage' | 'allStats';
  value?: number;            // Buff multiplier or Stoken amount
  duration?: number;         // For temporary buffs (ms)
  trinketId?: string;        // For trinket rewards
  titleId?: string;          // For title rewards
}

// Wandering Trader offer configurations with spawn chances
export const WANDERING_TRADER_OFFER_CONFIGS: {
  type: WanderingTraderOfferType;
  chance: number; // Relative weight (not percentage)
  variants?: number[]; // For offers with multiple tiers
}[] = [
  { type: 'empc_temp', chance: 18 },
  { type: 'empc_perm', chance: 23 },
  { type: 'cps_temp', chance: 25 },
  { type: 'roulette', chance: 15 },
  { type: 'special_relic', chance: 0.5 },
  { type: 'stokens', chance: 20 },
  { type: 'pcx_dmg_temp', chance: 60, variants: [10, 20, 30, 40, 50] },
  { type: 'coupon_luck_perm', chance: 80, variants: [100, 200, 300, 400, 500, 600, 1000, 2300, 2800, 3400] },
  { type: 'miner_speed_perm', chance: 40, variants: [10, 20, 40, 80, 120, 280] },
  { type: 'miner_speed_temp', chance: 40, variants: [10, 20, 40, 80, 120, 280] },
  { type: 'miner_dmg_perm', chance: 30, variants: [10, 15, 20, 25, 30, 35, 40, 45, 60, 70, 80, 90, 100, 300, 400] },
  { type: 'title_disgusting', chance: 0.05 },
];

// Price ranges for variable cost offers
export const WANDERING_TRADER_PRICES = {
  pcx_dmg_temp: { // 10-50% variants, base 200T for 50%
    10: 40e12,    // 40T
    20: 80e12,    // 80T
    30: 120e12,   // 120T
    40: 160e12,   // 160T
    50: 200e12,   // 200T
  } as Record<number, number>,
  coupon_luck_perm: { // 100-3400%, 300M for 100%, 21Q for 3400%
    100: 300e6,     // 300M
    200: 1e9,       // 1B
    300: 5e9,       // 5B
    400: 25e9,      // 25B
    500: 100e9,     // 100B
    600: 500e9,     // 500B
    1000: 2e12,     // 2T
    2300: 5e15,     // 5Q
    2800: 12e15,    // 12Q
    3400: 21e15,    // 21Q
  } as Record<number, number>,
  miner_speed_perm: { // 10-280%, 200B-31Q
    10: 200e9,      // 200B
    20: 500e9,      // 500B
    40: 2e12,       // 2T
    80: 10e12,      // 10T
    120: 100e12,    // 100T
    280: 31e15,     // 31Q
  } as Record<number, number>,
  miner_speed_temp: { // 10-280% for 3min, 100M-10Q
    10: 100e6,      // 100M
    20: 500e6,      // 500M
    40: 5e9,        // 5B
    80: 50e9,       // 50B
    120: 500e9,     // 500B
    280: 10e15,     // 10Q
  } as Record<number, number>,
  miner_dmg_perm: { // 10-400%, 100T-300QI
    10: 100e12,     // 100T
    15: 200e12,     // 200T
    20: 500e12,     // 500T
    25: 1e15,       // 1Q
    30: 2e15,       // 2Q
    35: 5e15,       // 5Q
    40: 10e15,      // 10Q
    45: 20e15,      // 20Q
    60: 50e15,      // 50Q
    70: 100e15,     // 100Q
    80: 200e15,     // 200Q
    90: 500e15,     // 500Q
    100: 1e18,      // 1QI
    300: 100e18,    // 100QI
    400: 300e18,    // 300QI
  } as Record<number, number>,
  roulette: 50e15,        // 50Q
  special_relic: 140e15,  // 140Q
};

// Stokens pricing based on money magnitude
export const STOKENS_PRICING = {
  K: { min: 1e3, max: 1e6, stokens: 1 },       // Thousands = 1 Stoken
  M: { min: 1e6, max: 1e9, stokens: 2 },       // Millions = 2 Stokens
  B: { min: 1e9, max: 1e12, stokens: 3 },      // Billions = 3 Stokens
  T: { min: 1e12, max: 1e15, stokens: 7 },     // Trillions = 7 Stokens
  Q: { min: 1e15, max: 1e18, stokens: 10 },    // Quadrillions = 10 Stokens
  QI: { min: 1e18, max: Infinity, stokens: 13 }, // Quintillions = 13 Stokens
};

// Roulette wheel segments
export type RouletteSegment = 
  | 'nothing'
  | 'special_trinket'
  | 'money_loss'
  | 'prestige_tokens'
  | 'stokens';

export interface RouletteResult {
  segment: RouletteSegment;
  value?: number;      // Amount for tokens/stokens
  trinketId?: string;  // For special trinket
}

export const ROULETTE_SEGMENTS: { segment: RouletteSegment; weight: number; value?: number }[] = [
  { segment: 'nothing', weight: 1 },
  { segment: 'nothing', weight: 1 },
  { segment: 'nothing', weight: 1 },
  { segment: 'nothing', weight: 1 },
  { segment: 'special_trinket', weight: 1 },
  { segment: 'money_loss', weight: 1, value: 0.80 }, // Lose 80% of money
  { segment: 'prestige_tokens', weight: 1, value: 10 },
  { segment: 'stokens', weight: 1, value: 5 },
];

// Generate random spawn time for Wandering Trader
export function getWanderingTraderNextSpawn(): number {
  return Date.now() + WANDERING_TRADER_MIN_SPAWN + 
    Math.random() * (WANDERING_TRADER_MAX_SPAWN - WANDERING_TRADER_MIN_SPAWN);
}

// Generate random offers for Wandering Trader shop
// offerCount: number of offers to generate (default 3, deal level 1 = 6, deal level 2/3 = 10)
// rareChanceMultiplier: multiplier for rare offer chances (1 = normal, 0.5 = suspicious)
export function generateWanderingTraderOffers(offerCount: number = 3, rareChanceMultiplier: number = 1): WanderingTraderOffer[] {
  const offers: WanderingTraderOffer[] = [];
  const usedTypes = new Set<string>();
  
  // Adjust weights for rare offers based on multiplier
  const adjustedConfigs = WANDERING_TRADER_OFFER_CONFIGS.map(config => {
    // Rare offers: special_relic, title_disgusting, roulette, stokens
    const isRare = ['special_relic', 'title_disgusting', 'roulette', 'stokens'].includes(config.type);
    return {
      ...config,
      chance: isRare ? config.chance * rareChanceMultiplier : config.chance,
    };
  });
  
  // Calculate total weight
  const totalWeight = adjustedConfigs.reduce((sum, c) => sum + c.chance, 0);
  
  while (offers.length < offerCount && offers.length < 15) { // Cap at 15 to prevent infinite loop
    // Weighted random selection
    let roll = Math.random() * totalWeight;
    let selected: typeof adjustedConfigs[0] | null = null;
    
    for (const config of adjustedConfigs) {
      roll -= config.chance;
      if (roll <= 0) {
        selected = config;
        break;
      }
    }
    
    if (!selected) selected = adjustedConfigs[0];
    
    // Pick a variant if applicable
    const variant = selected.variants 
      ? selected.variants[Math.floor(Math.random() * selected.variants.length)]
      : undefined;
    
    // Create unique key to avoid duplicates
    const uniqueKey = variant !== undefined ? `${selected.type}_${variant}` : selected.type;
    if (usedTypes.has(uniqueKey)) continue;
    usedTypes.add(uniqueKey);
    
    // Generate the offer
    const offer = createWanderingTraderOffer(selected.type as WanderingTraderOfferType, variant);
    if (offer) offers.push(offer);
  }
  
  return offers;
}

// Create a specific offer based on type and variant
export function createWanderingTraderOffer(
  type: WanderingTraderOfferType, 
  variant?: number
): WanderingTraderOffer | null {
  const id = `wt_${type}_${variant || ''}_${Date.now()}`;
  
  switch (type) {
    case 'empc_temp':
      return {
        id,
        type,
        name: '+10% Money/Click (1min)',
        description: 'Earn 10% more money per click for 1 minute. WARNING: -11% click speed!',
        cost: { type: 'debuff', debuff: { type: 'clickSpeed', value: -0.11, duration: 60000 } },
        effect: { type: 'buff', buffType: 'money', value: 0.10, duration: 60000 },
      };
      
    case 'empc_perm':
      return {
        id,
        type,
        name: '+40% Money/Click (PERM)',
        description: 'Permanently earn 40% more money per click. Cost: ALL YOUR MONEY!',
        cost: { type: 'all_money' },
        effect: { type: 'perm_buff', buffType: 'money', value: 0.40 },
      };
      
    case 'cps_temp':
      return {
        id,
        type,
        name: '+50% Click Speed (2min)',
        description: 'Click 50% faster for 2 minutes. Cost: Give away 2 trinkets!',
        cost: { type: 'trinkets', trinketCount: 2 },
        effect: { type: 'buff', buffType: 'clickSpeed', value: 0.50, duration: 120000 },
      };
      
    case 'roulette':
      return {
        id,
        type,
        name: '🎰 Roulette Spin',
        description: 'Spin the wheel of fortune! Win special trinkets, tokens, or... nothing.',
        cost: { type: 'money', amount: WANDERING_TRADER_PRICES.roulette },
        effect: { type: 'roulette' },
      };
      
    case 'special_relic':
      return {
        id,
        type,
        name: '🌀 Void Merchant\'s Pact',
        description: '+100% money, click speed, and mega building buffs! (Pre-converted Talisman)',
        cost: { type: 'money', amount: WANDERING_TRADER_PRICES.special_relic },
        effect: { type: 'trinket', trinketId: 'void_merchants_pact' },
      };
      
    case 'stokens': {
      // Random money amount in various magnitudes
      const magnitudes = Object.entries(STOKENS_PRICING);
      const [, pricing] = magnitudes[Math.floor(Math.random() * magnitudes.length)];
      const amount = pricing.min + Math.random() * (Math.min(pricing.max, pricing.min * 1000) - pricing.min);
      return {
        id,
        type,
        name: `💎 ${pricing.stokens} Stokens`,
        description: `Purchase ${pricing.stokens} Stokens for use in special shops.`,
        cost: { type: 'money', amount },
        effect: { type: 'stokens', value: pricing.stokens },
      };
    }
      
    case 'pcx_dmg_temp':
      if (!variant) return null;
      return {
        id,
        type,
        name: `+${variant}% Pickaxe Damage (1min)`,
        description: `Boost pickaxe damage by ${variant}% for 1 minute.`,
        cost: { type: 'money', amount: WANDERING_TRADER_PRICES.pcx_dmg_temp[variant] || 100e12 },
        effect: { type: 'buff', buffType: 'pcxDamage', value: variant / 100, duration: 60000 },
        variant,
      };
      
    case 'coupon_luck_perm':
      if (!variant) return null;
      return {
        id,
        type,
        name: `+${variant}% Coupon Luck (PERM)`,
        description: `Permanently increase coupon drop rate by ${variant}%!`,
        cost: { type: 'money', amount: WANDERING_TRADER_PRICES.coupon_luck_perm[variant] || 1e9 },
        effect: { type: 'perm_buff', buffType: 'couponLuck', value: variant / 100 },
        variant,
      };
      
    case 'miner_speed_perm':
      if (!variant) return null;
      return {
        id,
        type,
        name: `+${variant}% Miner Speed (PERM)`,
        description: `Permanently increase miner tick speed by ${variant}%!`,
        cost: { type: 'money', amount: WANDERING_TRADER_PRICES.miner_speed_perm[variant] || 1e12 },
        effect: { type: 'perm_buff', buffType: 'minerSpeed', value: variant / 100 },
        variant,
      };
      
    case 'miner_speed_temp':
      if (!variant) return null;
      return {
        id,
        type,
        name: `+${variant}% Miner Speed (3min)`,
        description: `Boost miner speed by ${variant}% for 3 minutes.`,
        cost: { type: 'money', amount: WANDERING_TRADER_PRICES.miner_speed_temp[variant] || 1e9 },
        effect: { type: 'buff', buffType: 'minerSpeed', value: variant / 100, duration: 180000 },
        variant,
      };
      
    case 'miner_dmg_perm':
      if (!variant) return null;
      return {
        id,
        type,
        name: `+${variant}% Miner Damage (PERM)`,
        description: `Permanently increase miner damage by ${variant}%! (Applies to Mines too)`,
        cost: { type: 'money', amount: WANDERING_TRADER_PRICES.miner_dmg_perm[variant] || 1e15 },
        effect: { type: 'perm_buff', buffType: 'minerDamage', value: variant / 100 },
        variant,
      };
      
    case 'title_disgusting':
      return {
        id,
        type,
        name: '🤮 Title: "Disgusting"',
        description: 'Trading with a Wandering Trader??? EWW! (+81% miner stats, +41% click/pcx, +65% money)',
        cost: { type: 'free' },
        effect: { type: 'title', titleId: 'disgusting' },
      };
      
    default:
      return null;
  }
}

// =====================
// STOKEN STORE & LOTTERY STORE DEFINITIONS
// =====================

export type StoreCurrency = 'stokens' | 'lottery_tickets';

export type StoreItemCategory = 
  | 'currency_exchange'
  | 'pickaxe'
  | 'trinket'
  | 'building'
  | 'prestige_tokens'
  | 'prestige'
  | 'money'
  | 'boost'
  | 'miners'
  | 'autoclicker'
  | 'rock_skip'
  | 'achievement'
  | 'coupons';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: StoreItemCategory;
  price: number;                    // Price in the store's currency
  currency: StoreCurrency;
  // What the item gives
  effect: {
    type: 'give_pickaxe' | 'give_trinket' | 'give_building' | 'give_prestige_tokens' 
        | 'give_prestige' | 'give_money' | 'give_boost' | 'give_miners' | 'give_autoclicker' 
        | 'give_rock_skip' | 'give_achievement' | 'give_coupons' | 'give_currency';
    pickaxeId?: number;
    trinketId?: string;
    buildingType?: string;
    amount?: number;
    boostType?: string;
    boostDuration?: number;         // In seconds
    boostMultiplier?: number;
    couponType?: 'discount30' | 'discount50' | 'discount100';
    targetCurrency?: StoreCurrency;
  };
  // Restrictions
  requiresPath?: 'light' | 'darkness';
  oneTimePurchase?: boolean;
}

// Helper to generate pickaxe store items for a currency
function generatePickaxeStoreItems(currency: StoreCurrency): StoreItem[] {
  // Stoken prices: 1-10 scaling | Lottery prices: 100-2500 scaling
  const priceMap: Record<StoreCurrency, number[]> = {
    stokens: [1,1,1,1,2,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,10,10,10],
    lottery_tickets: [100,120,150,180,220,280,350,420,500,600,720,850,1000,1150,1300,1500,1650,1800,1950,2100,2200,2300,2400,2450,2500],
  };
  const prices = priceMap[currency];
  // Pickaxe IDs 1-25 (26=Yates is in the regular PCX shop for 10QI)
  return Array.from({ length: 25 }, (_, i) => ({
    id: `${currency}_pcx_${i + 1}`,
    name: `Pickaxe #${i + 1}`,
    description: `Buy pickaxe tier ${i + 1} directly`,
    category: 'pickaxe' as StoreItemCategory,
    price: prices[i],
    currency,
    effect: { type: 'give_pickaxe' as const, pickaxeId: i + 1 },
    requiresPath: [18, 21, 25].includes(i + 1) ? 'darkness' as const : [22, 23].includes(i + 1) ? 'light' as const : undefined,
  }));
}

// Helper to generate trinket store items for a currency
function generateTrinketStoreItems(currency: StoreCurrency): StoreItem[] {
  const trinketIds = [
    'avatar_ring', 'rainbow_collar', 'cosmic_crown', 'totem', 'spike',
    'elder_ring', 'dream_collar', 'earth_ball', 'solar_collar',
    'miners_lucky_charm', 'ancient_compass', 'eternal_hourglass',
    'dragon_scale', 'obsidian_heart', 'crystal_prism', 'phoenix_feather', 'void_stone',
  ];
  // Stoken prices by rarity (1-12) | Lottery (100-999)
  const priceMap: Record<StoreCurrency, number[]> = {
    stokens: [1, 2, 3, 4, 3, 10, 5, 4, 4, 2, 3, 3, 5, 6, 6, 8, 9],
    lottery_tickets: [100, 200, 350, 450, 300, 800, 500, 400, 400, 200, 300, 350, 500, 650, 650, 850, 999],
  };
  const prices = priceMap[currency];
  return trinketIds.map((id, i) => ({
    id: `${currency}_trinket_${id}`,
    name: `Trinket: ${id.replace(/_/g, ' ')}`,
    description: `Buy the ${id.replace(/_/g, ' ')} trinket directly`,
    category: 'trinket' as StoreItemCategory,
    price: prices[i],
    currency,
    effect: { type: 'give_trinket' as const, trinketId: id },
  }));
}

// Secret/Mythic trinket prices
function generateSecretTrinketStoreItems(currency: StoreCurrency): StoreItem[] {
  const items: { id: string; name: string; price: Record<StoreCurrency, number> }[] = [
    { id: 'yates_totem', name: 'Yates Totem', price: { stokens: 150, lottery_tickets: 674121 } },
    { id: 'silver_trophy', name: 'Mythic Trophy (Nrahgrvaths)', price: { stokens: 60, lottery_tickets: 7000 } },
    { id: 'golden_trophy', name: 'Secret Trophy (Arghtfavts)', price: { stokens: 100, lottery_tickets: 7777 } },
    { id: 'fortunes_gambit', name: "Fortune's Gambit (Roulette)", price: { stokens: 130, lottery_tickets: 8823 } },
    { id: 'void_merchants_pact', name: "Void Merchant's Pact", price: { stokens: 141, lottery_tickets: 9999 } },
  ];
  return items.map(item => ({
    id: `${currency}_secret_${item.id}`,
    name: item.name,
    description: `Buy the ultra-rare ${item.name} directly`,
    category: 'trinket' as StoreItemCategory,
    price: item.price[currency],
    currency,
    effect: { type: 'give_trinket' as const, trinketId: item.id },
  }));
}

// Generate building store items
function generateBuildingStoreItems(currency: StoreCurrency): StoreItem[] {
  const buildings: { type: string; name: string; priceS: number; priceL: number; path?: 'light' | 'darkness' }[] = [
    { type: 'mine', name: 'Mine', priceS: 1, priceL: 500 },
    { type: 'bank', name: 'Bank', priceS: 5, priceL: 2000 },
    { type: 'factory', name: 'Factory', priceS: 3, priceL: 1500 },
    { type: 'temple', name: 'Temple', priceS: 10, priceL: 5000, path: 'light' },
    { type: 'wizard_tower', name: 'Wizard Tower', priceS: 10, priceL: 5000, path: 'darkness' },
    { type: 'shipment', name: 'Shipment', priceS: 25, priceL: 20000 },
  ];
  return buildings.map(b => ({
    id: `${currency}_building_${b.type}`,
    name: b.name,
    description: `Buy a ${b.name} building`,
    category: 'building' as StoreItemCategory,
    price: currency === 'stokens' ? b.priceS : b.priceL,
    currency,
    effect: { type: 'give_building' as const, buildingType: b.type },
    requiresPath: b.path,
  }));
}

// Generate all store items for a given currency
export function getStoreItems(currency: StoreCurrency): StoreItem[] {
  const isS = currency === 'stokens';
  const items: StoreItem[] = [];

  // Currency exchange
  items.push({
    id: `${currency}_exchange`,
    name: isS ? 'Buy Lottery Tickets' : 'Buy Stokens',
    description: isS ? 'Convert Stokens to Lottery Tickets' : 'Convert Lottery Tickets to Stokens',
    category: 'currency_exchange',
    price: isS ? 2 : 120,
    currency,
    effect: {
      type: 'give_currency',
      targetCurrency: isS ? 'lottery_tickets' : 'stokens',
      amount: isS ? 100 : 1,
    },
  });

  // Pickaxes
  items.push(...generatePickaxeStoreItems(currency));
  // Trinkets
  items.push(...generateTrinketStoreItems(currency));
  // Secret/Mythic trinkets
  items.push(...generateSecretTrinketStoreItems(currency));
  // Buildings
  items.push(...generateBuildingStoreItems(currency));

  // Prestige Tokens (tiered)
  const ptTiers = isS
    ? [{ amount: 1, price: 1 }, { amount: 5, price: 4 }, { amount: 10, price: 7 }, { amount: 25, price: 15 }, { amount: 50, price: 25 }]
    : [{ amount: 1, price: 100 }, { amount: 5, price: 450 }, { amount: 10, price: 800 }];
  ptTiers.forEach(t => items.push({
    id: `${currency}_pt_${t.amount}`,
    name: `${t.amount} Prestige Token${t.amount > 1 ? 's' : ''}`,
    description: `Get ${t.amount} prestige token${t.amount > 1 ? 's' : ''} instantly`,
    category: 'prestige_tokens',
    price: t.price,
    currency,
    effect: { type: 'give_prestige_tokens', amount: t.amount },
  }));

  // Instant prestige (no reset)
  items.push({
    id: `${currency}_prestige`,
    name: '+1 Prestige (No Reset)',
    description: 'Gain +1 prestige count without resetting anything',
    category: 'prestige',
    price: isS ? 7 : 2000,
    currency,
    effect: { type: 'give_prestige', amount: 1 },
  });

  // Money tiers
  const moneyTiers = isS
    ? [{ amount: 1e6, price: 1 }, { amount: 1e9, price: 3 }, { amount: 1e12, price: 10 }, { amount: 1e15, price: 50 }, { amount: 1e18, price: 200 }]
    : [{ amount: 1e6, price: 10 }, { amount: 1e9, price: 100 }, { amount: 1e12, price: 1000 }, { amount: 1e15, price: 50000 }, { amount: 1e18, price: 2000000 }];
  moneyTiers.forEach(t => {
    const label = t.amount >= 1e18 ? `$${(t.amount/1e18)}Qi` : t.amount >= 1e15 ? `$${(t.amount/1e15)}Q` : t.amount >= 1e12 ? `$${(t.amount/1e12)}T` : t.amount >= 1e9 ? `$${(t.amount/1e9)}B` : `$${(t.amount/1e6)}M`;
    items.push({
      id: `${currency}_money_${t.amount}`,
      name: label,
      description: `Instantly receive ${label}`,
      category: 'money',
      price: t.price,
      currency,
      effect: { type: 'give_money', amount: t.amount },
    });
  });

  // Boosts
  const boosts = isS
    ? [
        { id: 'money_surge', name: 'Money Surge', desc: '+50% money for 5 min', price: 5, boostType: 'money', mult: 0.5, dur: 300 },
        { id: 'click_frenzy', name: 'Click Frenzy', desc: '+80% click power for 3 min', price: 10, boostType: 'click', mult: 0.8, dur: 180 },
        { id: 'miner_overdrive', name: 'Miner Overdrive', desc: '+60% miner speed/dmg for 5 min', price: 15, boostType: 'miner', mult: 0.6, dur: 300 },
        { id: 'prestige_boost', name: 'Prestige Booster', desc: '+30% PT on next prestige', price: 25, boostType: 'prestige', mult: 0.3, dur: 0 },
      ]
    : [
        { id: 'money_surge', name: 'Money Surge', desc: '+50% money for 5 min', price: 500, boostType: 'money', mult: 0.5, dur: 300 },
        { id: 'click_frenzy', name: 'Click Frenzy', desc: '+80% click power for 3 min', price: 1000, boostType: 'click', mult: 0.8, dur: 180 },
        { id: 'miner_overdrive', name: 'Miner Overdrive', desc: '+60% miner speed/dmg for 5 min', price: 1500, boostType: 'miner', mult: 0.6, dur: 300 },
        { id: 'prestige_boost', name: 'Prestige Booster', desc: '+30% PT on next prestige', price: 2500, boostType: 'prestige', mult: 0.3, dur: 0 },
      ];
  boosts.forEach(b => items.push({
    id: `${currency}_boost_${b.id}`,
    name: b.name,
    description: b.desc,
    category: 'boost',
    price: b.price,
    currency,
    effect: { type: 'give_boost', boostType: b.boostType, boostMultiplier: b.mult, boostDuration: b.dur },
  }));

  // Miners (tiered)
  const minerTiers = isS
    ? [{ amount: 1, price: 1 }, { amount: 10, price: 3 }, { amount: 50, price: 7 }, { amount: 100, price: 10 }]
    : [{ amount: 1, price: 100 }, { amount: 10, price: 300 }, { amount: 50, price: 600 }, { amount: 100, price: 1000 }];
  minerTiers.forEach(t => items.push({
    id: `${currency}_miners_${t.amount}`,
    name: `+${t.amount} Miner${t.amount > 1 ? 's' : ''}`,
    description: `Instantly hire ${t.amount} miner${t.amount > 1 ? 's' : ''}`,
    category: 'miners',
    price: t.price,
    currency,
    effect: { type: 'give_miners', amount: t.amount },
  }));

  // Autoclicker
  items.push({
    id: `${currency}_autoclicker`,
    name: 'Autoclicker',
    description: 'Buy the autoclicker (10 clicks/sec)',
    category: 'autoclicker',
    price: isS ? 10 : 1000,
    currency,
    effect: { type: 'give_autoclicker' },
    oneTimePurchase: true,
  });

  // Rock skips — price scales by current rock number
  const rockSkipPrices = isS ? [1, 5, 20] : [234, 500, 1837];
  [1, 5, -1].forEach((skip, i) => items.push({
    id: `${currency}_rockskip_${skip === -1 ? 'max' : skip}`,
    name: skip === -1 ? 'Skip to Max Rock' : `Skip +${skip} Rock${skip > 1 ? 's' : ''}`,
    description: skip === -1 ? 'Jump to highest unlocked rock' : `Skip ahead ${skip} rock${skip > 1 ? 's' : ''}`,
    category: 'rock_skip',
    price: rockSkipPrices[i],
    currency,
    effect: { type: 'give_rock_skip', amount: skip },
  }));

  // Achievements
  items.push({
    id: `${currency}_achievement`,
    name: 'Unlock Any Achievement',
    description: 'Pick any achievement to unlock',
    category: 'achievement',
    price: isS ? 13 : 500,
    currency,
    effect: { type: 'give_achievement' },
  });

  // Lottery Tickets (rebranded from coupons)
  const lotteryTiers = isS
    ? [{ amount: 50, price: 1 }, { amount: 200, price: 3 }, { amount: 500, price: 8 }]
    : [{ amount: 50, price: 50 }, { amount: 200, price: 150 }, { amount: 500, price: 400 }];
  lotteryTiers.forEach(t => items.push({
    id: `${currency}_lottery_${t.amount}`,
    name: `${t.amount}x Lottery Tickets`,
    description: `Get ${t.amount} lottery tickets`,
    category: 'coupons',
    price: t.price,
    currency,
    effect: { type: 'give_coupons', couponType: 'discount30', amount: t.amount },
  }));

  return items;
}

// Spin the roulette and get result
export function spinRoulette(): RouletteResult {
  const totalWeight = ROULETTE_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;
  
  for (const segment of ROULETTE_SEGMENTS) {
    roll -= segment.weight;
    if (roll <= 0) {
      if (segment.segment === 'special_trinket') {
        return { segment: segment.segment, trinketId: 'fortunes_gambit' };
      }
      return { segment: segment.segment, value: segment.value };
    }
  }
  
  return { segment: 'nothing' };
}