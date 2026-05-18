import type { BuildingType, GameState, PowerupInventory, TrinketRarity } from '@/types/game';
import {
  BUILDINGS,
  PROGRESSIVE_UPGRADES,
  SIDE_LEVEL_MAX,
  rollSideLevelBuff,
  TRINKETS,
  getScaledRockHP,
  getBuildingCount,
  D1_PICKAXE_ID,
} from '@/types/game';
import { getRockById, ROCKS } from '@/lib/gameData';
import { safeAdd } from '@/lib/userDataSync';
import { type MysteryBoxTier } from '@/lib/shadySamRewards';
import { applyForcedPrestigeChain } from '@/lib/prestigeTransition';

export const PROMO_CODE_IDS = ['CODES', 'SORRY4DOWN'] as const;
export type PromoCodeId = (typeof PROMO_CODE_IDS)[number];

export interface PromoCodeInfo {
  code_id: PromoCodeId;
  expires_at: string;
  is_active: boolean;
}

export function normalizePromoCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Check if a promo code has expired by comparing current time to expires_at from database.
 * Returns true if the code is still valid (not expired).
 */
export async function isPromoCodeValid(code: PromoCodeId): Promise<boolean> {
  try {
    const response = await fetch(`/api/promo-codes/${code}`);
    if (!response.ok) return false;
    
    const data: PromoCodeInfo = await response.json();
    if (!data.is_active) return false;
    
    const expiresAt = new Date(data.expires_at).getTime();
    const now = Date.now();
    return now < expiresAt;
  } catch (error) {
    console.error('Failed to check promo code validity:', error);
    return false;
  }
}

function buildingPathOk(state: GameState, buildingId: BuildingType): boolean {
  const def = BUILDINGS.find((b) => b.id === buildingId);
  if (!def || def.pathRestriction === null) return true;
  if (!state.chosenPath) return false;
  return state.chosenPath === def.pathRestriction;
}

function synthState(prev: GameState, buildings: GameState['buildings']): GameState {
  return { ...prev, buildings };
}

function grantD1PlayerPack(s: GameState): GameState {
  const owned = s.ownedPickaxeIds.includes(D1_PICKAXE_ID)
    ? [...s.ownedPickaxeIds]
    : [...s.ownedPickaxeIds, D1_PICKAXE_ID].sort((a, b) => a - b);
  return { ...s, hasD1PlayerPack: true, ownedPickaxeIds: owned };
}

/** Add delta to each building count / owned, respecting maxCount and path. */
export function addToAllBuildings(prev: GameState, delta: number): GameState {
  if (delta <= 0) return prev;
  let buildings = { ...prev.buildings };

  for (const def of BUILDINGS) {
    const id = def.id as BuildingType;
    if (!buildingPathOk(prev, id)) continue;
    const current = getBuildingCount(id, synthState(prev, buildings));
    const max = def.maxCount;
    let target = current + delta;
    if (max !== -1) target = Math.min(target, max);
    const add = target - current;
    if (add <= 0) continue;

    switch (id) {
      case 'mine':
        buildings.mine = { ...buildings.mine, count: buildings.mine.count + add };
        break;
      case 'factory':
        buildings.factory = { ...buildings.factory, count: buildings.factory.count + add };
        break;
      case 'bank':
        if (!buildings.bank.owned) {
          buildings.bank = { ...buildings.bank, owned: true };
        }
        break;
      case 'temple':
        if (!buildings.temple.owned) {
          buildings.temple = { ...buildings.temple, owned: true };
        }
        break;
      case 'wizard_tower':
        if (!buildings.wizard_tower.owned) {
          buildings.wizard_tower = { ...buildings.wizard_tower, owned: true };
        }
        break;
      case 'shipment':
        buildings.shipment = { ...buildings.shipment, count: buildings.shipment.count + add };
        break;
      case 'gem_farm':
        buildings.gem_farm = { ...buildings.gem_farm, count: buildings.gem_farm.count + add };
        break;
      case 'alchemy_lab':
        buildings.alchemy_lab = { ...buildings.alchemy_lab, count: buildings.alchemy_lab.count + add };
        break;
      case 'time_machine':
        buildings.time_machine = { ...buildings.time_machine, count: buildings.time_machine.count + add };
        break;
      case 'antimatter_condenser':
        if (!buildings.antimatter_condenser.owned) {
          buildings.antimatter_condenser = { ...buildings.antimatter_condenser, owned: true };
        }
        break;
      case 'prism':
        if (!buildings.prism.owned) {
          buildings.prism = { ...buildings.prism, owned: true };
        }
        break;
      case 'chancemaker':
        buildings.chancemaker = { ...buildings.chancemaker, count: buildings.chancemaker.count + add };
        break;
      case 'fractal_engine':
        buildings.fractal_engine = { ...buildings.fractal_engine, count: buildings.fractal_engine.count + add };
        break;
      default:
        break;
    }
  }

  return { ...prev, buildings };
}

export function addProgressiveLevels(prev: GameState, delta: number): GameState {
  if (delta <= 0) return prev;
  const pu = { ...prev.progressiveUpgrades };
  for (const u of PROGRESSIVE_UPGRADES) {
    pu[u.id] = Math.min(u.maxLevel, pu[u.id] + delta);
  }
  return { ...prev, progressiveUpgrades: pu };
}

export function addMiners(prev: GameState, n: number): GameState {
  if (n <= 0) return prev;
  return { ...prev, minerCount: prev.minerCount + n };
}

const POWERUP_KEYS: (keyof PowerupInventory)[] = [
  'miningFrenzy',
  'goldenTouch',
  'timeWarp',
  'luckyStrike',
  'buildingBoost',
];

export function addPowerupsEach(prev: GameState, perPowerup: number): GameState {
  if (perPowerup <= 0) return prev;
  const inv = { ...prev.powerupInventory };
  for (const k of POWERUP_KEYS) {
    inv[k] = inv[k] + perPowerup;
  }
  return { ...prev, powerupInventory: inv };
}

export function addForcedSideLevels(prev: GameState, n: number): GameState {
  if (n <= 0) return prev;
  let sideLevel = prev.sideLevel || 1;
  const buffs = { ...prev.sideLevelBuffs };
  for (let i = 0; i < n; i++) {
    if (sideLevel >= SIDE_LEVEL_MAX) break;
    const buff = rollSideLevelBuff();
    buffs[buff.stat] = (buffs[buff.stat] || 0) + buff.amount;
    sideLevel += 1;
  }
  const rock = getRockById(prev.currentRockId) || ROCKS[0];
  const newMaxHP = getScaledRockHP(rock.clicksToBreak, prev.prestigeCount, prev.isHardMode, sideLevel);
  return {
    ...prev,
    sideLevel,
    sideLevelBuffs: buffs,
    currentRockHP: Math.min(prev.currentRockHP, newMaxHP),
  };
}

export function pickRandomUnownedTrinkets(
  prev: GameState,
  count: number,
  rarityFilter?: TrinketRarity[]
): { next: GameState; names: string[] } {
  let s = prev;
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const pool = TRINKETS.filter(
      (t) =>
        (!rarityFilter || rarityFilter.includes(t.rarity)) && !s.ownedTrinketIds.includes(t.id)
    );
    if (!pool.length) break;
    const t = pool[Math.floor(Math.random() * pool.length)];
    s = { ...s, ownedTrinketIds: [...s.ownedTrinketIds, t.id] };
    names.push(`${t.name} (${t.rarity})`);
  }
  return { next: s, names };
}

function grantCrateBundle(
  prev: GameState,
  sketchy: number,
  suspicious: number,
  cursed: number,
  lines: string[]
): GameState {
  const tiers: MysteryBoxTier[] = [
    ...Array(Math.max(0, sketchy)).fill('sketchy' as const),
    ...Array(Math.max(0, suspicious)).fill('suspicious' as const),
    ...Array(Math.max(0, cursed)).fill('cursed' as const),
  ];
  if (tiers.length === 0) return prev;
  lines.push(
    `📦 ${tiers.length} promo crate(s) — open them one by one (${sketchy} Sketchy, ${suspicious} Suspicious, ${cursed} Cursed)`
  );
  return {
    ...prev,
    pendingPromoMysteryCrates: [...(prev.pendingPromoMysteryCrates || []), ...tiers],
  };
}

export type PromoRedeemResult =
  | { ok: true; next: GameState; rewardsSummary: string[] }
  | { ok: false; error: string };

const Q_500 = 500_000_000_000_000_000; // 500Q

export function applyPromoCode(
  prev: GameState,
  code: PromoCodeId,
  userId: string | null
): PromoRedeemResult {
  if ((prev.redeemedPromoCodes || []).includes(code)) {
    return { ok: false, error: 'This code was already redeemed on this save.' };
  }

  let s: GameState = {
    ...prev,
    redeemedPromoCodes: [...(prev.redeemedPromoCodes || []), code],
  };
  const lines: string[] = [];

  if (code === 'CODES') {
    lines.push('Code CODES redeemed!');
    s = addMiners(s, 150);
    lines.push('+150 miners');
    s = addToAllBuildings(s, 2);
    lines.push('+2 to all buildings (path/max enforced)');
    s = addProgressiveLevels(s, 50);
    lines.push('+50 levels on each progressive upgrade');
    s = {
      ...s,
      heavenlyChips: (s.heavenlyChips || 0) + 15,
      prestigeTokens: s.prestigeTokens + 15,
      stokens: s.stokens + 10,
    };
    lines.push('+15 Heavenly Chips, +15 prestige tokens, +10 Stokens');
    s = addPowerupsEach(s, 1);
    lines.push('+1 of each powerup');
    s = addForcedSideLevels(s, 10);
    lines.push('+10 side levels (forced)');
    const tri = pickRandomUnownedTrinkets(s, 1);
    s = tri.next;
    if (tri.names.length) lines.push(`Random trinket: ${tri.names[0]}`);
    else lines.push('Random trinket: none available (you own all)');
    s = grantCrateBundle(s, 4, 2, 1, lines);
    return { ok: true, next: s, rewardsSummary: lines };
  }

  lines.push('Code SORRY4DOWN redeemed!');
  // Miners must be granted *after* applyForcedPrestigeChain — each forced prestige sets minerCount to 0
  s = addToAllBuildings(s, 10);
  lines.push('+10 to all buildings');
  s = addProgressiveLevels(s, 100);
  lines.push('+100 levels on each progressive upgrade');
  s = {
    ...s,
    heavenlyChips: (s.heavenlyChips || 0) + 35,
    prestigeTokens: s.prestigeTokens + 25,
  };
  lines.push('+35 Heavenly Chips, +25 prestige tokens');
  s = addPowerupsEach(s, 5);
  lines.push('+5 of each powerup');
  s = { ...s, stokens: s.stokens + 25 };
  lines.push('+25 Stokens');
  s = addForcedSideLevels(s, 25);
  lines.push('+25 side levels (forced)');

  const epicPool = ['epic', 'legendary', 'mythic', 'secret'] as TrinketRarity[];
  const epicPick = pickRandomUnownedTrinkets(s, 1, epicPool);
  if (epicPick.names.length) {
    s = epicPick.next;
    lines.push(`Epic+ trinket: ${epicPick.names[0]}`);
  } else {
    s = {
      ...s,
      promoPermanentBonuses: {
        luckBonus: (s.promoPermanentBonuses.luckBonus || 0) + 2,
        dropChanceBonus: (s.promoPermanentBonuses.dropChanceBonus || 0) + 2,
      },
    };
    lines.push('+2 permanent luck and +2 permanent drop chance (no epic+ trinkets left)');
  }

  s = grantCrateBundle(s, 8, 4, 2, lines);

  s = grantD1PlayerPack(s);
  lines.push('D1 Player Pack unlocked (permanent)');

  const seven = pickRandomUnownedTrinkets(s, 7);
  s = seven.next;
  if (seven.names.length) lines.push(`+${seven.names.length} random trinkets: ${seven.names.join('; ')}`);
  else lines.push('+7 random trinkets: none left to grant');

  s = applyForcedPrestigeChain(s, userId, 8);
  lines.push('Applied 8× full prestige (progress reset; D1 / promo unlocks kept)');

  s = addMiners(s, 500);
  lines.push('+500 miners (after prestiges)');

  s = {
    ...s,
    yatesDollars: safeAdd(s.yatesDollars, Q_500),
    totalMoneyEarned: safeAdd(s.totalMoneyEarned || 0, Q_500),
  };
  lines.push('+$500Q (applied after prestiges)');

  return { ok: true, next: s, rewardsSummary: lines };
}
