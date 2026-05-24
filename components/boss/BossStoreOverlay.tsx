'use client';

import { useState, useCallback } from 'react';
import { BossItem, BOSS_ITEMS, RARITY_HEX, RARITY_COLORS } from '@/lib/bossItems';
import { useBoss } from '@/contexts/BossContext';
import { PICKAXES } from '@/lib/gameData';

// ── Pickaxe BC prices ─────────────────────────────────────────────────────────
const PICKAXE_BC_PRICE: Record<string, number> = {
    Wood:        50,
    Stone:       500,
    Bronze:      1_000,
    Copper:      2_000,
    Iron:        5_000,
    Steel:       10_000,
    Silver:      20_000,
    Gold:        50_000,
    Platinum:    100_000,
    Diamond:     200_000,
    Obsidian:    500_000,
    Alexandrite: 1_000_000,
    Opal:        2_000_000,
    Doge:        5_000_000,
    Miner:       3_000_000,
    Pin:         8_000_000,
    Heavens:     15_000_000,
    Demon:       25_000_000,
    Nuclear:     50_000_000,
    Laser:       75_000_000,
    Nightmare:   200_000_000,
    Sun:         1_000_000_000,
    'Light Saber': 500_000_000,
    Plasma:      2_000_000_000,
    Galaxy:      5_000_000_000,
    Yates:       25_000_000_000,
};

// ── Store catalogue ──────────────────────────────────────────────────────────
// Only boss items purchasable with BC. Maps item id → buy price in BC.
export const STORE_PRICES: Record<string, number> = {
    mc_block:             750_000,
    netherite_chestplate: 200_000,
    gis_pin:              20,
    blue_glasses:         700,
    force_field:          1_000_000,
    am_torso:             1_200,
    better_wig:           1_000_000_000_000, // 1T
    archmagi_key:         200_000_000,       // 200M
    infinity_gauntlet:    700_000_000,       // 700M — hidden
};

// Items hidden from the store unless the player has discovered them in-game
const HIDDEN_STORE_ITEMS = new Set(['infinity_gauntlet']);

type StoreTab = 'All' | 'Pickaxes' | 'Weapons' | 'Head' | 'Torso' | 'Defense' | 'Premium';
const STORE_TABS: StoreTab[] = ['All', 'Pickaxes', 'Weapons', 'Head', 'Torso', 'Defense', 'Premium'];

const PREMIUM_IDS = new Set(['better_wig', 'archmagi_key', 'infinity_gauntlet']);

// ── Pickaxe store entry type ──────────────────────────────────────────────────
interface PickaxeEntry {
    kind: 'pickaxe';
    id: string; // `pck_${name}`
    name: string;
    image: string;
    price: number;
    mkHealth: number | string;
    damage: number | string;
    ability: string;
}

// Build pickaxe entries from gameData
const MK_HEALTH_MAP: Record<string, number | string> = {
    Wood: 10, Stone: 300, Bronze: 360, Copper: 450, Iron: 700,
    Steel: '1K', Silver: '1.2K', Gold: '1.5K', Platinum: '1.7K', Diamond: '2K',
    Obsidian: '3K', Alexandrite: '6K', Opal: '10K', Doge: '120K', Miner: '100K',
    Pin: '129K', Heavens: '150K', Demon: '200K', Nuclear: '300K', Laser: '335K',
    Nightmare: '800K', Sun: '5M', 'Light Saber': '1.5M', Plasma: '4.5M', Galaxy: '10M', Yates: '50M',
};

const STORE_PICKAXES: PickaxeEntry[] = PICKAXES.map(p => ({
    kind: 'pickaxe' as const,
    id: `pck_${p.id}`,
    name: p.name,
    image: p.image,
    price: PICKAXE_BC_PRICE[p.name] ?? 0,
    mkHealth: MK_HEALTH_MAP[p.name] ?? '?',
    damage: p.clickPower.toLocaleString(),
    ability: p.specialAbility ?? 'None',
}));

// ── Icons ─────────────────────────────────────────────────────────────────────
const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const LockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const CoinIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
    </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBC(n: number): string {
    if (n >= 1e18) return `${(n / 1e18).toFixed(0)}QI`;
    if (n >= 1e15) return `${(n / 1e15).toFixed(0)}Q`;
    if (n >= 1e12) return `${(n / 1e12).toFixed(0)}T`;
    if (n >= 1e9)  return `${(n / 1e9).toFixed(0)}B`;
    if (n >= 1e6)  return `${(n / 1e6).toFixed(0)}M`;
    if (n >= 1e3)  return `${(n / 1e3).toFixed(0)}K`;
    return `${n}`;
}

function getRarityBorderClass(item: BossItem): string {
    if (item.rarity === 'ExqUiZxyte' || item.dualRarity === 'ExqUiZxyte') return 'exquizxyte-border';
    return RARITY_COLORS[item.rarity].border;
}

// ── Store item list ───────────────────────────────────────────────────────────
type StoreEntry =
    | { kind: 'boss'; item: BossItem; price: number }
    | PickaxeEntry;

function getStoreItems(tab: StoreTab, discoveredHidden: Set<string>): StoreEntry[] {
    if (tab === 'Pickaxes') return STORE_PICKAXES;

    const bossEntries: StoreEntry[] = BOSS_ITEMS
        .filter(item => {
            if (!(item.id in STORE_PRICES)) return false;
            if (HIDDEN_STORE_ITEMS.has(item.id) && !discoveredHidden.has(item.id)) return false;
            if (tab === 'All') return true;
            if (tab === 'Premium') return PREMIUM_IDS.has(item.id);
            const slotMap: Partial<Record<StoreTab, BossItem['slot']>> = {
                Weapons: 'WEAPON', Head: 'HEAD', Torso: 'TORSO', Defense: 'DEFENSE',
            };
            return item.slot === slotMap[tab];
        })
        .map(item => ({ kind: 'boss' as const, item, price: STORE_PRICES[item.id] }));

    if (tab === 'All') return [...STORE_PICKAXES, ...bossEntries];
    return bossEntries;
}

// ── Pickaxe tile ──────────────────────────────────────────────────────────────
function PickaxeTile({ entry, canAfford }: { entry: PickaxeEntry; canAfford: boolean }) {
    return (
        <div className="relative flex flex-col rounded-xl border-2 border-[#c9a227]/40 bg-gradient-to-b from-[#1a1206]/90 to-[#0c0900]/95 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg hover:border-[#c9a227]/70">
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#c9a227]/60 to-transparent" />
            <div className="flex items-center justify-center bg-[#0c0900]/60 pt-4 pb-2 px-3 h-24">
                <img src={entry.image} alt={entry.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex flex-col gap-1 px-3 pt-1 pb-3">
                <span className="text-[11px] font-bold text-[#f0d878] leading-tight">{entry.name} Pickaxe</span>
                <div className="flex gap-2 text-[9px] text-[#c9a227]/60 mt-0.5">
                    <span>⚔️ {entry.damage} dmg</span>
                    <span>❤️ {entry.mkHealth} MK HP</span>
                </div>
                {entry.ability !== 'None' && (
                    <p className="text-[9px] text-[#c9a227]/50 leading-snug line-clamp-2">{entry.ability}</p>
                )}
                <div className="flex items-center justify-between gap-1 mt-2">
                    <div className="flex items-center gap-1 text-[#f5c842]">
                        <CoinIcon />
                        <span className="text-[10px] font-bold">{formatBC(entry.price)}</span>
                    </div>
                    <button
                        disabled={!canAfford}
                        className={`rounded px-2 py-0.5 text-[9px] font-bold tracking-wider transition-all ${
                            canAfford
                                ? 'bg-gradient-to-b from-[#7a5e0e] to-[#4a3608] text-[#f5e07a] border border-[#c9a227]/60 hover:from-[#9a7214] hover:to-[#5a4210] active:scale-95'
                                : 'bg-[#1a1206]/80 text-[#c9a227]/30 border border-[#c9a227]/15 cursor-not-allowed'
                        }`}
                    >
                        BUY
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Store tile ────────────────────────────────────────────────────────────────
function StoreTile({
    item,
    price,
    owned,
    canAfford,
    onBuy,
}: {
    item: BossItem;
    price: number;
    owned: boolean;
    canAfford: boolean;
    onBuy: (item: BossItem, price: number) => void;
}) {
    const rarityColor = RARITY_HEX[item.rarity];
    const borderCls = getRarityBorderClass(item);

    return (
        <div
            className={`relative flex flex-col rounded-xl border-2 bg-gradient-to-b from-[#1a1206]/90 to-[#0c0900]/95 p-0 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg ${borderCls}`}
            style={{ boxShadow: `0 0 12px 0 ${rarityColor}30` }}
        >
            {/* rarity top accent */}
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, transparent, ${rarityColor}, transparent)` }} />

            {/* image */}
            <div className="flex items-center justify-center bg-[#0c0900]/60 pt-4 pb-2 px-3 h-24">
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain"
                        style={{ transform: `scale(${item.displayScale ?? 1})` }}
                    />
                ) : (
                    <div className="w-10 h-10 rounded bg-[#2a1e08]/60 flex items-center justify-center text-2xl">⚔️</div>
                )}
            </div>

            {/* info */}
            <div className="flex flex-col gap-1 px-3 pt-1 pb-3">
                <span className="text-[11px] font-bold text-[#f0d878] leading-tight line-clamp-2">{item.name}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: rarityColor }}>
                    {item.rarity}
                </span>
                <p className="text-[9px] text-[#c9a227]/60 leading-snug line-clamp-2 mt-0.5">{item.description}</p>

                {/* price + buy */}
                <div className="flex items-center justify-between gap-1 mt-2">
                    <div className="flex items-center gap-1 text-[#f5c842]">
                        <CoinIcon />
                        <span className="text-[10px] font-bold">{formatBC(price)}</span>
                    </div>
                    {owned ? (
                        <span className="rounded px-2 py-0.5 text-[9px] font-bold bg-green-900/50 text-green-300 border border-green-700/50">
                            OWNED
                        </span>
                    ) : (
                        <button
                            disabled={!canAfford}
                            onClick={() => onBuy(item, price)}
                            className={`rounded px-2 py-0.5 text-[9px] font-bold tracking-wider transition-all ${
                                canAfford
                                    ? 'bg-gradient-to-b from-[#7a5e0e] to-[#4a3608] text-[#f5e07a] border border-[#c9a227]/60 hover:from-[#9a7214] hover:to-[#5a4210] active:scale-95'
                                    : 'bg-[#1a1206]/80 text-[#c9a227]/30 border border-[#c9a227]/15 cursor-not-allowed'
                            }`}
                        >
                            BUY
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main overlay ──────────────────────────────────────────────────────────────
interface Props {
    onClose: () => void;
    /** Item IDs the player has already discovered as hidden (e.g. infinity_gauntlet found in Settings) */
    discoveredHidden?: Set<string>;
}

export default function BossStoreOverlay({ onClose, discoveredHidden = new Set() }: Props) {
    const { bc, spendBC, addItem, inventory } = useBoss();
    const [activeTab, setActiveTab] = useState<StoreTab>('All');
    const [lastPurchase, setLastPurchase] = useState<{ name: string; price: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const storeItems = getStoreItems(activeTab, discoveredHidden);
    const ownedSet = new Set(inventory);

    const handleBuy = useCallback((item: BossItem, price: number) => {
        setErrorMsg(null);
        setLastPurchase(null);

        if (bc < price) {
            setErrorMsg(`Not enough BC. Need ${formatBC(price)}.`);
            return;
        }
        if (ownedSet.has(item.id)) {
            setErrorMsg('You already own this item.');
            return;
        }
        const added = addItem(item.id);
        if (!added) {
            setErrorMsg('Inventory is full (45/45).');
            return;
        }
        spendBC(price);
        setLastPurchase({ name: item.name, price });
    }, [bc, ownedSet, addItem, spendBC]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-solid border-[#c9a227]/55 bg-gradient-to-b from-[#1e1608]/98 via-[#130f03]/98 to-[#0c0900]/99 shadow-[0px_0px_0px_1px_#c9a22748,0px_30px_80px_-12px_#000000]">

                {/* top shine line */}
                <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f0d878]/70 to-transparent" />

                {/* gold ribbon header */}
                <div className="relative z-10 flex w-full items-center justify-center bg-gradient-to-r from-[#7a5a0c] via-[#d4a820] to-[#7a5a0c] py-1.5 shadow-[0px_2px_10px_0px_#c9a2274f]">
                    <div className="absolute left-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_0,100%_100%,0_50%)]" />
                    <div className="absolute right-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_50%,100%_100%,0_100%)]" />
                    <div className="flex items-center gap-2.5">
                        <span className="text-[#3a2502]">✦</span>
                        <span className="text-xs font-bold tracking-[0.35em] text-[#1c1203] drop-shadow-[0_1px_0px_#c9a22780]">
                            BOSS STORE
                        </span>
                        <span className="text-[#3a2502]">✦</span>
                    </div>
                </div>

                {/* close button */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-solid border-[#c9a227]/45 bg-[#1a1025]/80 text-[#f0d878] transition-colors hover:border-[#c9a227]/80 hover:bg-[#2a1a35]"
                >
                    <XIcon />
                </button>

                {/* corner ornaments */}
                <div className="pointer-events-none absolute left-3 top-9 h-5 w-5 border-l-2 border-t-2 border-solid border-[#c9a227]/55" />
                <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-solid border-[#c9a227]/55" />
                <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-solid border-[#c9a227]/55" />

                {/* BC balance bar */}
                <div className="flex items-center justify-between px-6 pt-4 pb-2">
                    <div className="flex items-center gap-2 rounded-lg border border-[#c9a227]/40 bg-[#2a1e08]/60 px-3 py-1.5">
                        <span className="text-base leading-none text-[#f5c842]">💰</span>
                        <span className="text-sm font-bold text-[#f5c842]">{bc.toLocaleString()} BC</span>
                    </div>

                    {lastPurchase && (
                        <div className="flex items-center gap-1.5 rounded-md border border-green-700/40 bg-green-950/50 px-3 py-1.5 text-[11px] text-green-300 animate-pulse">
                            <span>✓</span>
                            <span><b>{lastPurchase.name}</b> purchased for {formatBC(lastPurchase.price)} BC</span>
                        </div>
                    )}
                    {errorMsg && (
                        <div className="flex items-center gap-1.5 rounded-md border border-red-700/40 bg-red-950/50 px-3 py-1.5 text-[11px] text-red-300">
                            <span>✕</span>
                            <span>{errorMsg}</span>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-0 px-6 border-b border-[#c9a227]/20">
                    {STORE_TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setLastPurchase(null); setErrorMsg(null); }}
                            className={`relative px-4 py-2 text-[11px] font-bold tracking-widest transition-colors ${
                                activeTab === tab
                                    ? 'text-[#f5c842]'
                                    : 'text-[#c9a227]/50 hover:text-[#c9a227]/80'
                            }`}
                        >
                            {tab.toUpperCase()}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#f5c842] to-transparent" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Item grid */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {storeItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-[#c9a227]/30">
                            <LockIcon />
                            <p className="mt-3 text-xs tracking-widest">NO ITEMS IN THIS CATEGORY</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
                            {storeItems.map(entry => {
                                if (entry.kind === 'pickaxe') {
                                    return (
                                        <PickaxeTile
                                            key={entry.id}
                                            entry={entry}
                                            canAfford={bc >= entry.price}
                                        />
                                    );
                                }
                                return (
                                    <StoreTile
                                        key={entry.item.id}
                                        item={entry.item}
                                        price={entry.price}
                                        owned={ownedSet.has(entry.item.id)}
                                        canAfford={bc >= entry.price && !ownedSet.has(entry.item.id)}
                                        onBuy={handleBuy}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* bottom shimmer */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />
            </div>
        </div>
    );
}
