/**
 * Matches passive $ income from GameContext ticks (mine, fractal, gem farm)
 * for the “Money per sec” HUD. Miner DPS is estimated separately in MiningGame.
 */
import type { GameState, Rock } from '@/types/game';
import {
  D1_PICKAXE_ID,
  MINER_BASE_DAMAGE,
  PRESTIGE_UPGRADES,
  RELIC_MULTIPLIERS,
  TALISMAN_MULTIPLIERS,
  TRINKETS,
  getSpecialTrinketOverride,
  sumAscensionEffects,
  sumProgressiveUpgradeBonuses,
} from '@/types/game';
import { getPickaxeById } from '@/lib/gameData';

/** Mine tick money/damage bonuses (excludes minerMoneyBonus on trinkets — same as GameContext). */
function computeMineBuildingBonuses(state: GameState): { moneyBonus: number; damageBonus: number } {
  let moneyBonus = 0;
  let damageBonus = 0;
  let yOvMoney = 0;
  let yOvDamage = 0;

  for (const itemId of state.equippedTrinketIds) {
    const isRelic = itemId.endsWith('_relic');
    const isTalisman = itemId.endsWith('_talisman');
    const baseId = isRelic ? itemId.replace('_relic', '') : isTalisman ? itemId.replace('_talisman', '') : itemId;
    const trinket = TRINKETS.find((t) => t.id === baseId);
    if (!trinket) continue;
    const specialEff = getSpecialTrinketOverride(baseId, isRelic, isTalisman);
    const e = specialEff || trinket.effects;
    const multiplier = specialEff
      ? 1
      : isRelic
        ? RELIC_MULTIPLIERS[trinket.rarity] || 1
        : isTalisman
          ? TALISMAN_MULTIPLIERS[trinket.rarity] || 1
          : 1;
    if (specialEff) {
      yOvMoney += ((e.moneyBonus || 0) + (e.allBonus || 0)) * multiplier;
      yOvDamage += ((e.minerDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
    } else {
      moneyBonus += ((e.moneyBonus || 0) + (e.allBonus || 0)) * multiplier;
      damageBonus += ((e.minerDamageBonus || 0) + (e.allBonus || 0)) * multiplier;
    }
  }
  moneyBonus += yOvMoney;
  damageBonus += yOvDamage;

  for (const upgradeId of state.ownedPrestigeUpgradeIds) {
    const upgrade = PRESTIGE_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) continue;
    const allB = upgrade.effects.allBonus || 0;
    moneyBonus += (upgrade.effects.moneyBonus || 0) + allB;
    damageBonus += (upgrade.effects.minerDamageBonus || 0) + allB;
  }

  const prog = sumProgressiveUpgradeBonuses(state.progressiveUpgrades);
  moneyBonus += prog.moneyBonus;
  damageBonus += prog.minerDamageBonus + prog.minerSpeedBonus + prog.rockDamageBonus;

  const templeRank = state.buildings.temple.equippedRank;
  const templeValues: Record<number, { money: number; pcxDamage: number }> = {
    1: { money: 0.27, pcxDamage: 0.36 },
    2: { money: 0.55, pcxDamage: 0.73 },
    3: { money: 0.90, pcxDamage: 1.20 },
  };
  if (templeRank && state.chosenPath === 'light') {
    const bonus = templeValues[templeRank];
    if (bonus) {
      moneyBonus += bonus.money;
      damageBonus += bonus.pcxDamage;
    }
  }

  const minePassiveAscEff = sumAscensionEffects(state.ownedAscensionNodeIds || []);
  if (
    state.buildings.wizard_tower.ritualActive &&
    state.buildings.wizard_tower.ritualEndTime &&
    Date.now() < state.buildings.wizard_tower.ritualEndTime
  ) {
    const mineRitualMult = 3.0 + minePassiveAscEff.wizardPowerBonus;
    moneyBonus = (1 + moneyBonus) * mineRitualMult - 1;
    damageBonus = (1 + damageBonus) * mineRitualMult - 1;
  }

  if (state.hasD1PlayerPack && state.currentPickaxeId === D1_PICKAXE_ID) {
    moneyBonus *= 3;
    damageBonus *= 3;
  }

  return { moneyBonus, damageBonus };
}

/** Mine building: rock-DPS mode or temple rank 2/3 click-% mode (same rules as GameContext). */
export function estimateMineBuildingMoneyPerSec(state: GameState, rock: Rock, scaledRockMaxHP: number): number {
  if (state.isBlocked || state.buildings.mine.count <= 0) return 0;
  const mineCount = state.buildings.mine.count;
  const hp = Math.max(1, scaledRockMaxHP);
  const { moneyBonus, damageBonus } = computeMineBuildingBonuses(state);
  const asc = sumAscensionEffects(state.ownedAscensionNodeIds || []);
  const templeRank = state.buildings.temple.equippedRank;

  if (templeRank === 2 || templeRank === 3) {
    const pickaxe = getPickaxeById(state.currentPickaxeId);
    const pickMult = pickaxe?.moneyMultiplier ?? 1;
    let clickMoney =
      rock.moneyPerClick *
      state.prestigeMultiplier *
      pickMult *
      (1 + moneyBonus) *
      (1 + asc.buildingBonus);
    let passiveMoney = clickMoney * 0.2 * mineCount;
    if (state.hasD1PlayerPack && state.currentPickaxeId === D1_PICKAXE_ID) {
      passiveMoney *= 2.5;
    }
    return passiveMoney * 2;
  }

  const minerEquivalents = mineCount * 20;
  const mineDps = Math.ceil(minerEquivalents * MINER_BASE_DAMAGE * (1 + damageBonus));
  let moneyPerBreak =
    rock.moneyPerBreak * state.prestigeMultiplier * (1 + moneyBonus) * (1 + asc.buildingBonus);
  if (state.hasD1PlayerPack && state.currentPickaxeId === D1_PICKAXE_ID) {
    moneyPerBreak *= 2.5;
  }
  return (mineDps * moneyPerBreak) / hp;
}

export function estimateFractalEngineMoneyPerSec(state: GameState): number {
  const count = state.buildings.fractal_engine?.count || 0;
  if (count <= 0) return 0;
  const totalBuildingCount =
    (state.buildings.mine?.count || 0) +
    (state.buildings.factory?.count || 0) +
    (state.buildings.gem_farm?.count || 0) +
    (state.buildings.alchemy_lab?.count || 0) +
    (state.buildings.time_machine?.count || 0) +
    (state.buildings.chancemaker?.count || 0) +
    (state.buildings.fractal_engine?.count || 0) +
    (state.buildings.shipment?.count || 0);
  const specialBuildingCount =
    (state.buildings.bank?.owned ? 1 : 0) +
    (state.buildings.temple?.owned ? 1 : 0) +
    (state.buildings.wizard_tower?.owned ? 1 : 0);
  const pickaxeCount = state.ownedPickaxeIds?.length || 0;
  const fractalAscEff = sumAscensionEffects(state.ownedAscensionNodeIds || []);
  const buildingBonus = totalBuildingCount * 0.01 + specialBuildingCount * 0.05 + fractalAscEff.buildingBonus;
  const pickaxeBonus = pickaxeCount * 0.005;
  const baseIncome = 15_000_000_000;
  return baseIncome * count * (1 + buildingBonus + pickaxeBonus);
}

export function estimateGemFarmMoneyPerSec(state: GameState): number {
  const count = state.buildings.gem_farm?.count || 0;
  return (500 * count) / 60;
}

export function estimateNonMinerBuildingMoneyPerSec(
  state: GameState,
  rock: Rock,
  scaledRockMaxHP: number,
): number {
  return (
    estimateMineBuildingMoneyPerSec(state, rock, scaledRockMaxHP) +
    estimateFractalEngineMoneyPerSec(state) +
    estimateGemFarmMoneyPerSec(state)
  );
}
