/**
 * Single forced prestige transition — same rules as GameContext prestige(force=true).
 * Used for promo code chains without duplicate React state bugs.
 */
import type { GameState } from '@/types/game';
import { ROCKS } from '@/lib/gameData';
import {
  getScaledRockHP,
  getDefaultBuildingStates,
  HARD_MODE_MODIFIERS,
  MAX_PRESTIGE_WITH_BUFFS,
  PRESTIGE_TOKENS_PER_PRESTIGE,
  YATES_ACCOUNT_ID,
  D1_PICKAXE_ID,
} from '@/types/game';

export function applySingleForcedPrestige(prev: GameState, userId: string | null): GameState {
  const isYates = userId === YATES_ACCOUNT_ID;
  const ownsTotem = prev.ownedTrinketIds.includes('totem');
  const hasProtection = ownsTotem;
  const keepsMoney = isYates || hasProtection;
  const newPrestigeCount = prev.prestigeCount + 1;
  const isPastMaxPrestige = prev.prestigeCount >= MAX_PRESTIGE_WITH_BUFFS;
  const newMultiplier = isPastMaxPrestige ? prev.prestigeMultiplier : 1.0 + newPrestigeCount * 0.1;
  const tokensToAdd = isPastMaxPrestige ? 0 : PRESTIGE_TOKENS_PER_PRESTIGE;

  const prestigeTime = Date.now() - (prev.gameStartTime || Date.now());
  const newFastestTime =
    prev.fastestPrestigeTime === null ? prestigeTime : Math.min(prev.fastestPrestigeTime, prestigeTime);

  let newOwnedTrinketIds = prev.ownedTrinketIds;
  let newEquippedTrinketIds = prev.equippedTrinketIds;
  let newOwnedRelicIds = prev.ownedRelicIds;
  let newOwnedTalismanIds = prev.ownedTalismanIds;

  if (prev.isHardMode && newPrestigeCount % HARD_MODE_MODIFIERS.trinketWipeInterval === 0) {
    const keepCount = HARD_MODE_MODIFIERS.trinketKeepCount;
    const keptTrinkets = [...prev.equippedTrinketIds].slice(0, keepCount);
    if (keptTrinkets.length < keepCount) {
      const relicBases = prev.ownedRelicIds.map((id) => id.replace('_relic', ''));
      const talismanBases = prev.ownedTalismanIds.map((id) => id.replace('_talisman', ''));
      const converted = [...new Set([...relicBases, ...talismanBases])];
      for (const id of converted) {
        if (keptTrinkets.length >= keepCount) break;
        if (!keptTrinkets.includes(id)) keptTrinkets.push(id);
      }
    }
    if (keptTrinkets.length < keepCount) {
      for (const id of prev.ownedTrinketIds) {
        if (keptTrinkets.length >= keepCount) break;
        if (!keptTrinkets.includes(id)) keptTrinkets.push(id);
      }
    }
    newOwnedTrinketIds = keptTrinkets;
    newEquippedTrinketIds = prev.equippedTrinketIds.filter((id) => keptTrinkets.includes(id));
    newOwnedRelicIds = prev.ownedRelicIds.filter((id) => keptTrinkets.includes(id.replace('_relic', '')));
    newOwnedTalismanIds = prev.ownedTalismanIds.filter((id) =>
      keptTrinkets.includes(id.replace('_talisman', ''))
    );
  } else if (hasProtection) {
    newOwnedTrinketIds = prev.ownedTrinketIds.filter((id) => id !== 'totem');
    newEquippedTrinketIds = prev.equippedTrinketIds.filter((id) => id !== 'totem');
  }

  const ASCENSION_RESET_BUILDINGS = [
    'mine',
    'factory',
    'gem_farm',
    'alchemy_lab',
    'time_machine',
    'chancemaker',
    'fractal_engine',
  ] as const;
  let newBuildings = prev.isHardMode
    ? getDefaultBuildingStates()
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
  if (!prev.isHardMode && newPrestigeCount >= 10) {
    for (const bId of ASCENSION_RESET_BUILDINGS) {
      if (newBuildings[bId]) {
        newBuildings = {
          ...newBuildings,
          [bId]: { ...newBuildings[bId], count: 0, level: 0 },
        };
      }
    }
  }

  let hcFromGems = 0;
  let hcFromMoney = 0;
  let newGems = prev.gems || 0;

  if (newPrestigeCount >= 10) {
    if (newPrestigeCount === 10) {
      hcFromGems = 0;
      hcFromMoney = 1;
      newGems = 0;
    } else {
      hcFromGems = Math.floor((prev.gems || 0) / 25);
      newGems = (prev.gems || 0) % 25;
      hcFromMoney = Math.floor(prev.yatesDollars / 1_000_000_000_000);
    }
  }
  const totalNewHC = hcFromGems + hcFromMoney;

  return {
    ...prev,
    currentRockId: 1,
    currentRockHP: getScaledRockHP(
      ROCKS[0].clicksToBreak,
      newPrestigeCount,
      prev.isHardMode,
      prev.sideLevel || 0
    ),
    currentPickaxeId: 1,
    ownedPickaxeIds: prev.hasD1PlayerPack ? [1, D1_PICKAXE_ID] : [1],
    totalClicks: 0,
    minerCount: 0,
    yatesDollars: keepsMoney ? prev.yatesDollars : 0,
    ownedTrinketIds: newOwnedTrinketIds,
    equippedTrinketIds: newEquippedTrinketIds,
    ownedRelicIds: newOwnedRelicIds,
    ownedTalismanIds: newOwnedTalismanIds,
    prestigeCount: newPrestigeCount,
    prestigeMultiplier: newMultiplier,
    prestigeTokens: prev.prestigeTokens + tokensToAdd,
    stokens: prev.stokens + (newPrestigeCount % 5 === 0 ? 1 : 0),
    hasTotemProtection: false,
    fastestPrestigeTime: newFastestTime,
    gameStartTime: Date.now(),
    buildings: newBuildings,
    hardModePrestigeCount: prev.isHardMode ? prev.hardModePrestigeCount + 1 : prev.hardModePrestigeCount,
    gems: newGems,
    heavenlyChips: (prev.heavenlyChips || 0) + totalNewHC,
    totalHCEarned: (prev.totalHCEarned || 0) + totalNewHC,
    totalMoneyEarnedAtPrestigeStart: prev.totalMoneyEarned,
  };
}

export function applyForcedPrestigeChain(prev: GameState, userId: string | null, times: number): GameState {
  let s = prev;
  for (let i = 0; i < times; i++) {
    s = applySingleForcedPrestige(s, userId);
  }
  return s;
}
