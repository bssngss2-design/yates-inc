export type ShopCurrency = 'yates' | 'walters';

export type ShopEffectType =
  | 'chair_paycheck_boost'     // -20% pay_interval (permanent, one-time buy)
  | 'nasa_pc_productivity'     // cosmetic productivity stat (permanent, one-time buy)
  | 'energy_bomb'              // walking bomb on screen for 2 days (time-based)
  | 'motivation_pack'          // spawns a clickable pill (uses_remaining, consumable)
  | 'promotion_yellow_name'    // bright yellow name across the site (permanent, one-time buy)
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
