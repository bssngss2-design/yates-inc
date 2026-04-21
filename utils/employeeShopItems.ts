export type ShopCurrency = 'yates' | 'walters';

export type ShopEffectType =
  | 'chair_paycheck_boost'     // -20% pay_interval (permanent, one-time buy)
  | 'nasa_pc_productivity'     // cosmetic productivity stat (permanent, one-time buy)
  | 'energy_bomb'              // walking bomb on screen for 2 days (time-based)
  | 'motivation_pack'          // spawns a clickable pill (uses_remaining, consumable)
  | 'promotion_yellow_name'    // bright yellow name across the site (permanent, one-time buy)
  | 'caffeine_overdose'        // consumable: 5x boost 30s then 0.5x crash 2min
  | 'office_plant'             // stackable (max 5): +1% passive income per stack, permanent
  ;

export interface ShopItem {
  id: string;
  name: string;
  tagline: string;       // short marketing line
  description: string;   // longer explanation of what actually happens
  price: number;
  currency: ShopCurrency;
  image?: string;        // /public/shop/ path. If absent, renders the inline illustration below.
  effectType: ShopEffectType;
  /** If true, purchasing again is blocked once the effect exists. */
  oneTime: boolean;
  /** For consumables (motivation pack): how many "uses" a single purchase adds. */
  usesPerPurchase?: number;
  /** For time-based effects (energy bomb): how long the effect lasts, in ms. */
  durationMs?: number;
  /** For stackable permanent items (office plant): cap on uses_remaining. */
  maxStacks?: number;
}

export const EMPLOYEE_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'super_good_chair',
    name: 'Super Good Chair',
    tagline: 'Make your paycheck come 20% earlier!',
    description:
      'Reduces your pay interval by 20%. Permanent — as long as you never lose your chair.',
    price: 23_999_999,
    currency: 'yates',
    image: '/shop/Supergoodchair.jpeg',
    effectType: 'chair_paycheck_boost',
    oneTime: true,
  },
  {
    id: 'nasa_pc',
    name: 'NASA PC',
    tagline: 'Increase productivity by 100%',
    description:
      'Flexes on the nerds. Productivity goes up 100% (on paper). Cosmetic display for your employee page.',
    price: 130_872_999,
    currency: 'yates',
    image: '/shop/NasaPC.png',
    effectType: 'nasa_pc_productivity',
    oneTime: true,
  },
  {
    id: 'super_energy_bomb',
    name: 'Super Energy Bomb',
    tagline: 'Keep you fully awake for 2 days',
    description:
      'A loud angry little bomb walks across your screen for 48 hours to keep you alert. Side effects: existential dread, caffeine crashes.',
    price: 200_000,
    currency: 'yates',
    image: '/shop/Superenergybomb.png',
    effectType: 'energy_bomb',
    oneTime: false,
    durationMs: 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'motivation_pack',
    name: 'Motivation Pack',
    tagline: 'Work for next week no problem',
    description:
      'Drops a clickable pill. Pop it for a 1-minute 100% boost to EVERYTHING in the game. One per purchase.',
    price: 9_999_999,
    currency: 'yates',
    image: '/shop/MotivationPack.png',
    effectType: 'motivation_pack',
    oneTime: false,
    usesPerPurchase: 1,
  },
  {
    id: 'caffeine_overdose',
    name: 'Caffeine Overdose',
    tagline: '5x boost for 30 seconds — then you CRASH',
    description:
      'Chug it and get 5x click power + 5x earnings for 30 seconds. Right after, you crash: 2 minutes at HALF speed. Use it to nuke a prestige or regret it forever.',
    price: 800_000,
    currency: 'yates',
    image: '/shop/CaffeineOverdose.png',
    effectType: 'caffeine_overdose',
    oneTime: false,
    usesPerPurchase: 1,
  },
  {
    id: 'office_plant',
    name: 'Office Plant',
    tagline: '+1% passive income per plant (max 5)',
    description:
      'A single boring monstera. Gives +1% passive income permanently. Stack up to 5 plants for a whole +5% jungle of productivity.',
    price: 500_000,
    currency: 'yates',
    image: '/shop/OfficePlant.png',
    effectType: 'office_plant',
    oneTime: false,
    usesPerPurchase: 1,
    maxStacks: 5,
  },
  {
    id: 'promotion_certificate',
    name: 'Promotion Certificate',
    tagline: 'Your name EVERYWHERE will be bright yellow!',
    description:
      'Buys you a shiny yellow name across the entire site. Permanent. Makes you feel important.',
    price: 100_000_000,
    currency: 'yates',
    image: '/shop/promotion.png',
    effectType: 'promotion_yellow_name',
    oneTime: true,
  },
];

export function getShopItem(id: string): ShopItem | undefined {
  return EMPLOYEE_SHOP_ITEMS.find((i) => i.id === id);
}
