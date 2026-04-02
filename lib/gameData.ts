import { 
  Pickaxe, 
  Rock, 
  Building,
  BuildingType,
  HARD_MODE_PRESTIGE_THRESHOLD, 
  HARD_MODE_MULTIPLIER,
  BUILDINGS,
  PROGRESSIVE_UPGRADES,
  POWERUPS,
  ProgressiveUpgrade,
  Powerup,
  PowerupType,
  ProgressiveUpgradeType,
} from '@/types/game';

// Re-export building and upgrade data for convenience
export { BUILDINGS, PROGRESSIVE_UPGRADES, POWERUPS } from '@/types/game';

export const PICKAXES: Pickaxe[] = [
  {
    id: 1,
    name: 'Wood',
    image: '/game/pickaxes/woodp.png',
    price: 0,
    clickPower: 1,
  },
  {
    id: 2,
    name: 'Stone',
    image: '/game/pickaxes/stonep.png',
    price: 120,
    clickPower: 3,
  },
  {
    id: 3,
    name: 'Bronze',
    image: '/game/pickaxes/bronzep.png',
    price: 400,
    clickPower: 6,
  },
  {
    id: 4,
    name: 'Copper',
    image: '/game/pickaxes/copperp.png',
    price: 1200,
    clickPower: 12,
  },
  {
    id: 5,
    name: 'Iron',
    image: '/game/pickaxes/ironp.png',
    price: 3500,
    clickPower: 22,
  },
  {
    id: 6,
    name: 'Steel',
    image: '/game/pickaxes/steelp.png',
    price: 9000,
    clickPower: 40,
  },
  {
    id: 7,
    name: 'Silver',
    image: '/game/pickaxes/silverp.png',
    price: 22000,
    clickPower: 70,
  },
  {
    id: 8,
    name: 'Gold',
    image: '/game/pickaxes/goldp.png',
    price: 55000,
    clickPower: 120,
    specialAbility: 'Click 2x faster, but weaker',
  },
  {
    id: 9,
    name: 'Platinum',
    image: '/game/pickaxes/platinump.png',
    price: 140000,
    clickPower: 200,
  },
  {
    id: 10,
    name: 'Diamond',
    image: '/game/pickaxes/diamondp.png',
    price: 350000,
    clickPower: 350,
  },
  {
    id: 11,
    name: 'Obsidian',
    image: '/game/pickaxes/obsidianp.png',
    price: 850000,
    clickPower: 600,
  },
  {
    id: 12,
    name: 'Alexandrite',
    image: '/game/pickaxes/alexandritep.png',
    price: 2200000,
    clickPower: 1000,
    moneyMultiplier: 1.3,
    specialAbility: 'Gives 30% more money',
  },
  {
    id: 13,
    name: 'Opal',
    image: '/game/pickaxes/opalp.png',
    price: 6000000,
    clickPower: 1800,
    couponLuckBonus: 0.15,
    specialAbility: '15% more coupon luck',
  },
  {
    id: 14,
    name: 'Doge',
    image: '/game/pickaxes/dogep.png',
    price: 18000000,
    clickPower: 3500,
    moneyMultiplier: 2,
    specialAbility: '2x money',
  },
  {
    id: 15,
    name: 'Miner',
    image: '/game/pickaxes/minerpcx.png',
    price: 150000000,
    clickPower: 5000,
  },
  {
    id: 16,
    name: 'Pin',
    image: '/game/pickaxes/pinpcx.png',
    price: 300000000,
    clickPower: 8000,
  },
  {
    id: 17,
    name: 'Heavens',
    image: '/game/pickaxes/heavenspcx.png',
    price: 600000000,
    clickPower: 12000,
    specialAbility: '+50% miner speed (10min cooldown)',
    activeAbility: {
      id: 'heavens_boost',
      name: 'Divine Speed',
      description: '+50% miner speed for 2 min',
      icon: '👼',
      duration: 2 * 60 * 1000, // 2 minutes
      cooldown: 10 * 60 * 1000, // 10 minutes
      cost: 5000000, // $5M
      effect: { type: 'miner_speed', value: 0.5 },
    },
  },
  {
    id: 18,
    name: 'Demon',
    image: '/game/pickaxes/demonspcx.png',
    price: 1200000000,
    clickPower: 18000,
    specialAbility: '200% pickaxe damage for 1 minute',
    activeAbility: {
      id: 'demon_rage',
      name: 'Demon Rage',
      description: '3x pickaxe damage for 1 min',
      icon: '😈',
      duration: 60 * 1000, // 1 minute
      cooldown: 5 * 60 * 1000, // 5 minutes
      cost: 10000000, // $10M
      effect: { type: 'damage_boost', value: 3 },
    },
  },
  {
    id: 19,
    name: 'Nuclear',
    image: '/game/pickaxes/nuclearpcx.png',
    price: 2500000000,
    clickPower: 25000,
    specialAbility: '6 second charge, instant break',
    activeAbility: {
      id: 'nuclear_blast',
      name: 'Nuclear Blast',
      description: 'Instant break current rock',
      icon: '☢️',
      duration: 0, // instant
      cooldown: 30 * 1000, // 30 seconds
      cost: 2000000, // $2M
      effect: { type: 'instant_break', value: 1 },
    },
  },
  {
    id: 20,
    name: 'Laser',
    image: '/game/pickaxes/laserpcx.png',
    price: 5000000000,
    clickPower: 35000,
  },
  {
    id: 21,
    name: 'Nightmare',
    image: '/game/pickaxes/nightmarepcx.png',
    price: 10000000000,
    clickPower: 50000,
    specialAbility: '+15% everything for 30s (5min cooldown)',
    activeAbility: {
      id: 'nightmare_aura',
      name: 'Nightmare Aura',
      description: '+15% to everything for 30s',
      icon: '🌙',
      duration: 30 * 1000, // 30 seconds
      cooldown: 5 * 60 * 1000, // 5 minutes
      cost: 25000000, // $25M
      effect: { type: 'all_boost', value: 0.15 },
    },
  },
  {
    id: 22,
    name: 'Sun',
    image: '/game/pickaxes/sunpcx.png',
    price: 20000000000,
    clickPower: 70000,
    moneyMultiplier: 1.5,
    specialAbility: '+50% money',
  },
  {
    id: 23,
    name: 'Light Saber',
    image: '/game/pickaxes/lightsaberpcx.png',
    price: 40000000000,
    clickPower: 100000,
  },
  {
    id: 24,
    name: 'Plasma',
    image: '/game/pickaxes/plasmap.png',
    price: 80000000000,
    clickPower: 120000, // Weaker than Galaxy
    moneyMultiplier: 1.20,
    specialAbility: '+20% money',
  },
  {
    id: 25,
    name: 'Galaxy',
    image: '/game/pickaxes/galaxypcx.png',
    price: 150000000000,
    clickPower: 180000, // Strongest purchasable
    moneyMultiplier: 1.45,
    specialAbility: '+45% to everything (Darkness)',
  },
  // === SPECIAL PICKAXES ===
  {
    id: 26,
    name: 'Yates',
    image: '/game/pickaxes/yatespcx.png',
    price: 10000000000000000, // 10QI
    clickPower: 500000,
    moneyMultiplier: 3.0,
    specialAbility: '3x money',
  },
];

export const ROCKS: Rock[] = [
  {
    id: 1,
    name: 'Coal',
    image: '/game/rocks/coal.webp',
    clicksToBreak: 8,
    moneyPerBreak: 10,
    moneyPerClick: 5,
    unlockAtClicks: 0,
  },
  {
    id: 2,
    name: 'Stone',
    image: '/game/rocks/stone.png',
    clicksToBreak: 20,
    moneyPerBreak: 25,
    moneyPerClick: 10,
    unlockAtClicks: 80,
  },
  {
    id: 3,
    name: 'Copper',
    image: '/game/rocks/copper.png',
    clicksToBreak: 40,
    moneyPerBreak: 50,
    moneyPerClick: 18,
    unlockAtClicks: 250,
  },
  {
    id: 4,
    name: 'Silver',
    image: '/game/rocks/silver.png',
    clicksToBreak: 80,
    moneyPerBreak: 100,
    moneyPerClick: 30,
    unlockAtClicks: 500,
  },
  {
    id: 5,
    name: 'Iron',
    image: '/game/rocks/iron.png',
    clicksToBreak: 150,
    moneyPerBreak: 200,
    moneyPerClick: 50,
    unlockAtClicks: 1000,
  },
  {
    id: 6,
    name: 'Fools Gold',
    image: '/game/rocks/foolsgoldrock.png',
    clicksToBreak: 250,
    moneyPerBreak: 400,
    moneyPerClick: 90,
    unlockAtClicks: 2000,
  },
  {
    id: 7,
    name: 'Diamond',
    image: '/game/rocks/diamond.png',
    clicksToBreak: 400,
    moneyPerBreak: 800,
    moneyPerClick: 160,
    unlockAtClicks: 4000,
  },
  // --- 7 ROCK MARK (Coupons start dropping) ---
  {
    id: 8,
    name: 'Platinum',
    image: '/game/rocks/platinum.png',
    clicksToBreak: 600,
    moneyPerBreak: 1500,
    moneyPerClick: 280,
    unlockAtClicks: 7500,
  },
  {
    id: 9,
    name: 'Uranium',
    image: '/game/rocks/uranium.png',
    clicksToBreak: 900,
    moneyPerBreak: 2500,
    moneyPerClick: 450,
    unlockAtClicks: 12000,
  },
  {
    id: 10,
    name: 'Titanium',
    image: '/game/rocks/titanium.png',
    clicksToBreak: 1400,
    moneyPerBreak: 4500,
    moneyPerClick: 700,
    unlockAtClicks: 20000,
  },
  {
    id: 11,
    name: 'Obsidian',
    image: '/game/rocks/obsidian.png',
    clicksToBreak: 2000,
    moneyPerBreak: 7500,
    moneyPerClick: 1100,
    unlockAtClicks: 35000,
  },
  {
    id: 12,
    name: 'Ruby',
    image: '/game/rocks/ruby.png',
    clicksToBreak: 3000,
    moneyPerBreak: 12000,
    moneyPerClick: 1700,
    unlockAtClicks: 55000,
  },
  // --- 12 ROCK MARK (Products unlock in shop) ---
  {
    id: 13,
    name: 'Sapphire',
    image: '/game/rocks/sapphire.png',
    clicksToBreak: 4500,
    moneyPerBreak: 18000,
    moneyPerClick: 2600,
    unlockAtClicks: 85000,
  },
  {
    id: 14,
    name: 'Emerald',
    image: '/game/rocks/emerald.png',
    clicksToBreak: 6500,
    moneyPerBreak: 28000,
    moneyPerClick: 4000,
    unlockAtClicks: 130000,
  },
  {
    id: 15,
    name: 'Amethyst',
    image: '/game/rocks/amethyst.png',
    clicksToBreak: 9000,
    moneyPerBreak: 45000,
    moneyPerClick: 6000,
    unlockAtClicks: 200000,
  },
  // --- ENDGAME ROCKS (16-19) ---
  {
    id: 16,
    name: 'Bismuth',
    image: '/game/rocks/bismuth.png',
    clicksToBreak: 13000,
    moneyPerBreak: 75000,
    moneyPerClick: 9000,
    unlockAtClicks: 300000,
  },
  {
    id: 17,
    name: 'Bornite',
    image: '/game/rocks/bornite.png',
    clicksToBreak: 18000,
    moneyPerBreak: 120000,
    moneyPerClick: 14000,
    unlockAtClicks: 450000,
  },
  {
    id: 18,
    name: 'Azurite',
    image: '/game/rocks/azurite.png',
    clicksToBreak: 25000,
    moneyPerBreak: 200000,
    moneyPerClick: 22000,
    unlockAtClicks: 700000,
  },
  {
    id: 19,
    name: 'Titanium Quartz',
    image: '/game/rocks/titaniumquartz.png',
    clicksToBreak: 35000,
    moneyPerBreak: 350000,
    moneyPerClick: 35000,
    unlockAtClicks: 1000000,
  },
  // --- NEW ENDGAME ROCKS (20-29) ---
  {
    id: 20,
    name: 'Angel',
    image: '/game/rocks/angelrock.png',
    clicksToBreak: 50000,
    moneyPerBreak: 600000,
    moneyPerClick: 50000,
    unlockAtClicks: 1500000,
  },
  {
    id: 21,
    name: 'Devil',
    image: '/game/rocks/devilrock.png',
    clicksToBreak: 70000,
    moneyPerBreak: 1000000,
    moneyPerClick: 70000,
    unlockAtClicks: 2200000,
  },
  {
    id: 22,
    name: 'Shiny Copper',
    image: '/game/rocks/shinycopperrock.png',
    clicksToBreak: 100000,
    moneyPerBreak: 1600000,
    moneyPerClick: 100000,
    unlockAtClicks: 3200000,
  },
  {
    id: 23,
    name: 'Fools Rainbow',
    image: '/game/rocks/foolsrainbowrock.png',
    clicksToBreak: 140000,
    moneyPerBreak: 2500000,
    moneyPerClick: 140000,
    unlockAtClicks: 4500000,
  },
  {
    id: 24,
    name: 'Moon',
    image: '/game/rocks/Moonsrock.png',
    clicksToBreak: 200000,
    moneyPerBreak: 4000000,
    moneyPerClick: 200000,
    unlockAtClicks: 6500000,
  },
  {
    id: 25,
    name: 'Jackeryt',
    image: '/game/rocks/Jackerytyrock.png',
    clicksToBreak: 280000,
    moneyPerBreak: 6500000,
    moneyPerClick: 280000,
    unlockAtClicks: 9000000,
  },
  {
    id: 26,
    name: 'Purplislite',
    image: '/game/rocks/Purplisliterock.png',
    clicksToBreak: 400000,
    moneyPerBreak: 10000000,
    moneyPerClick: 400000,
    unlockAtClicks: 13000000,
  },
  {
    id: 27,
    name: 'Gold',
    image: '/game/rocks/gold.png',
    clicksToBreak: 600000,
    moneyPerBreak: 16000000,
    moneyPerClick: 600000,
    unlockAtClicks: 18000000,
  },
  {
    id: 28,
    name: 'Lapis Lazulli',
    image: '/game/rocks/lapislazulli.png',
    clicksToBreak: 850000,
    moneyPerBreak: 25000000,
    moneyPerClick: 850000,
    unlockAtClicks: 25000000,
  },
  {
    id: 29,
    name: 'Lotus Crystal',
    image: '/game/rocks/Lotuscrystalrock.png',
    clicksToBreak: 1200000,
    moneyPerBreak: 40000000,
    moneyPerClick: 1200000,
    unlockAtClicks: 35000000,
  },
];

export const getPickaxeById = (id: number): Pickaxe | undefined => {
  return PICKAXES.find((p) => p.id === id);
};

export const getRockById = (id: number): Rock | undefined => {
  return ROCKS.find((r) => r.id === id);
};

// Rock unlock scaling per prestige (50% more clicks needed per prestige)
export const ROCK_UNLOCK_PRESTIGE_SCALING = 0.5;

// Get scaled unlock threshold based on prestige (+40% after prestige 40)
export const getScaledUnlockThreshold = (baseThreshold: number, prestigeCount: number): number => {
  const base = Math.ceil(baseThreshold * (1 + prestigeCount * ROCK_UNLOCK_PRESTIGE_SCALING));
  return prestigeCount >= HARD_MODE_PRESTIGE_THRESHOLD ? Math.ceil(base * HARD_MODE_MULTIPLIER) : base;
};

export const getNextRock = (currentRockId: number, totalClicks: number, prestigeCount: number = 0): Rock | null => {
  const nextRock = ROCKS.find((r) => r.id === currentRockId + 1);
  if (nextRock && totalClicks >= getScaledUnlockThreshold(nextRock.unlockAtClicks, prestigeCount)) {
    return nextRock;
  }
  return null;
};

export const getHighestUnlockedRock = (totalClicks: number, prestigeCount: number = 0): Rock => {
  let highestRock = ROCKS[0];
  for (const rock of ROCKS) {
    if (totalClicks >= getScaledUnlockThreshold(rock.unlockAtClicks, prestigeCount)) {
      highestRock = rock;
    }
  }
  return highestRock;
};

export const getNextRockUnlockInfo = (totalClicks: number, prestigeCount: number = 0, currentRockId: number = 1): { nextRock: Rock | null; progress: number; clicksNeeded: number } => {
  const highestUnlockedByClicks = getHighestUnlockedRock(totalClicks, prestigeCount);
  const currentRock = getRockById(currentRockId) || ROCKS[0];
  
  // Use whichever is higher: what you've unlocked by clicks OR what you're currently on
  const effectiveHighest = currentRock.id > highestUnlockedByClicks.id ? currentRock : highestUnlockedByClicks;
  const nextRock = ROCKS.find(r => r.id === effectiveHighest.id + 1) || null;
  
  if (!nextRock) {
    return { nextRock: null, progress: 100, clicksNeeded: 0 };
  }
  
  const previousThreshold = getScaledUnlockThreshold(effectiveHighest.unlockAtClicks, prestigeCount);
  const nextThreshold = getScaledUnlockThreshold(nextRock.unlockAtClicks, prestigeCount);
  const progressInRange = totalClicks - previousThreshold;
  const rangeSize = nextThreshold - previousThreshold;
  const progress = Math.max(0, Math.min(100, (progressInRange / rangeSize) * 100));
  const clicksNeeded = Math.max(0, nextThreshold - totalClicks);
  
  return { nextRock, progress, clicksNeeded };
};

// =====================
// BUILDING HELPERS
// =====================

export const getBuildingById = (id: BuildingType): Building | undefined => {
  return BUILDINGS.find((b) => b.id === id);
};

export const getAllBuildings = (): Building[] => {
  return BUILDINGS;
};

// Get buildings available for a specific path (null path = path not chosen yet)
export const getBuildingsForPath = (path: 'light' | 'darkness' | null): Building[] => {
  return BUILDINGS.filter((b) => {
    if (b.pathRestriction === null) return true;
    if (path === null) return false; // Can't buy path-restricted buildings without a path
    return b.pathRestriction === path;
  });
};

// =====================
// PROGRESSIVE UPGRADE HELPERS
// =====================

export const getProgressiveUpgradeById = (id: ProgressiveUpgradeType): ProgressiveUpgrade | undefined => {
  return PROGRESSIVE_UPGRADES.find((u) => u.id === id);
};

// =====================
// POWERUP HELPERS
// =====================

export const getPowerupById = (id: PowerupType): Powerup | undefined => {
  return POWERUPS.find((p) => p.id === id);
};
