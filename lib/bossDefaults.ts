import { BossItem, StatBonuses, BossItemSlot, getItemById } from './bossItems';

export interface BossStats {
    health: number;
    dmg: number;
    speed: number;
    atkSpeed: number;
    defense: number;
    dodge: number;
    mana: number;
    hpRegen: number; // HP per 3s out-of-combat
    crit: number;
}

export const DEFAULT_BOSS_STATS: BossStats = {
    health: 120,
    dmg: 15,
    speed: 5,
    atkSpeed: 5,
    defense: 10,
    dodge: 1,
    mana: 25,
    hpRegen: 1,
    crit: 5,
};

export type BossLoadout = Partial<Record<BossItemSlot, string>>; // slot -> itemId

/**
 * Layer item bonuses on top of the base stats.
 * "+X% all stats" effects apply to everything in the table including HP regen and Mana.
 */
export function calculateComputedStats(
    baseStats: BossStats,
    loadout: BossLoadout,
): BossStats {
    const equipped: BossItem[] = (Object.values(loadout)
        .filter(Boolean) as string[])
        .map(getItemById)
        .filter((i): i is BossItem => Boolean(i));

    const totals: Required<StatBonuses> = {
        healthPct: 0, dmgPct: 0, defPct: 0, speedPct: 0, atkSpeedPct: 0,
        dodgePct: 0, critPct: 0, healPct: 0, dmgReducPct: 0, hpRegenPct: 0,
        flatHP: 0, flatMana: 0, flatDmg: 0,
    };

    for (const item of equipped) {
        for (const k of Object.keys(item.bonuses) as (keyof StatBonuses)[]) {
            const v = item.bonuses[k] ?? 0;
            totals[k] = (totals[k] ?? 0) + v;
        }
    }

    return {
        health:   Math.round(baseStats.health   * (1 + totals.healthPct / 100)) + totals.flatHP,
        dmg:      Math.round(baseStats.dmg      * (1 + totals.dmgPct / 100))    + totals.flatDmg,
        speed:    +(baseStats.speed             * (1 + totals.speedPct / 100)).toFixed(2),
        atkSpeed: +(baseStats.atkSpeed          * (1 + totals.atkSpeedPct / 100)).toFixed(2),
        defense:  Math.round(baseStats.defense  * (1 + totals.defPct / 100)),
        dodge:    +(baseStats.dodge             + totals.dodgePct).toFixed(1),
        mana:     Math.round(baseStats.mana)    + totals.flatMana,
        hpRegen:  +(baseStats.hpRegen           * (1 + totals.hpRegenPct / 100)).toFixed(2),
        crit:     +(baseStats.crit              + totals.critPct).toFixed(1),
    };
}
