import type { ActiveBuff, GameState, TrinketRarity } from '@/types/game';
import { TRINKETS } from '@/types/game';

export type MysteryBoxTier = 'sketchy' | 'suspicious' | 'cursed';

const COSTS: Record<MysteryBoxTier, number> = {
  sketchy: 500_000,
  suspicious: 50_000_000,
  cursed: 5_000_000_000,
};

const buffTypes: Array<'clickSpeed' | 'damage' | 'money' | 'allStats'> = [
  'clickSpeed',
  'damage',
  'money',
  'allStats',
];

function buffLabel(t: string): string {
  return t === 'money' ? 'Money' : t === 'damage' ? 'Damage' : t === 'clickSpeed' ? 'Click Speed' : 'All Stats';
}

function randomBuff(): 'clickSpeed' | 'damage' | 'money' | 'allStats' {
  return buffTypes[Math.floor(Math.random() * buffTypes.length)];
}

function fmtCash(cashBonus: number): string {
  if (cashBonus >= 1e12) return `${(cashBonus / 1e12).toFixed(1)}T`;
  if (cashBonus >= 1e9) return `${(cashBonus / 1e9).toFixed(1)}B`;
  if (cashBonus >= 1e6) return `${(cashBonus / 1e6).toFixed(1)}M`;
  if (cashBonus >= 1e3) return `${(cashBonus / 1e3).toFixed(1)}K`;
  return String(Math.floor(cashBonus));
}

/** Promo / compensation: same tier bands as paid boxes, but never charged and never "nothing" on sketchy. */
export function grantPromoMysteryBox(prev: GameState, tier: MysteryBoxTier): { next: GameState; message: string } {
  let next: GameState = { ...prev };
  let rewardMsg = '';

  if (tier === 'sketchy') {
    let roll = Math.random() * 100;
    if (roll >= 90) roll = Math.random() * 90;
    if (roll < 50) {
      const cashBonus = Math.floor(prev.yatesDollars * 0.1);
      next.yatesDollars = prev.yatesDollars + cashBonus;
      next.totalMoneyEarned = (prev.totalMoneyEarned || 0) + cashBonus;
      rewardMsg = `💰 +$${fmtCash(cashBonus)} (10% of your money)`;
    } else {
      const bt = randomBuff();
      const pct = 10 + Math.floor(Math.random() * 41);
      const dur = (10 + Math.floor(Math.random() * 21)) * 1000;
      const buff: ActiveBuff = {
        id: `sam_promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: bt,
        multiplier: pct / 100,
        duration: dur,
        startTime: Date.now(),
        source: 'shadySam',
        name: `Sam's ${buffLabel(bt)}`,
        icon: '🕶️',
      };
      next.activeBuffs = [...prev.activeBuffs, buff];
      rewardMsg = `⚡ +${pct}% ${buffLabel(bt)} for ${Math.round(dur / 1000)}s`;
    }
  } else if (tier === 'suspicious') {
    const roll = Math.random() * 100;
    if (roll < 40) {
      next.stokens = (prev.stokens || 0) + 5;
      rewardMsg = '💎 +5 Stokens!';
    } else if (roll < 60) {
      const cashBonus = Math.floor(prev.yatesDollars * 0.4);
      next.yatesDollars = prev.yatesDollars + cashBonus;
      next.totalMoneyEarned = (prev.totalMoneyEarned || 0) + cashBonus;
      rewardMsg = `💰 +$${fmtCash(cashBonus)} (40% of your money)`;
    } else if (roll < 90) {
      const bt = randomBuff();
      const pct = 50 + Math.floor(Math.random() * 51);
      const dur = (30 + Math.floor(Math.random() * 31)) * 1000;
      const buff: ActiveBuff = {
        id: `sam_promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: bt,
        multiplier: pct / 100,
        duration: dur,
        startTime: Date.now(),
        source: 'shadySam',
        name: `Sam's ${buffLabel(bt)}`,
        icon: '💪',
      };
      next.activeBuffs = [...prev.activeBuffs, buff];
      rewardMsg = `⚡ +${pct}% ${buffLabel(bt)} for ${Math.round(dur / 1000)}s`;
    } else {
      const validRarities: TrinketRarity[] = ['common', 'rare', 'epic', 'legendary'];
      const pool = TRINKETS.filter((t) => validRarities.includes(t.rarity) && !prev.ownedTrinketIds.includes(t.id));
      if (pool.length > 0) {
        const trinket = pool[Math.floor(Math.random() * pool.length)];
        next.ownedTrinketIds = [...prev.ownedTrinketIds, trinket.id];
        rewardMsg = `🔮 ${trinket.name} (${trinket.rarity}) trinket!`;
      } else {
        next.stokens = (prev.stokens || 0) + 10;
        rewardMsg = '💎 +10 Stokens! (you own all eligible trinkets)';
      }
    }
  } else {
    const roll = Math.random() * 100;
    if (roll < 50) {
      const cashBonus = Math.floor(prev.yatesDollars * 0.6);
      next.yatesDollars = prev.yatesDollars + cashBonus;
      next.totalMoneyEarned = (prev.totalMoneyEarned || 0) + cashBonus;
      rewardMsg = `💰 +$${fmtCash(cashBonus)} (60% of your money)`;
    } else if (roll < 90) {
      const bt = randomBuff();
      const pct = 100 + Math.floor(Math.random() * 201);
      const dur = (60 + Math.floor(Math.random() * 121)) * 1000;
      const buff: ActiveBuff = {
        id: `sam_promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: bt,
        multiplier: pct / 100,
        duration: dur,
        startTime: Date.now(),
        source: 'shadySam',
        name: `Sam's ${buffLabel(bt)}`,
        icon: '🔥',
      };
      next.activeBuffs = [...prev.activeBuffs, buff];
      rewardMsg = `🔥 +${pct}% ${buffLabel(bt)} for ${Math.round(dur / 1000)}s`;
    } else {
      const validRarities: TrinketRarity[] = ['epic', 'legendary', 'mythic', 'secret'];
      const pool = TRINKETS.filter((t) => validRarities.includes(t.rarity) && !prev.ownedTrinketIds.includes(t.id));
      if (pool.length > 0) {
        const trinket = pool[Math.floor(Math.random() * pool.length)];
        next.ownedTrinketIds = [...prev.ownedTrinketIds, trinket.id];
        rewardMsg = `✨ ${trinket.name} (${trinket.rarity}) trinket!`;
      } else {
        next.stokens = (prev.stokens || 0) + 25;
        rewardMsg = '💎 +25 Stokens! (you own all eligible trinkets)';
      }
    }
  }

  return { next, message: rewardMsg };
}

export type OpenPaidBoxResult = { next: GameState; message: string; isGood: boolean } | null;

/** Paid Shady Sam box — deducts cost, may return null if unaffordable. */
export function openPaidMysteryBox(prev: GameState, tier: MysteryBoxTier): OpenPaidBoxResult {
  const cost = COSTS[tier];
  if (prev.yatesDollars < cost) return null;

  let next: GameState = { ...prev, yatesDollars: prev.yatesDollars - cost };
  const roll = Math.random() * 100;
  let rewardMsg = '';
  let isGood = true;

  if (tier === 'sketchy') {
    if (roll < 50) {
      const cashBonus = Math.floor(prev.yatesDollars * 0.1);
      next.yatesDollars += cashBonus;
      next.totalMoneyEarned = (prev.totalMoneyEarned || 0) + cashBonus;
      rewardMsg = `💰 +$${fmtCash(cashBonus)} (10% of your money)`;
    } else if (roll < 90) {
      const bt = randomBuff();
      const pct = 10 + Math.floor(Math.random() * 41);
      const dur = (10 + Math.floor(Math.random() * 21)) * 1000;
      next.activeBuffs = [
        ...prev.activeBuffs,
        {
          id: `sam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: bt,
          multiplier: pct / 100,
          duration: dur,
          startTime: Date.now(),
          source: 'shadySam',
          name: `Sam's ${buffLabel(bt)}`,
          icon: '🕶️',
        },
      ];
      rewardMsg = `⚡ +${pct}% ${buffLabel(bt)} for ${Math.round(dur / 1000)}s`;
    } else {
      isGood = false;
      rewardMsg = '😐 Nothing... Sam shrugs';
    }
  } else if (tier === 'suspicious') {
    if (roll < 40) {
      next.stokens = (prev.stokens || 0) + 5;
      rewardMsg = '💎 +5 Stokens!';
    } else if (roll < 60) {
      const cashBonus = Math.floor(prev.yatesDollars * 0.4);
      next.yatesDollars += cashBonus;
      next.totalMoneyEarned = (prev.totalMoneyEarned || 0) + cashBonus;
      rewardMsg = `💰 +$${fmtCash(cashBonus)} (40% of your money)`;
    } else if (roll < 90) {
      const bt = randomBuff();
      const pct = 50 + Math.floor(Math.random() * 51);
      const dur = (30 + Math.floor(Math.random() * 31)) * 1000;
      next.activeBuffs = [
        ...prev.activeBuffs,
        {
          id: `sam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: bt,
          multiplier: pct / 100,
          duration: dur,
          startTime: Date.now(),
          source: 'shadySam',
          name: `Sam's ${buffLabel(bt)}`,
          icon: '💪',
        },
      ];
      rewardMsg = `⚡ +${pct}% ${buffLabel(bt)} for ${Math.round(dur / 1000)}s`;
    } else {
      const validRarities: TrinketRarity[] = ['common', 'rare', 'epic', 'legendary'];
      const pool = TRINKETS.filter((t) => validRarities.includes(t.rarity) && !prev.ownedTrinketIds.includes(t.id));
      if (pool.length > 0) {
        const trinket = pool[Math.floor(Math.random() * pool.length)];
        next.ownedTrinketIds = [...prev.ownedTrinketIds, trinket.id];
        rewardMsg = `🔮 ${trinket.name} (${trinket.rarity}) trinket!`;
      } else {
        next.stokens = (prev.stokens || 0) + 10;
        rewardMsg = '💎 +10 Stokens! (you own all eligible trinkets)';
      }
    }
    isGood = true;
  } else {
    if (roll < 50) {
      const cashBonus = Math.floor(prev.yatesDollars * 0.6);
      next.yatesDollars += cashBonus;
      next.totalMoneyEarned = (prev.totalMoneyEarned || 0) + cashBonus;
      rewardMsg = `💰 +$${fmtCash(cashBonus)} (60% of your money)`;
    } else if (roll < 90) {
      const bt = randomBuff();
      const pct = 100 + Math.floor(Math.random() * 201);
      const dur = (60 + Math.floor(Math.random() * 121)) * 1000;
      next.activeBuffs = [
        ...prev.activeBuffs,
        {
          id: `sam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: bt,
          multiplier: pct / 100,
          duration: dur,
          startTime: Date.now(),
          source: 'shadySam',
          name: `Sam's ${buffLabel(bt)}`,
          icon: '🔥',
        },
      ];
      rewardMsg = `🔥 +${pct}% ${buffLabel(bt)} for ${Math.round(dur / 1000)}s`;
    } else {
      const validRarities: TrinketRarity[] = ['epic', 'legendary', 'mythic', 'secret'];
      const pool = TRINKETS.filter((t) => validRarities.includes(t.rarity) && !prev.ownedTrinketIds.includes(t.id));
      if (pool.length > 0) {
        const trinket = pool[Math.floor(Math.random() * pool.length)];
        next.ownedTrinketIds = [...prev.ownedTrinketIds, trinket.id];
        rewardMsg = `✨ ${trinket.name} (${trinket.rarity}) trinket!`;
      } else {
        next.stokens = (prev.stokens || 0) + 25;
        rewardMsg = '💎 +25 Stokens! (you own all eligible trinkets)';
      }
    }
    isGood = true;
  }

  return { next, message: rewardMsg, isGood };
}
