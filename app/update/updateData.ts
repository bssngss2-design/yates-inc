export interface UpdateEntry {
  date: string;
  title: string;
  major?: boolean;
  upcoming?: boolean;
  bullets: string[];
}

export const UPDATE_LOG: UpdateEntry[] = [
  {
    date: 'Coming Soon',
    title: 'Boss Update',
    major: true,
    upcoming: true,
    bullets: [
      'New boss encounters coming to the game.',
      'More details to be announced.',
    ],
  },
  {
    date: 'Somewhere in between the 18th - Sunday',
    title: 'Grimoires Update',
    major: false,
    upcoming: false,
    bullets: [
      'Grimoires system — new permanent unlockables with unique effects.',
      'More details to be announced.',
    ],
  },
  {
    date: '05/17/2026',
    title: 'QoL',
    bullets: [
      'A bunch of quality-of-life changes; promo codes were added (redeem in the Menu area).',
      'Use SORRY4DOWN and CODES in the Menu area for a bunch of rewards — sorry for the recent issues.',
    ],
  },
  {
    date: '05/16/2025',
    title: 'New game UI',
    bullets: [
      '10PM - Fixed Bank issue, where people would put their money in, and when withdrawing, it would only give the Interest money, and not the full amount.',
      '9PM - More images for Ascension Upgrades',
      '8PM — Completely new game UI, more organized.',
      '6PM — Last ascension update wasn\'t pushed.',
    ],
  },
  {
    date: '05/14/2026',
    title: 'The Ascension Update',
    major: true,
    bullets: [
      'New: Ascension Realm — after your 10th prestige, every prestige unlocks the Ascension Tree. Every 1T$ you have at the time of prestige is converted into 1 Heavenly Chip. Spend Heavenly Chips on permanent upgrades for almost everything in the game.',
      'New Buildings: Shipment (delivers exotic rocks, trinkets, money, and tokens), Mine (passive income equivalent to 20 miners), Alchemy Lab (every 100 clicks grants a stacking money bonus), Time Machine (passively collects a cut of other players\' earnings), Antimatter Condenser (Darkness path only — fill the meter for massive buffs), Prism (Light path only — fill the Yates meter for +2× all stats and 10× bank interest), Chancemaker (increases chance of random buffs firing), Fractal Engine (generates billions per second, scales with buildings and pickaxes owned).',
      'Database fix: saving is significantly more reliable. Progress should no longer be lost on page reload, and prestige data (including Heavenly Chips) is now force-saved immediately after each prestige.',
      'Shady Sam revamp: Sam now offers 3 mystery boxes — Sketchy, Suspicious, and Cursed. Each has a failure chance; the higher the risk, the better the potential reward.',
      'Fix: coloring and highlighting of important UI elements improved for readability.',
    ],
  },
];
