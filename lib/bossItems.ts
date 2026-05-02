/**
 * Boss-mode item registry. Sourced ONLY from Items.md — no invented items.
 * Keep this file in sync with Items.md. New items go here as Items.md grows.
 */

export type BossItemRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'ExqUiZxyte';

export type BossItemSlot = 'WEAPON' | 'HEAD' | 'TORSO' | 'ARMS' | 'LEGS' | 'DEFENSE' | 'TRANSFORMATION';

export interface StatBonuses {
    healthPct?: number;
    dmgPct?: number;
    defPct?: number;
    speedPct?: number;
    atkSpeedPct?: number;
    dodgePct?: number;
    critPct?: number;
    healPct?: number;
    dmgReducPct?: number;
    hpRegenPct?: number;
    flatHP?: number;
    flatMana?: number;
    flatDmg?: number;
}

/**
 * Condition that must be met before the acquisition text is revealed in the Index.
 * Until met, the "How to get" section shows a hint about what's needed to unlock it.
 */
export interface AcquisitionGate {
    type: 'premiumPurchase' | 'fastPrestige' | 'trinketRarity';
    /** For 'fastPrestige': max time in ms. For 'trinketRarity': which rarities count. */
    value?: number | string[];
    hintText: string;
}

export interface BossItem {
    id: string;
    name: string;
    rarity: BossItemRarity;
    slot: BossItemSlot;
    image: string;
    sellPriceBC: number | null;
    bonuses: StatBonuses;
    description: string;
    acquisition: string;
    inputKey?: 'X' | 'Z' | 'T' | 'R' | 'B' | 'G' | 'Q' | 'F' | 'O' | 'U' | 'C' | 'I' | 'K' | 'V' | 'click';
    manaCost?: number;
    cooldownSec?: number;
    /** Max times the ability can be used in a single match (e.g. Meganut Sword = 2). */
    maxUsesPerMatch?: number;
    /** Debuff text shown in item detail / Index tooltip. */
    debuff?: string;
    /** How long the item effect / transformation lasts (e.g. "Inf", "15s", "8s"). */
    duration?: string;
    /** True for items in the TRANSFORMATION slot. Pressing T activates, strips armor/defense, keeps weapon. */
    isTransformation?: boolean;
    /** Set name this item belongs to (e.g. "MK", "Goated", "AM"). */
    isSetPiece?: string;
    /** If true, this item is completely hidden from the Index overlay (e.g. Infinity Gauntlet). */
    hideFromIndex?: boolean;
    /**
     * For items with dual rarity (e.g. Mythic + ExqUiZxyte): the secondary rarity.
     * Renders as half border = primary rarity color, half = secondary rarity (rainbow).
     */
    dualRarity?: BossItemRarity;
    /**
     * For items with multiple ways to acquire (e.g. Time Stop Watch has 3 methods).
     * Each method can independently control whether it shows in the Index.
     */
    acquisitionMethods?: { description: string; showInIndex: boolean }[];
    /** Alternate image shown when the character's back faces the camera (e.g. chestplate rear view). */
    backImage?: string;
    /**
     * Visual zoom factor applied to the item's PNG inside its slot tile.
     * Use values >1 for items whose source PNG has heavy transparent padding.
     * Defaults to 1.
     */
    displayScale?: number;
    /**
     * If set to 2, the item is rendered as a mirrored pair (e.g. MK Gauntlets — you wear both).
     * Defaults to 1.
     */
    pairCount?: 1 | 2;
    /**
     * If set, the acquisition text is hidden in the Index until this condition is met.
     * Once the gate condition is satisfied, the real acquisition text is shown.
     */
    acquisitionGate?: AcquisitionGate;
}

export const RARITY_COLORS: Record<BossItemRarity, {
    border: string;
    text: string;
    glow: string;
    bgFaint: string;
}> = {
    Common:     { border: 'border-neutral-400',  text: 'text-neutral-200', glow: 'shadow-neutral-500/30', bgFaint: 'bg-neutral-900/40' },
    Rare:       { border: 'border-blue-400',     text: 'text-blue-300',    glow: 'shadow-blue-500/40',    bgFaint: 'bg-blue-950/30' },
    Epic:       { border: 'border-purple-400',   text: 'text-purple-300',  glow: 'shadow-purple-500/50',  bgFaint: 'bg-purple-950/30' },
    Legendary:  { border: 'border-yellow-400',   text: 'text-yellow-300',  glow: 'shadow-yellow-500/60',  bgFaint: 'bg-yellow-950/30' },
    Mythic:     { border: 'border-red-500',      text: 'text-red-400',     glow: 'shadow-red-500/70',     bgFaint: 'bg-red-950/30' },
    ExqUiZxyte: { border: 'border-pink-400',     text: 'text-pink-300',    glow: 'shadow-pink-500/80',    bgFaint: 'bg-pink-950/30' },
};

export const RARITY_HEX: Record<BossItemRarity, string> = {
    Common:     '#a3a3a3',
    Rare:       '#60a5fa',
    Epic:       '#a78bfa',
    Legendary:  '#f5c842',
    Mythic:     '#ef4444',
    ExqUiZxyte: '#ff69b4', // hot pink fallback — actual rendering uses animated rainbow gradient
};

/**
 * Rarity weights for MK HP scaling formula.
 * MK_HP = baseHP × (1 + sum of equipped non-weapon rarity weights).
 * Dual-rarity items stack both weights.
 */
export const RARITY_WEIGHT: Record<BossItemRarity, number> = {
    Common:     0.1,
    Rare:       0.2,
    Epic:       0.5,
    Legendary:  1.0,
    Mythic:     2.0,
    ExqUiZxyte: 5.0,
};

const ITEM_IMG = (file: string) => `/bosses/items/${file}`;

export const BOSS_ITEMS: BossItem[] = [
    // ===== WEAPON =====
    {
        id: 'meganut_sword',
        name: 'Meganut Sword',
        rarity: 'Legendary',
        slot: 'WEAPON',
        image: ITEM_IMG('MeganutSword.png'),
        sellPriceBC: 101_000_000_000_000_000, // 101QI
        bonuses: { flatDmg: 700_000 },
        description: '700K dmg/hit. Press X to spawn 50 swords for 50M AoE. Max 2 uses per match, 20s cooldown.',
        acquisition: 'Drop from MK',
        inputKey: 'X',
        manaCost: 150,
        cooldownSec: 20,
        maxUsesPerMatch: 2,
        isSetPiece: 'MK',
        displayScale: 1.7,
    },
    {
        id: 'mc_block',
        name: 'MC Block',
        rarity: 'Common',
        slot: 'WEAPON',
        image: ITEM_IMG('MCblock.png'),
        sellPriceBC: 375_000, // half of 750K buy price
        bonuses: { flatDmg: 41_000, dodgePct: 150, healthPct: 50, healPct: 50 },
        description: '41K dmg/hit. +150% dodge, +50% HP, +50% healing.',
        acquisition: '750K BC in Boss Store',
    },
    {
        id: 'goated_sword',
        name: "The Goated One's Sword",
        rarity: 'Mythic',
        slot: 'WEAPON',
        image: ITEM_IMG('GoatSword1.png'),
        sellPriceBC: null,
        bonuses: { flatDmg: 200_000, atkSpeedPct: 77, speedPct: 77, dmgReducPct: 77, critPct: 77, dmgPct: 77 },
        description: '200K dmg. +77% atk speed/speed/dmg reduc/crit/dmg.',
        acquisition: 'Kill MK 77×',
        isSetPiece: 'Goated',
    },
    {
        id: 'bernardo_bomb',
        name: "Bernardo's Bomb",
        rarity: 'Epic',
        slot: 'WEAPON',
        image: ITEM_IMG('BernardoBomb.png'),
        sellPriceBC: 100_000_000, // 100M BC
        bonuses: { flatDmg: 100_000 },
        description: 'Click to throw. Freezes boss 2s on contact. 100K dmg.',
        acquisition: 'Kill MK without taking damage',
        inputKey: 'click',
        manaCost: 100,
        cooldownSec: 12,
    },
    {
        id: 'midget_demon_slayer',
        name: 'Midget Demon Slayer',
        rarity: 'Legendary',
        slot: 'WEAPON',
        image: ITEM_IMG('MidgetSword.png'),
        sellPriceBC: null,
        bonuses: { flatDmg: 170_000 },
        description: '170K dmg/hit. 50% chance to deflect attacks (+30% dmg back). 0 mana while equipped (locks abilities).',
        acquisition: 'Beat MK 5× with no armor and no defense',
    },
    // ===== HEAD =====
    {
        id: 'meganut_helmet',
        name: 'Meganut Helmet',
        rarity: 'Mythic',
        slot: 'HEAD',
        image: ITEM_IMG('MeganutHelmet.png'),
        sellPriceBC: 100_000_000_000_000_000,
        bonuses: { healthPct: 50, dmgPct: 50 },
        description: '+50% HP/dmg in bosses. Trinket in normal mode: +67000% to everything.',
        acquisition: 'Drop from MK',
        isSetPiece: 'MK',
    },
    {
        id: 'mj_hat',
        name: 'MJ Hat',
        rarity: 'Epic',
        slot: 'HEAD',
        image: ITEM_IMG('MJhat.png'),
        sellPriceBC: null,
        bonuses: { speedPct: 20, dmgPct: 15, dmgReducPct: 5, dodgePct: 25, critPct: 21, atkSpeedPct: 25 },
        description: '+20% speed, +15% dmg, +5% dmg reduc, +25% dodge, +21% crit, +25% atk speed.',
        acquisition: 'Defeat any boss in <1m',
    },
    {
        id: 'tuff_wig',
        name: 'Tuff Wig',
        rarity: 'Rare',
        slot: 'HEAD',
        image: ITEM_IMG('Tuffwig.png'),
        sellPriceBC: 25_000_000_000_000_000, // 25QI
        bonuses: {},
        description: '+25% money equipped. Boss loses 3% HP every 5s.',
        acquisition: 'Earn 1B BC',
    },
    {
        id: 'better_wig',
        name: 'Better Wig',
        rarity: 'Epic',
        slot: 'HEAD',
        image: ITEM_IMG('bettertuffwig.png'),
        sellPriceBC: 50_000_000_000_000_000,
        bonuses: {},
        description: '+50% money equipped. Boss loses 6% HP every 2.5s. Unequipped grants +1025% normal-mode money.',
        acquisition: '1T BC in Boss Store',
    },
    {
        id: '42nd_eye',
        name: '42nd Eye',
        rarity: 'Mythic',
        slot: 'HEAD',
        image: ITEM_IMG('42ndEye.png'),
        sellPriceBC: null,
        bonuses: { flatMana: 500 },
        description: '+500 mana.',
        acquisition: 'Kill MK 7× without taking ANY damage',
    },
    // ===== TORSO =====
    {
        id: 'mj_jacket',
        name: 'MJ Jacket',
        rarity: 'Legendary',
        slot: 'TORSO',
        image: ITEM_IMG('MJacket.png'),
        sellPriceBC: null,
        bonuses: { speedPct: 25, dmgPct: 20, dmgReducPct: 10, dodgePct: 30, critPct: 26, atkSpeedPct: 30 },
        description: '+25% speed, +20% dmg, +10% dmg reduc, +30% dodge, +26% crit, +30% atk speed.',
        acquisition: 'Defeat any boss in <1m',
    },
    {
        id: 'netherite_chestplate',
        name: 'Netherite Chestplate',
        rarity: 'Legendary',
        slot: 'TORSO',
        image: ITEM_IMG('NetheriteCHestplate.png'),
        sellPriceBC: 1_200,
        bonuses: { healthPct: 60, dmgReducPct: 60, speedPct: -20, atkSpeedPct: -20, dodgePct: -15, critPct: -15 },
        description: '+60% HP, +60% dmg reduc. 30% chance per hit taken to reflect 10% dmg. -20% speed/atk speed, -15% dodge/crit. 150 boss-hits durability (super = 10 hits).',
        acquisition: 'Die 100× to a boss. Buy for 200K BC in Boss Shop.',
    },
    {
        id: 'mk_chestplate',
        name: 'MK Chestplate',
        rarity: 'Legendary',
        slot: 'TORSO',
        image: ITEM_IMG('MKchestplate.png'),
        sellPriceBC: null,
        bonuses: { speedPct: -15, atkSpeedPct: -15, critPct: 20, dmgPct: 30, hpRegenPct: 30, healthPct: 35 },
        description: '-15% speed/atk speed, +20% crit, +30% dmg, +30% HP regen, +35% HP.',
        acquisition: '5% drop from MK',
        isSetPiece: 'MK',
    },
    // ===== ARMS =====
    {
        id: 'peace',
        name: 'Peace..',
        rarity: 'Legendary',
        slot: 'ARMS',
        image: ITEM_IMG('Peace.png'),
        sellPriceBC: null,
        bonuses: { speedPct: 50, atkSpeedPct: 50 },
        description: '+50% speed, +50% atk speed, +25% speed. 50% chance after attacking 5× to "make peace" (counts as kill).',
        acquisition: 'Let MK kill you 12×',
    },
    // ===== DEFENSE =====
    {
        id: 'mk_gauntlets',
        name: 'MK Gauntlets',
        rarity: 'Epic',
        slot: 'DEFENSE',
        image: ITEM_IMG('MKGauntlet.png'),
        sellPriceBC: null,
        bonuses: { atkSpeedPct: -15, critPct: 20, dmgPct: 25, hpRegenPct: 15, healthPct: 30 },
        description: '-15% atk speed, +20% crit, +25% dmg, +15% HP regen, +30% HP. (Pair — you wear both.)',
        acquisition: '5% drop from MK',
        isSetPiece: 'MK',
        displayScale: 2.4,
        pairCount: 2,
    },
    {
        id: 'gis_pin',
        name: 'GIS Pin',
        rarity: 'Rare',
        slot: 'DEFENSE',
        image: ITEM_IMG('GISpin.png'),
        sellPriceBC: 20,
        bonuses: { dmgReducPct: 50, speedPct: 30, atkSpeedPct: 35, flatMana: 120 },
        description: '+50% dmg reduc, +30% speed, +35% atk speed, +120 mana. 20% chance on hit >5% HP to fully heal.',
        acquisition: '50K BC in Boss Shop',
    },
    {
        id: 'blue_glasses',
        name: 'Blue Glasses',
        rarity: 'Rare',
        slot: 'DEFENSE',
        image: ITEM_IMG('BlueGlasses.png'),
        sellPriceBC: 200,
        bonuses: { dmgReducPct: 20, atkSpeedPct: 15, speedPct: 15, hpRegenPct: 15, healthPct: 15, critPct: 15, dmgPct: 10, flatMana: 100 },
        description: '+20% dmg reduc, +15% atk speed/speed, +15% HP regen/HP, +10% dmg, +15% crit, +100 mana.',
        acquisition: 'Buy for 700 BC in Boss Shop',
    },
    {
        id: 'goated_sword_2',
        name: "The Goated One's Sword The 2nd",
        rarity: 'Mythic',
        slot: 'DEFENSE',
        image: ITEM_IMG('GoatSword2.png'),
        sellPriceBC: null,
        bonuses: { flatDmg: 200_000, atkSpeedPct: 77, speedPct: 77, dmgReducPct: 77, critPct: 77, dmgPct: 77 },
        description: '+77% all stats. 200K dmg.',
        acquisition: 'Kill MK 80×',
        isSetPiece: 'Goated',
    },
    {
        id: 'william_mask',
        name: "William Vangeance's Mask",
        rarity: 'Epic',
        slot: 'DEFENSE',
        image: ITEM_IMG('WilliamMask.png'),
        sellPriceBC: 10_000_000, // 10M BC
        bonuses: { dodgePct: 100, flatHP: 50 },
        description: '+100% dodge, +50 HP. Press Z for green shield bubble: 89% dmg reduc + every enemy hit fully heals you. 8s, 120 mana.',
        acquisition: 'Click the "Yates" text at the top of the main screen 5 times',
        inputKey: 'Z',
        manaCost: 120,
        acquisitionGate: {
            type: 'premiumPurchase',
            hintText: 'Purchase any Premium product to reveal how to get this item.',
        },
    },
    // ===== NEW DEFENSE =====
    {
        id: 'force_field',
        name: 'Force Field',
        rarity: 'Legendary',
        slot: 'DEFENSE',
        image: ITEM_IMG('ForceField.png'),
        sellPriceBC: 500_000,
        bonuses: {},
        description: 'Press Q to deflect all damage to the opponent. 12s cooldown.',
        acquisition: 'Buy for 1M BC in Boss Shop',
        inputKey: 'Q',
        cooldownSec: 12,
    },
    // ===== NEW ARMS =====
    {
        id: 'infinity_gauntlet',
        name: 'Infinity Gauntlet',
        rarity: 'Mythic',
        slot: 'ARMS',
        image: ITEM_IMG('InfinityGauntlet.png'),
        sellPriceBC: 500_000_000_000_000, // 500T
        bonuses: { flatDmg: 10_000 },
        description: '10K dmg. Press G to Snap: 30M dmg. 40s cooldown, 20s initial delay on match start.',
        acquisition: 'Hidden tiny icon in Settings page bottom-right corner',
        inputKey: 'G',
        cooldownSec: 40,
        hideFromIndex: true,
    },
    {
        id: 'lord_of_the_ring',
        name: "Lord of the Ring's Ring",
        rarity: 'Mythic',
        slot: 'ARMS',
        image: ITEM_IMG('LordOfTheRing.png'),
        sellPriceBC: null,
        bonuses: { critPct: 40, atkSpeedPct: 30, dmgPct: 25, dodgePct: 20 },
        description: 'Press R: go invisible 6s, can\'t be hit. Backstab = +500% dmg on that hit. 150 mana, 25s CD.',
        acquisition: 'Use ONLY the Elder Ring trinket (no other trinkets) and earn 1T$',
        inputKey: 'R',
        manaCost: 150,
        cooldownSec: 25,
        debuff: 'Every 10s equipment loses 4% HP. If worn for 5+ runs without unequipping, becomes permanently unequippable.',
    },
    {
        id: 'time_stop_watch',
        name: 'Time Stop Watch',
        rarity: 'Mythic',
        slot: 'ARMS',
        image: ITEM_IMG('TimeWatch.png'),
        sellPriceBC: null,
        bonuses: {},
        description: 'Press O: stop time for 5s. All attacks freeze, enemies frozen. Can\'t use first 10s of match. 10s CD.',
        acquisition: 'Stay in boss arena 10min without dying or dealing damage, then press O',
        inputKey: 'O',
        cooldownSec: 10,
        dualRarity: 'ExqUiZxyte',
        acquisitionMethods: [
            { description: 'Beat any boss at exactly 1:11 on the match timer', showInIndex: false },
            { description: 'Stay in boss arena 10min without dying or dealing damage, then press O', showInIndex: true },
            { description: 'Defeat 3 different bosses in <20s each, back-to-back, no deaths (completing this also grants Grass). Unlock visibility by clicking Neshe employee image 25×.', showInIndex: false },
        ],
    },
    // ===== AM SET =====
    {
        id: 'am_head',
        name: 'AM Head',
        rarity: 'Epic',
        slot: 'HEAD',
        image: '/bosses/items/am-set/AMhead.png',
        sellPriceBC: 200,
        bonuses: { flatMana: 50, speedPct: 20, atkSpeedPct: 20, dmgReducPct: -20 },
        description: '+50 mana, +20% speed/atk speed, -20% dmg reduction.',
        acquisition: 'Buy for 2QI from the Wandering Trader in the Clicker Game',
        isSetPiece: 'AM',
        displayScale: 3.5,
    },
    {
        id: 'am_torso',
        name: 'AM Torso',
        rarity: 'Epic',
        slot: 'TORSO',
        image: '/bosses/items/am-set/AMtorso.png',
        sellPriceBC: 270,
        bonuses: { flatMana: 75, speedPct: 30, atkSpeedPct: 30, dmgReducPct: -40, healthPct: -10 },
        description: '+75 mana, +30% speed/atk speed, -40% dmg reduction, -10% HP.',
        acquisition: 'Buy for 1,200 BC in Boss Shop',
        isSetPiece: 'AM',
        displayScale: 3.0,
    },
    {
        id: 'am_leg',
        name: 'AM Leg',
        rarity: 'Epic',
        slot: 'LEGS',
        image: '/bosses/items/am-set/AMlegleft.png',
        sellPriceBC: 150,
        bonuses: { flatMana: 60, speedPct: 25, atkSpeedPct: 25, dmgReducPct: -30, healthPct: -5, hpRegenPct: -5 },
        description: '+60 mana, +25% speed/atk speed, -30% dmg reduction, -5% HP, -5% HP regen.',
        acquisition: 'Randomly appears anywhere on the website — click within 5s before it respawns elsewhere',
        isSetPiece: 'AM',
        pairCount: 2,
        displayScale: 5.5,
    },
    {
        id: 'am_arm',
        name: 'AM Arm',
        rarity: 'Epic',
        slot: 'ARMS',
        image: '/bosses/items/am-set/AMleftarm.png',
        sellPriceBC: 100,
        bonuses: { flatMana: 80, speedPct: 35, atkSpeedPct: 35, dmgReducPct: -45, healthPct: -15, hpRegenPct: -10 },
        description: '+80 mana, +35% speed/atk speed, -45% defense, -15% HP, -10% HP regen.',
        acquisition: 'Click 2,000 times in the Clicker game',
        isSetPiece: 'AM',
        pairCount: 2,
        displayScale: 5.5,
    },
    {
        id: 'robe_of_archmagi',
        name: 'Robe of Archmagi',
        rarity: 'ExqUiZxyte',
        slot: 'TRANSFORMATION',
        image: '/bosses/items/am-set/ArchMagi.png',
        sellPriceBC: null,
        bonuses: { flatMana: 800, speedPct: 150, dodgePct: 200, critPct: 150 },
        description: '+800 mana, +120% reload speed, +150% speed, +200% dodge, +150% crit. Press U: ice stun 5s + weapon hits do 50% more.',
        acquisition: 'Own all 4 AM set pieces + buy Archmagi Key for 200M BC in Boss Shop',
        inputKey: 'U',
        isTransformation: true,
        duration: '50s',
        cooldownSec: 5,
        isSetPiece: 'AM',
    },
    // ===== NEW LEGS =====
    {
        id: 'speed_boots',
        name: 'Speed Boots',
        rarity: 'Epic',
        slot: 'LEGS',
        image: ITEM_IMG('SpeedBootsLeft.png'),
        sellPriceBC: null,
        bonuses: { speedPct: 2000, atkSpeedPct: 2000, dodgePct: 1000, critPct: 1, dmgPct: -80, dmgReducPct: -60 },
        description: '+2k% speed/atk speed, +1k% dodge, +1% crit, -80% dmg, -60% dmg reduction.',
        acquisition: 'Click the BC counter area at 6.5 CPS for 5 seconds',
        pairCount: 2,
        acquisitionGate: {
            type: 'fastPrestige',
            value: 7 * 60 * 1000, // 7 minutes in ms
            hintText: 'Prestige faster than 7 minutes to reveal how to get this item.',
        },
    },
    {
        id: 'boots_of_winterland',
        name: 'Boots of Winterland',
        rarity: 'Legendary',
        slot: 'LEGS',
        image: ITEM_IMG('BootsOfWinterlandLeft.png'),
        sellPriceBC: null,
        bonuses: {},
        description: 'Press F: freeze floor 15 blocks around you for 20s. Enemies in it 3s+ get frozen 2s, then slide at -70% speed with 35% miss chance on projectiles. 40s CD, 10s initial delay.',
        acquisition: 'Win vs MK with full Archmagi loadout + Bernardo\'s Bomb weapon + Blue Glasses defense',
        inputKey: 'F',
        cooldownSec: 40,
        pairCount: 2,
        displayScale: 2.5,
    },
    {
        id: 'mana_boots',
        name: 'Mana Boots',
        rarity: 'Epic',
        slot: 'LEGS',
        image: ITEM_IMG('SpeedBootsLeft.png'), // placeholder until dedicated PNG
        sellPriceBC: null,
        bonuses: { flatMana: 500 },
        description: '+500 mana, +10 mana regen/s. Can over-regen until 120% of total mana is reached.',
        acquisition: 'Have a total of 500+ mana in a loadout (ever)',
        pairCount: 2,
    },
    {
        id: 'adamantine_boots',
        name: 'Adamantine Boots',
        rarity: 'Epic',
        slot: 'LEGS',
        image: ITEM_IMG('AdamantineBootsLeft.png'),
        sellPriceBC: null,
        bonuses: { speedPct: -50, atkSpeedPct: -15, healthPct: 60, dmgReducPct: 80, hpRegenPct: 50, dmgPct: 50, dodgePct: -10, critPct: 8 },
        description: '-50% speed, -15% atk speed, +60% HP, +80% dmg reduc, +50% HP regen, +50% dmg, -10% dodge, +8% crit.',
        acquisition: 'Survive any boss fight for at least 3min 20s',
        pairCount: 2,
    },
    {
        id: 'celestial_boots',
        name: 'Celestial Boots',
        rarity: 'Mythic',
        slot: 'LEGS',
        image: ITEM_IMG('CelestialBootsLeft.png'),
        sellPriceBC: null,
        bonuses: { speedPct: 300, atkSpeedPct: 200, dodgePct: 150, critPct: 50, healthPct: 40, dmgReducPct: 30 },
        description: 'Passive: Astral Trail — galaxy trail behind you, enemies take 5% max HP/s and -40% speed for 4s. Press V: Phase Shift dash through boss, invulnerable, 15% current HP true dmg. 200 mana, 18s CD, 10s initial delay.',
        acquisition: 'Complete any boss fight taking zero damage with Speed Boots equipped',
        inputKey: 'V',
        manaCost: 200,
        cooldownSec: 18,
        dualRarity: 'ExqUiZxyte',
        pairCount: 2,
    },
    {
        id: 'grass',
        name: 'Grass',
        rarity: 'Mythic',
        slot: 'LEGS',
        image: ITEM_IMG('Grass.png'),
        sellPriceBC: null,
        bonuses: {},
        description: '+10K of everything. Press K: instant kill enemies with >1% more HP than you. 1 mana, 1s CD.',
        acquisition: 'Have Time Stop Watch + complete its 3rd acquisition quest',
        inputKey: 'K',
        manaCost: 1,
        cooldownSec: 1,
        dualRarity: 'ExqUiZxyte',
        pairCount: 2,
    },
    // ===== NEW TORSO =====
    {
        id: 'adamantine_chestplate',
        name: 'Adamantine Chestplate',
        rarity: 'Mythic',
        slot: 'TORSO',
        image: ITEM_IMG('AdamantineChestplate.png'),
        backImage: ITEM_IMG('AdamantineBack.png'),
        sellPriceBC: null,
        bonuses: { healthPct: 80, dmgReducPct: 90, hpRegenPct: 60, critPct: 10, atkSpeedPct: -20, speedPct: -55 },
        description: 'Unyielding: immune to knockback/stun/displacement. Fortify: every 3 hits taken without dodging, +5% dmg reduc (10 stacks max). Stacks reset on dodge or 5s no hits.',
        acquisition: 'Survive any boss fight for longer than 3min 40s',
    },
    // ===== TRANSFORMATIONS =====
    {
        id: 'erwin_smith',
        name: 'Erwin Smith',
        rarity: 'ExqUiZxyte',
        slot: 'TRANSFORMATION',
        image: '/bosses/transformations/ErwinSmith.png',
        sellPriceBC: null,
        bonuses: { dmgPct: 700, speedPct: 500, dodgePct: 500, atkSpeedPct: 450, flatMana: 2000, flatHP: 1000, hpRegenPct: 500, dmgReducPct: 500, critPct: 450 },
        description: '+700% dmg, +500% speed/dodge/HP regen/dmg reduc, +450% atk speed/crit, +2k mana, +1k HP, +500% weapon dmg.',
        acquisition: 'Send a mail titled "Galaxy Balls" to the ErwinSmith account',
        isTransformation: true,
        duration: 'Inf',
        debuff: 'If you stay longer than 1min 30s in a boss fight, you instantly die.',
    },
    {
        id: 'saturn_guru',
        name: 'Saturn Guru',
        rarity: 'ExqUiZxyte',
        slot: 'TRANSFORMATION',
        image: '/bosses/transformations/SaturnGuru.png',
        sellPriceBC: null,
        bonuses: { speedPct: 1000, atkSpeedPct: 1000, dodgePct: 100 },
        description: '+1k% speed/atk speed, 100% dodge, infinite mana. R: push ball to far wall. B: pull + 4s stun + push, 30% dmg on impact.',
        acquisition: 'Defeat MK 3× with only Blue Glasses + Bernardo\'s Bomb equipped',
        isTransformation: true,
        duration: '15s',
        debuff: 'Press T early (before 20s CD) = instant death + lose 20% money. Enter match without Blue Glasses or GIS Pin + press T = instant death. Use 5+ times without unequipping for a match = becomes unusable.',
        inputKey: 'R',
    },
    {
        id: 'daddy_fushiguro',
        name: 'Daddy Fushiguro',
        rarity: 'ExqUiZxyte',
        slot: 'TRANSFORMATION',
        image: '/bosses/transformations/DaddyFushiguro.png',
        sellPriceBC: null,
        bonuses: { speedPct: 7000, atkSpeedPct: 7000, dmgReducPct: 8000, critPct: 4000, dodgePct: 4000 },
        description: '+7k% speed/atk speed, +8k% dmg reduction, +4k% crit/dodge. If both Goated Swords in inventory, all stats doubled.',
        acquisition: 'Kill MK 25× with only 1 weapon + click MK\'s eye 10 times in a row',
        isTransformation: true,
        duration: '45s',
        cooldownSec: 10,
        debuff: 'You lose ALL of your BC when you equip it. (Warning shown before equipping.)',
    },
    {
        id: 'bill_cipher',
        name: 'Bill Cipher',
        rarity: 'ExqUiZxyte',
        slot: 'TRANSFORMATION',
        image: '/bosses/transformations/BillCipher.png',
        sellPriceBC: null,
        bonuses: { speedPct: 1000, atkSpeedPct: 1000, critPct: 200, dodgePct: 200, flatMana: 700 },
        description: '+1k speed/atk, +200% crit/dodge, +700 mana. Press I: Infinity Crack — teleport up to 2 enemies away for 10s, 230K dmg/s. 780 mana, 25s CD, 25s initial delay.',
        acquisition: 'Complete Escape the Bank for Yates PCK 10× without losing',
        isTransformation: true,
        duration: '66s',
        inputKey: 'I',
        manaCost: 780,
        cooldownSec: 6,
        acquisitionGate: {
            type: 'trinketRarity',
            value: ['secret', 'mythic'],
            hintText: 'Own any Secret or Mythic trinket to reveal how to get this item.',
        },
    },
    {
        id: 'omnitrix',
        name: 'Omnitrix',
        rarity: 'Mythic',
        slot: 'ARMS',
        image: '/bosses/transformations/Omnitrix.png',
        sellPriceBC: null,
        bonuses: { dmgPct: 15, atkSpeedPct: 15, speedPct: 15, critPct: 10, dodgePct: 10, flatMana: 200, hpRegenPct: 5 },
        description: '+15% dmg/atk speed/speed, +10% crit/dodge, +200 mana, +5% HP regen. Press C: cycle 3 forms (15s each, 20s CD, 150 mana). Four Arms: +400% dmg/-50% speed/AOE/no dodge. XLR8: +300% atk speed/speed/+75% dodge/-60% dmg. Heatblast: burn 5% boss HP/3s (3 stacks)/-30% dmg reduc. 20% backfire chance. No regen while transformed.',
        acquisition: 'Defeat 5 different bosses back-to-back, no deaths, no unequips',
        inputKey: 'C',
        manaCost: 150,
        cooldownSec: 20,
        dualRarity: 'ExqUiZxyte',
    },
    {
        id: 'nah_id_goon',
        name: "Nah I'd Goon",
        rarity: 'ExqUiZxyte',
        slot: 'TRANSFORMATION',
        image: '/bosses/transformations/NahIdGoon.png',
        sellPriceBC: null,
        bonuses: {},
        description: 'Infinite stats. Press G: instantly kill all enemies. Can only activate if Midget Demon Slayer is equipped as weapon.',
        acquisition: 'Have Time Stop Watch + Grass + Midget Demon Slayer',
        isTransformation: true,
        duration: 'Inf',
        inputKey: 'G',
        displayScale: 1.6,
    },
];

export function getItemById(id: string): BossItem | undefined {
    return BOSS_ITEMS.find(i => i.id === id);
}

export const TAB_FILTERS: Record<string, BossItemSlot[] | null> = {
    All:             null,
    Weapons:         ['WEAPON'],
    Armor:           ['HEAD', 'TORSO', 'ARMS', 'LEGS'],
    Defense:         ['DEFENSE'],
    Transformations: ['TRANSFORMATION'],
    Loadout:         null, // special — swaps grid for paper-doll view
};
