'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useBoss, BOSS_INVENTORY_MAX } from '@/contexts/BossContext';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { BossItem, BossItemSlot, RARITY_HEX, TAB_FILTERS, BOSS_ITEMS, AcquisitionGate, getItemById } from '@/lib/bossItems';
import BossStoreOverlay from '@/components/boss/BossStoreOverlay';
import InventoryFullModal from '@/components/boss/InventoryFullModal';
import LoadoutConfirmScreen from '@/components/boss/LoadoutConfirmScreen';
import { TRINKETS, YATES_ACCOUNT_ID } from '@/types/game';

// Index unlock requirements
const INDEX_UNLOCK_MONEY = 500e15; // 500Q yates dollars
const PREMIUM_PRODUCT_IDS_REQUIRED = [1, 2, 3, 4, 5, 6];

// ===== inline icons (Feather-style mini SVGs) =====
const I = {
    arrowLeft: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
    chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="6 9 12 15 18 9"/></svg>,
    lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    play: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    bag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ===== small UI helpers =====
const RARITY_BORDER_2 = (r: BossItem['rarity']): string => {
    switch (r) {
        case 'Common':     return 'border-neutral-400 shadow-neutral-500/20';
        case 'Rare':       return 'border-blue-400 shadow-blue-500/40';
        case 'Epic':       return 'border-purple-400 shadow-purple-500/50';
        case 'Legendary':  return 'border-yellow-400 shadow-yellow-500/60';
        case 'Mythic':     return 'border-red-500 shadow-red-500/70';
        case 'ExqUiZxyte': return 'exquizxyte-border';
    }
};

/** Returns extra CSS class + inline style for items. Handles ExqUiZxyte + dual rarity. */
function getRarityStyle(item: BossItem): { className: string; style?: React.CSSProperties } {
    if (item.dualRarity === 'ExqUiZxyte') {
        return {
            className: 'dual-rarity-border',
            style: { '--dual-rarity-base': RARITY_HEX[item.rarity] } as React.CSSProperties,
        };
    }
    if (item.rarity === 'ExqUiZxyte') {
        return { className: 'exquizxyte-border' };
    }
    return { className: RARITY_BORDER_2(item.rarity) };
}

/** Check if an acquisition gate condition is met by the current game state. */
function isGateSatisfied(gate: AcquisitionGate, gameState: { ownedPremiumProductIds?: number[]; fastestPrestigeTime?: number | null; ownedTrinketIds?: string[] }): boolean {
    switch (gate.type) {
        case 'premiumPurchase':
            return (gameState.ownedPremiumProductIds ?? []).length > 0;
        case 'fastPrestige': {
            const fastest = gameState.fastestPrestigeTime;
            return fastest != null && fastest > 0 && fastest <= (gate.value as number);
        }
        case 'trinketRarity': {
            const requiredRarities = gate.value as string[];
            const ownedIds = new Set(gameState.ownedTrinketIds ?? []);
            return TRINKETS.some(t => ownedIds.has(t.id) && requiredRarities.includes(t.rarity));
        }
    }
}

/** Returns text class for rarity name display. */
function getRarityTextClass(item: BossItem): string {
    if (item.rarity === 'ExqUiZxyte' || item.dualRarity === 'ExqUiZxyte') return 'exquizxyte-text';
    return '';
}

const TABS = ['All', 'Weapons', 'Armor', 'Defense', 'Transformations', 'Loadout'] as const;
type Tab = typeof TABS[number];

// Paper-doll slot order for the equipped panel
const PAPER_DOLL_SLOTS: { slot: BossItemSlot; label: string; emoji: string }[] = [
    { slot: 'HEAD',           label: 'Head',           emoji: '🪖' },
    { slot: 'WEAPON',         label: 'Weapon',         emoji: '⚔️' },
    { slot: 'TORSO',          label: 'Torso',          emoji: '👕' },
    { slot: 'ARMS',           label: 'Arms',           emoji: '🧤' },
    { slot: 'LEGS',           label: 'Legs',           emoji: '👢' },
    { slot: 'DEFENSE',        label: 'Defense',        emoji: '🛡️' },
    { slot: 'TRANSFORMATION', label: 'Transformation', emoji: '🌀' },
];

export default function BossesPage() {
    const router = useRouter();
    const { bc, inventory, inventoryItems, loadout, loadoutItems, computedStats, equipItem, unequipSlot, isFull, addItem, removeItem } = useBoss();
    const { gameState } = useGame();
    const { employee } = useAuth();

    const [showNoAccountPopup, setShowNoAccountPopup] = useState(false);
    const [showStore, setShowStore] = useState(false);
    const [showInventoryFull, setShowInventoryFull] = useState(false);
    const [showLoadoutConfirm, setShowLoadoutConfirm] = useState(false);
    const [fightWithFullInventory, setFightWithFullInventory] = useState(false);
    const [tab, setTab] = useState<Tab>('All');
    const [search, setSearch] = useState('');
    const [bossDropdownOpen, setBossDropdownOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [showIndex, setShowIndex] = useState(false);
    const [showCheat, setShowCheat] = useState(false);
    const [cheatInput, setCheatInput] = useState('');
    const [cheatLog, setCheatLog] = useState<string[]>([]);

    const isBernardo = employee?.id === YATES_ACCOUNT_ID || employee?.id === '000001' || employee?.id === '123456';

    // Keyboard handler: I = cheat terminal (Bernardo only)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'i' || e.key === 'I') {
                const tag = (e.target as HTMLElement)?.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                if (isBernardo) setShowCheat(p => !p);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isBernardo]);

    const handleCheatCommand = (cmd: string) => {
        const trimmed = cmd.trim().toLowerCase();

        if (trimmed === 'give all') {
            let added = 0;
            for (const item of BOSS_ITEMS) {
                if (!inventory.includes(item.id)) {
                    if (addItem(item.id)) added++;
                }
            }
            setCheatLog(p => [...p, '> give all', `  ✅ Added ${added} items. Inventory: ${inventory.length + added}/45.`]);
        } else if (trimmed.startsWith('give ')) {
            const itemSearch = trimmed.slice(5).trim();
            const found = BOSS_ITEMS.find(i => i.id === itemSearch || i.name.toLowerCase() === itemSearch);
            if (!found) {
                setCheatLog(p => [...p, `> give ${itemSearch}`, `  ❌ Item not found. Try an ID or exact name.`]);
            } else if (inventory.includes(found.id)) {
                setCheatLog(p => [...p, `> give ${found.name}`, `  ⚠️ Already in inventory.`]);
            } else {
                const ok = addItem(found.id);
                setCheatLog(p => [...p, `> give ${found.name}`, ok ? `  ✅ Added ${found.name} to inventory.` : `  ❌ Inventory full (45/45).`]);
            }
        } else if (trimmed === 'remove all') {
            const count = inventory.length;
            for (const id of [...inventory]) removeItem(id);
            setCheatLog(p => [...p, '> remove all', `  🗑️ Removed ${count} items. Inventory empty.`]);
        } else if (trimmed.startsWith('remove ')) {
            const itemSearch = trimmed.slice(7).trim();
            const found = BOSS_ITEMS.find(i => i.id === itemSearch || i.name.toLowerCase() === itemSearch);
            if (!found) {
                setCheatLog(p => [...p, `> remove ${itemSearch}`, `  ❌ Item not found. Try an ID or exact name.`]);
            } else if (!inventory.includes(found.id)) {
                setCheatLog(p => [...p, `> remove ${found.name}`, `  ⚠️ Not in inventory.`]);
            } else {
                removeItem(found.id);
                setCheatLog(p => [...p, `> remove ${found.name}`, `  🗑️ Removed ${found.name}.`]);
            }
        } else if (trimmed === 'list') {
            setCheatLog(p => [...p, '> list', ...BOSS_ITEMS.map(i => `  ${inventory.includes(i.id) ? '✅' : '  '} ${i.id} — ${i.name} [${i.rarity}]`)]);
        } else if (trimmed === 'clear') {
            setCheatLog([]);
        } else if (trimmed === 'help') {
            setCheatLog(p => [...p, '> help',
                '  give [id or name] — add item',
                '  give all — add every item',
                '  remove [id or name] — remove item',
                '  remove all — nuke inventory',
                '  list — show all items (✅ = owned)',
                '  clear — clear log',
                '  help — this',
            ]);
        } else {
            setCheatLog(p => [...p, `> ${trimmed}`, '  ❓ Unknown command. Type "help".']);
        }
        setCheatInput('');
    };

    // Index unlock: 500Q TOTAL money ever earned + every premium product owned
    const indexUnlocked = useMemo(() => {
        if (!gameState) return false;
        if ((gameState.totalMoneyEarned ?? 0) < INDEX_UNLOCK_MONEY) return false;
        const owned = gameState.ownedPremiumProductIds ?? [];
        return PREMIUM_PRODUCT_IDS_REQUIRED.every(id => owned.includes(id));
    }, [gameState]);

    const ownedItemIds = useMemo(() => new Set(inventoryItems.map(i => i.id)), [inventoryItems]);

    // No-account guard (same pattern as /game)
    useEffect(() => {
        const hasEmployee = !!localStorage.getItem('yates-employee');
        const hasClient = !!localStorage.getItem('yates-client');
        if (!hasEmployee && !hasClient) {
            setShowNoAccountPopup(true);
            const t = setTimeout(() => router.push('/client-signup'), 4000);
            return () => clearTimeout(t);
        }
    }, [router]);

    // Filter inventory by tab + search
    const filteredItems: BossItem[] = useMemo(() => {
        const slotFilter = TAB_FILTERS[tab];
        return inventoryItems.filter(i => {
            if (slotFilter && !slotFilter.includes(i.slot)) return false;
            if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [inventoryItems, tab, search]);

    const selectedItem: BossItem | null = useMemo(() => {
        if (!selectedItemId) return null;
        return inventoryItems.find(i => i.id === selectedItemId) ?? null;
    }, [selectedItemId, inventoryItems]);

    // HP min-max scales with equipped Mythic/Legendary count (placeholder formula)
    const hpRange = useMemo(() => {
        const equipped = Object.values(loadoutItems);
        let factor = 1;
        for (const it of equipped) {
            if (!it) continue;
            if (it.rarity === 'Mythic') factor += 0.4;
            else if (it.rarity === 'Legendary') factor += 0.25;
            else if (it.rarity === 'Epic') factor += 0.15;
        }
        const min = Math.round(25_000 * factor);
        const max = Math.round(75_000 * factor);
        return { min, max };
    }, [loadoutItems]);

    const totalSlots = BOSS_INVENTORY_MAX; // 45
    const onPlay = () => {
        setFightWithFullInventory(false);
        if (isFull) {
            setShowInventoryFull(true);
            return;
        }
        setShowLoadoutConfirm(true);
    };

    const enterArena = () => {
        setShowLoadoutConfirm(false);
        setShowInventoryFull(false);
        router.push('/bosses/megaknight');
    };

    return (
        <div className="relative flex h-[calc(100vh-4rem)] w-full flex-col items-start overflow-hidden bg-[#0a0a14] font-sans">
            {/* ===== Background glows ===== */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1025] via-[#0e0e1e] to-[#0a1020]" />
                <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[#4a206033] blur-[120px]" />
                <div className="absolute right-1/4 bottom-1/3 h-80 w-80 rounded-full bg-[#1a306040] blur-[100px]" />
                <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2a10404d] blur-[80px]" />
            </div>

            {/* ===== No-account popup ===== */}
            {showNoAccountPopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
                    <div className="bg-red-900 border-2 border-red-500 rounded-2xl px-6 py-5 shadow-2xl shadow-red-500/30 max-w-sm mx-4 text-center">
                        <p className="text-red-100 text-lg font-bold">No account = no saves.</p>
                        <p className="text-red-300 font-bold mt-1">.... Exactly</p>
                        <p className="text-red-400/70 text-xs mt-2 animate-pulse">Redirecting...</p>
                    </div>
                </div>
            )}

            {/* ===== Top Bar ===== */}
            <div className="relative z-20 flex w-full items-center justify-between border-b border-solid border-[#c9a2274d] bg-[#07070f]/85 px-6 py-3 shadow-[0px_0px_40px_0px_#c9a22726,0px_1px_0px_0px_#c9a22714] backdrop-blur-md">
                <div className="flex w-48 flex-none items-center">
                    <button
                        onClick={() => router.push('/info')}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-solid border-[#c9a227]/40 bg-[#1a1025]/80 text-[#c9a227] transition-colors hover:border-[#c9a227]/80 hover:bg-[#2a1a35]"
                        aria-label="Back"
                    >
                        {I.arrowLeft}
                    </button>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-3">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#c9a227]/70" />
                        <div className="h-1.5 w-1.5 rotate-45 bg-[#c9a227]" />
                        <span className="text-[8px] sm:text-[10px] text-[#c9a227]">🛡</span>
                        <span className="text-2xl sm:text-3xl font-bold tracking-[0.3em] text-[#f0d878] drop-shadow-[0_0_16px_#c9a22780]">
                            BOSSES
                        </span>
                        <span className="text-[8px] sm:text-[10px] text-[#c9a227]">🛡</span>
                        <div className="h-1.5 w-1.5 rotate-45 bg-[#c9a227]" />
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#c9a227]/70" />
                    </div>
                    <span className="text-[10px] tracking-[0.18em] text-[#c9a227]/55">✦ SELECT YOUR CHALLENGER ✦</span>
                </div>

                <div className="flex flex-none items-center justify-end gap-3">
                    {/* INDEX button (codex of all items) */}
                    <button
                        onClick={() => setShowIndex(true)}
                        title="Item Index — view every item in the game"
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-solid border-[#c9a227]/45 bg-gradient-to-b from-[#2a1e08]/90 to-[#180f02]/90 px-3 py-2 transition-all hover:border-[#c9a227]/80 hover:from-[#3a2a0e]/90 hover:to-[#241502]/90 active:scale-[0.97]"
                    >
                        <span className="text-[#f5c842]">{I.book}</span>
                        <span className="text-xs font-bold tracking-widest text-[#f5c842]">INDEX</span>
                    </button>
                    {/* BC counter — single row */}
                    <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-solid border-[#c9a227]/45 bg-gradient-to-b from-[#2a1e08]/90 to-[#180f02]/90 px-3 py-2 shadow-[inset_0px_1px_0px_0px_#c9a22729,0px_0px_14px_0px_#c9a22721]">
                        <span className="text-base leading-none text-[#f5c842]">💰</span>
                        <span className="text-sm font-bold leading-none text-[#f5c842]">{bc.toLocaleString()} BC</span>
                    </div>
                    {/* Boss store */}
                    <button
                        onClick={() => setShowStore(true)}
                        className="flex items-center gap-1.5 rounded-lg border-2 border-solid border-[#c9a227b3] bg-gradient-to-b from-[#7a5e0e] via-[#9a7812] to-[#4a3608] px-4 py-2 transition-all hover:from-[#9a7214] hover:via-[#b88a18] hover:to-[#5a4210] hover:shadow-[inset_0px_1px_0px_0px_#f5e07a70,0px_4px_22px_0px_#c9a22760] active:scale-[0.97]"
                    >
                        <span className="text-[#f5e07a]">{I.bag}</span>
                        <span className="text-xs font-bold tracking-widest text-[#f5e07a] drop-shadow-[0_1px_2px_#00000080]">
                            BOSS STORE
                        </span>
                    </button>
                </div>
            </div>

            {/* ===== Main Content (50% boss card | 5% gap | 40% inventory) ===== */}
            <div className="relative z-10 flex w-full flex-1 items-stretch gap-[4%] overflow-hidden py-6 pl-[2.5%] pr-[1%]">
                {/* ===== BOSS CARD (50%) ===== */}
                <div
                    className="group/mk relative flex w-[50%] flex-col items-stretch overflow-hidden rounded-2xl border-2 border-solid border-[#c9a227]/55 bg-gradient-to-b from-[#1e1608]/95 via-[#130f03]/96 to-[#0c0900]/97 shadow-[0px_0px_0px_1px_#c9a22726,0px_20px_60px_-12px_#00000070] backdrop-blur-sm transition-all duration-300 hover:border-[#c9a227]/85 hover:shadow-[0px_0px_0px_1px_#c9a22748,0px_24px_64px_-8px_#c9a22758]"
                >
                    {/* top shimmer */}
                    <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f0d878]/70 to-transparent" />

                    {/* gold ribbon header (acts as boss selector trigger row) */}
                    <div className="relative z-10 flex w-full items-center justify-center bg-gradient-to-r from-[#7a5a0c] via-[#d4a820] to-[#7a5a0c] py-1 shadow-[0px_2px_10px_0px_#c9a2274f]">
                        <div className="absolute left-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_0,100%_100%,0_50%)]" />
                        <div className="absolute right-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_50%,100%_100%,0_100%)]" />
                        <div className="flex items-center gap-2.5">
                            <span className="text-[#3a2502]">✦</span>
                            <span className="text-[10px] font-bold tracking-[0.35em] text-[#1c1203] drop-shadow-[0_1px_0px_#c9a22780]">BOSS</span>
                            <span className="text-[#3a2502]">✦</span>
                        </div>
                    </div>

                    {/* compact dropdown trigger */}
                    <div className="relative w-full px-3 pt-2.5">
                        <button
                            onClick={() => setBossDropdownOpen(o => !o)}
                            className="relative flex w-full items-center gap-2.5 rounded-lg border-2 border-solid border-[#c9a227]/70 bg-gradient-to-b from-[#2a1e08]/90 to-[#180f02]/90 px-2.5 py-1.5 shadow-[inset_0px_1px_0px_0px_#c9a22729,0px_0px_14px_0px_#c9a22721] transition-all hover:border-[#c9a227]"
                        >
                            <div className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-md border border-solid border-[#c9a227]/55 bg-[#0c0900]">
                                <img src="/bosses/Meganut.jpeg" alt="Meganut" className="h-full w-full object-cover" />
                            </div>
                            <div className="flex flex-1 flex-col items-start leading-tight">
                                <span className="text-xs font-bold tracking-wider text-[#f0d878]">Meganut (MK)</span>
                                <span className="text-[9px] italic text-[#c9a227]/60">The First Boss</span>
                            </div>
                            <span className={`text-[#c9a227] transition-transform ${bossDropdownOpen ? 'rotate-180' : ''}`}>{I.chevronDown}</span>
                        </button>

                        {bossDropdownOpen && (
                            <div className="absolute left-3 right-3 top-full z-30 mt-1 flex flex-col gap-1 rounded-lg border-2 border-solid border-[#c9a227]/70 bg-[#0c0900]/98 p-2 shadow-[0px_8px_24px_0px_#000000c0] backdrop-blur">
                                <div className="flex items-center gap-2 rounded-md border border-solid border-[#c9a227]/50 bg-[#2a1e08]/60 px-2 py-1.5">
                                    <div className="flex h-7 w-7 flex-none overflow-hidden rounded-md border border-solid border-[#c9a227]/60 bg-[#0c0900]">
                                        <img src="/bosses/Meganut.jpeg" alt="Meganut" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex flex-1 flex-col items-start leading-tight">
                                        <span className="text-xs font-bold text-[#f0d878]">Meganut (MK)</span>
                                        <span className="text-[9px] italic text-[#c9a227]/60">The First Boss</span>
                                    </div>
                                    <span className="text-emerald-400">✓</span>
                                </div>
                                <div className="flex cursor-not-allowed items-center gap-2 rounded-md border border-solid border-neutral-700/40 bg-neutral-900/40 px-2 py-1.5 opacity-60">
                                    <div className="flex h-7 w-7 flex-none items-center justify-center rounded-md border border-solid border-neutral-700/50 bg-neutral-900/60 text-neutral-600">
                                        {I.lock}
                                    </div>
                                    <div className="flex flex-1 flex-col items-start leading-tight">
                                        <span className="text-xs font-bold text-neutral-500">Rich Guy (RG)</span>
                                        <span className="text-[9px] italic text-neutral-600">Wealthy Menace</span>
                                    </div>
                                    <span className="rounded border border-red-700/50 bg-red-950/50 px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-red-400">COMING LATER</span>
                                </div>
                                <div className="px-2 py-0.5 text-center text-[9px] italic text-[#c9a227]/40">+ More bosses coming...</div>
                            </div>
                        )}
                    </div>

                    {/* boss image — flexible height that shrinks if needed */}
                    <div className="relative flex w-full items-center justify-center px-3 pt-2 pb-2">
                        <div className="relative flex w-full items-start overflow-hidden rounded-lg border-2 border-solid border-[#c9a227]/65 shadow-[0px_0px_24px_0px_#c9a22738,0px_0px_0px_4px_#1a1203]" style={{ height: 'clamp(140px, 22vh, 200px)' }}>
                            <img
                                src="/bosses/Meganut.jpeg"
                                alt="Meganut"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover/mk:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0900]/85 via-[#0c0900]/10 to-[#c9a227]/10" />
                            {/* name overlaid on the image */}
                            <div className="absolute inset-x-0 bottom-1 flex flex-col items-center gap-0 text-center">
                                <span className="text-2xl font-bold tracking-wider text-[#f0d878] drop-shadow-[0_2px_8px_#000000]">Meganut</span>
                                <span className="text-[10px] font-bold text-[#f0d878]/90 drop-shadow-[0_1px_4px_#000000]">(MK) — The First Boss</span>
                            </div>
                        </div>
                    </div>

                    {/* body sections — compact, fits without scroll */}
                    <div className="flex w-full flex-1 flex-col items-stretch gap-2 px-3 pb-3 min-h-0">
                        {/* HP — single line + tiny link */}
                        <div className="flex w-full items-center gap-2 rounded-md border border-solid border-[#c9a22740] bg-[#c9a2270f] px-2.5 py-1.5">
                            <span className="text-[#f87171]">❤️</span>
                            <span className="text-[10px] text-[#c9a227b3]">HP:</span>
                            <span className="text-xs font-bold text-[#f0d878]">
                                {hpRange.min.toLocaleString()} – {hpRange.max.toLocaleString()}
                            </span>
                            <button
                                onClick={() => router.push('/info/pck-to-health')}
                                className="ml-auto text-[9px] italic text-[#a78bfa] underline hover:text-[#c4b5fd]"
                            >
                                based on Pck dmg ↗
                            </button>
                        </div>

                        {/* Main + Super side by side */}
                        <div className="grid w-full grid-cols-2 gap-2">
                            <div className="flex flex-col gap-0.5 rounded-md border border-solid border-[#fb923c40] bg-[#fb923c0d] px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-[#fb923c]">⚔️</span>
                                    <span className="text-[9px] font-bold tracking-wider text-[#fb923c]">MAIN</span>
                                </div>
                                <span className="text-[10px] leading-tight text-[#f0d878cc]">
                                    Close-range slam, 5–45% HP. +10% blocking buff on hit.
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5 rounded-md border border-solid border-[#a78bfa40] bg-[#a78bfa0d] px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-[#a78bfa]">⚡</span>
                                    <span className="text-[9px] font-bold tracking-wider text-[#a78bfa]">SUPER</span>
                                </div>
                                <span className="text-[10px] leading-tight text-[#f0d878cc]">
                                    Jumps + crashes every 15–25s. Unblockable in flight.
                                </span>
                            </div>
                        </div>

                        {/* Rewards — 2-col grid */}
                        <div className="flex w-full flex-1 flex-col gap-1 rounded-md border border-solid border-[#c9a22740] bg-[#c9a2270f] px-2.5 py-1.5 min-h-0">
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-[#f5c842]">🏆</span>
                                <span className="text-[9px] font-bold tracking-wider text-[#f5c842]">REWARDS</span>
                            </div>
                            <div className="grid w-full grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                                {[
                                    ['MK Helmet', '5%'],
                                    ['MK Chestplate', '5%'],
                                    ['MK Gauntlets', '5%'],
                                    ['Meganut Sword', '0.5%'],
                                    ["Bernardo's Bomb", 'No-dmg'],
                                    ['42nd Eye', '7× no-dmg'],
                                    ['Goated Sword', '77×'],
                                    ['Goated Sword 2', '80×'],
                                ].map(([name, chance]) => (
                                    <div key={name} className="flex items-center justify-between">
                                        <span className="truncate text-[#f0d878cc]">{name}</span>
                                        <span className="font-bold text-[#c9a22799]">{chance}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-0.5 grid w-full grid-cols-2 items-center gap-2 border-t border-solid border-[#c9a22733] pt-1">
                                <span className="text-[10px] font-bold leading-[1] text-[#f5c842]">+2,500 BC</span>
                                <span className="text-right text-[10px] font-bold leading-[1] text-[#c9a22799]">per kill</span>
                            </div>
                        </div>

                        {/* PLAY */}
                        <button
                            onClick={onPlay}
                            className="flex w-full flex-none items-center justify-center gap-2 rounded-lg border border-solid border-[#10b98180] bg-gradient-to-b from-emerald-600 to-emerald-800 py-2 transition-all duration-200 hover:from-emerald-500 hover:to-emerald-700 hover:shadow-[inset_0px_1px_0px_0px_#6ee7b758,0px_6px_24px_0px_#05966958] active:scale-[0.98]"
                        >
                            <span className="text-[#a7f3d0]">{I.play}</span>
                            <span className="text-sm font-bold tracking-[0.2em] text-[#d1fae5]">PLAY</span>
                        </button>
                    </div>

                    {/* corner ornaments */}
                    <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-solid border-[#c9a227]/55" />
                    <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-solid border-[#c9a227]/55" />
                </div>

                {/* ===== INVENTORY (40%) ===== */}
                <div className="relative flex w-[41%] flex-col items-start overflow-hidden rounded-2xl border-2 border-solid border-[#c9a227]/55 bg-gradient-to-b from-[#1e1608]/95 via-[#130f03]/96 to-[#0c0900]/97 shadow-[0px_0px_0px_1px_#c9a22726,0px_20px_60px_-12px_#00000070] backdrop-blur-sm">
                    <div className="absolute left-0 right-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#f0d878]/70 to-transparent" />

                    {/* gold ribbon header */}
                    <div className="relative z-10 flex w-full items-center justify-center bg-gradient-to-r from-[#7a5a0c] via-[#d4a820] to-[#7a5a0c] py-1.5 shadow-[0px_2px_10px_0px_#c9a2274f]">
                        <div className="absolute left-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_0,100%_100%,0_50%)]" />
                        <div className="absolute right-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_50%,100%_100%,0_100%)]" />
                        <div className="flex items-center gap-2.5">
                            <span className="text-[#3a2502]">✦</span>
                            <span className="text-xs font-bold tracking-[0.35em] text-[#1c1203] drop-shadow-[0_1px_0px_#c9a22780]">
                                BOSS INVENTORY · {inventoryItems.length}/{totalSlots}
                            </span>
                            <span className="text-[#3a2502]">✦</span>
                        </div>
                    </div>

                    <div className="absolute left-3 top-9 z-10 h-5 w-5 border-l-2 border-t-2 border-solid border-[#c9a227]/55" />
                    <div className="absolute right-3 top-9 z-10 h-5 w-5 border-r-2 border-t-2 border-solid border-[#c9a227]/55" />

                    {/* tabs */}
                    <div className="flex w-full items-center gap-1 px-4 pt-4 pb-2">
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={
                                    tab === t
                                        ? 'flex flex-1 items-center justify-center rounded-md border border-solid border-[#c9a227]/55 bg-[#c9a2271f] px-2.5 py-1.5 text-xs font-bold text-[#f0d878]'
                                        : 'flex flex-1 items-center justify-center rounded-md border border-solid border-[#c9a22733] bg-[#c9a2270d] px-2.5 py-1.5 text-xs text-[#c9a227bf] hover:bg-[#c9a22718]'
                                }
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* search */}
                    <div className="flex w-full items-center gap-2 px-4 py-2">
                        <div className="flex flex-1 items-center gap-2 rounded-lg border border-solid border-[#c9a2274d] bg-[#0c0900cc] px-3 py-2">
                            <span className="text-[#c9a22799]">{I.search}</span>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search items..."
                                className="flex-1 bg-transparent text-sm text-[#f0d878] placeholder:text-[#c9a22799] outline-none"
                            />
                        </div>
                    </div>

                    {/* body: 2-region split */}
                    <div className="flex w-full flex-1 flex-row items-stretch overflow-hidden">
                        {/* LEFT region: rarity legend + grid (or paper-doll if Loadout tab) */}
                        <div className="flex flex-col items-start gap-2 overflow-y-auto px-4 py-3" style={{ flex: '5 1 0%' }}>
                            <div className="flex w-full items-center gap-3 pb-1">
                                <span className="text-[10px] italic text-[#c9a227]/55">Rarity:</span>
                                {(['Common','Rare','Epic','Legendary','Mythic'] as const).map(r => (
                                    <div key={r} className="flex items-center gap-1">
                                        <div className="h-3 w-3 rounded-sm border-2" style={{ borderColor: RARITY_HEX[r] }} />
                                        <span className="text-[10px] text-[#c9a227]/65">{r[0]}</span>
                                    </div>
                                ))}
                            </div>

                            {tab === 'Loadout' ? (
                                <PaperDoll
                                    loadoutItems={loadoutItems}
                                    onUnequip={unequipSlot}
                                    big
                                />
                            ) : (
                                <div className="grid w-full grid-cols-5 gap-2">
                                    {Array.from({ length: totalSlots }).map((_, idx) => {
                                        const item = filteredItems[idx];
                                        if (!item) {
                                            return (
                                                <div
                                                    key={idx}
                                                    className="aspect-square rounded-md border border-solid border-[#c9a22726] bg-[#0c090066]"
                                                />
                                            );
                                        }
                                        const rs = getRarityStyle(item);
                                        return (
                                            <InventorySlot
                                                key={item.id + '_' + idx}
                                                item={item}
                                                rsClassName={rs.className}
                                                rsStyle={rs.style}
                                                onEquip={equipItem}
                                                onUnequip={unequipSlot}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* RIGHT region: paper-doll + current stats (item detail is now a hover tooltip on the grid) */}
                        <div className="flex flex-col items-start gap-3 overflow-y-auto border-l border-solid border-[#c9a22733] px-3 py-3" style={{ flex: '5 1 0%' }}>
                            {/* EQUIPPED paper-doll */}
                            <div className="flex w-full flex-col items-start gap-2">
                                <DividerLabel label="EQUIPPED" />
                                <PaperDoll loadoutItems={loadoutItems} onUnequip={unequipSlot} />
                            </div>

                            <div className="h-px w-full bg-[#c9a22733]" />

                            {/* CURRENT STATS */}
                            <div className="flex w-full flex-col items-start gap-1.5 rounded-lg border border-solid border-[#c9a22740] bg-[#c9a2270a] px-3 py-2.5">
                                <span className="w-full border-b border-solid border-[#c9a227]/20 pb-1 text-xs font-bold tracking-[0.15em] text-[#f5c842]">CURRENT STATS</span>
                                <Stat label="✨ Mana"          value={String(computedStats.mana)} />
                                <Stat label="💫 Dodge"         value={`${computedStats.dodge}%`} />
                                <Stat label="🎯 Crit"          value={`${computedStats.crit}%`} />
                                <Stat label="❤️ Health"        value={computedStats.health.toLocaleString()} />
                                <Stat label="💚 HP Regen"      value={`${computedStats.hpRegen}/3s`} />
                                <Stat label="🛡️ Dmg Reduc"     value={String(computedStats.defense)} />
                                <Stat label="⚡ Atk Speed"     value={computedStats.atkSpeed.toFixed(1)} />
                                <Stat label="💨 Speed"         value={computedStats.speed.toFixed(1)} />
                                <Stat label="⚔️ Dmg"           value={computedStats.dmg.toLocaleString()} />
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-3 left-3 z-10 h-5 w-5 border-b-2 border-l-2 border-solid border-[#c9a227]/55" />
                    <div className="absolute bottom-3 right-3 z-10 h-5 w-5 border-b-2 border-r-2 border-solid border-[#c9a227]/55" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />
                </div>
            </div>

            {/* ===== INVENTORY FULL MODAL ===== */}
            {showInventoryFull && (
                <InventoryFullModal
                    onClose={() => setShowInventoryFull(false)}
                    onManageInventory={() => setShowInventoryFull(false)}
                    onFightAnyway={() => {
                        setShowInventoryFull(false);
                        setFightWithFullInventory(true);
                        setShowLoadoutConfirm(true);
                    }}
                />
            )}

            {/* ===== LOADOUT CONFIRM ===== */}
            {showLoadoutConfirm && (
                <LoadoutConfirmScreen
                    bossName="Meganut"
                    bossSubtitle="(MK) — The First Boss"
                    loadoutItems={loadoutItems}
                    computedStats={computedStats}
                    mkHpMin={hpRange.min}
                    mkHpMax={hpRange.max}
                    inventoryFull={fightWithFullInventory || isFull}
                    onConfirm={enterArena}
                    onCancel={() => {
                        setShowLoadoutConfirm(false);
                        setFightWithFullInventory(false);
                    }}
                />
            )}

            {/* ===== BOSS STORE OVERLAY ===== */}
            {showStore && (
                <BossStoreOverlay
                    onClose={() => setShowStore(false)}
                    onInventoryFull={() => {
                        setShowStore(false);
                        setShowInventoryFull(true);
                    }}
                />
            )}

            {/* ===== INDEX OVERLAY ===== */}
            {showIndex && (
                <IndexOverlay
                    ownedItemIds={ownedItemIds}
                    unlocked={indexUnlocked}
                    onClose={() => setShowIndex(false)}
                    gameState={gameState}
                />
            )}

            {/* ===== CHEAT TERMINAL (Bernardo only, press I) ===== */}
            {showCheat && isBernardo && (
                <div className="fixed bottom-4 left-4 z-[200] flex w-[420px] flex-col rounded-lg border-2 border-solid border-emerald-600/60 bg-[#0a0a14]/98 shadow-[0px_8px_32px_0px_#000000d0] backdrop-blur">
                    <div className="flex items-center justify-between border-b border-emerald-800/50 px-3 py-2">
                        <span className="text-xs font-bold tracking-widest text-emerald-400">BOSS TERMINAL</span>
                        <button onClick={() => setShowCheat(false)} className="text-emerald-500 hover:text-emerald-300">{I.x}</button>
                    </div>
                    <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto px-3 py-2 font-mono text-[11px]">
                        {cheatLog.map((line, i) => (
                            <span key={i} className={line.startsWith('>') ? 'text-emerald-300' : 'text-emerald-500/70'}>{line}</span>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 border-t border-emerald-800/50 px-3 py-2">
                        <span className="text-emerald-400 text-xs">&gt;</span>
                        <input
                            value={cheatInput}
                            onChange={e => setCheatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && cheatInput.trim()) handleCheatCommand(cheatInput); }}
                            placeholder="give meganut_sword"
                            className="flex-1 bg-transparent font-mono text-xs text-emerald-200 placeholder:text-emerald-700 outline-none"
                            autoFocus
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ===== sub-components =====

/** Renders an item's PNG with optional displayScale zoom and pairCount mirroring (e.g. MK Gauntlets). */
function ItemImage({ item, className = '', dropShadow = false }: { item: BossItem; className?: string; dropShadow?: boolean }) {
    const scaleStyle = item.displayScale && item.displayScale !== 1
        ? { transform: `scale(${item.displayScale})` }
        : undefined;
    const baseImg = (
        <img
            src={item.image}
            alt={item.name}
            className={`max-h-full max-w-full object-contain ${dropShadow ? 'drop-shadow-[0_0_4px_currentColor]' : ''}`}
            style={scaleStyle}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
    );
    if (item.pairCount === 2) {
        return (
            <div className={`flex h-full w-full items-center justify-center gap-0 ${className}`}>
                <div className="flex h-full w-1/2 items-center justify-center overflow-hidden">
                    {baseImg}
                </div>
                <div className="flex h-full w-1/2 items-center justify-center overflow-hidden" style={{ transform: 'scaleX(-1)' }}>
                    <img
                        src={item.image}
                        alt=""
                        aria-hidden
                        className={`max-h-full max-w-full object-contain ${dropShadow ? 'drop-shadow-[0_0_4px_currentColor]' : ''}`}
                        style={scaleStyle}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            </div>
        );
    }
    return <div className={`flex h-full w-full items-center justify-center ${className}`}>{baseImg}</div>;
}

function IndexOverlay({
    ownedItemIds,
    unlocked,
    onClose,
    gameState: gs,
}: {
    ownedItemIds: Set<string>;
    unlocked: boolean;
    onClose: () => void;
    gameState: { ownedPremiumProductIds?: number[]; fastestPrestigeTime?: number | null; ownedTrinketIds?: string[] } | null;
}) {
    const visibleItems = BOSS_ITEMS.filter(i => !i.hideFromIndex);
    const ownedCount = visibleItems.filter(i => ownedItemIds.has(i.id)).length;
    const totalCount = visibleItems.length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-solid border-[#c9a227]/55 bg-gradient-to-b from-[#1e1608]/98 via-[#130f03]/98 to-[#0c0900]/99 shadow-[0px_0px_0px_1px_#c9a22748,0px_30px_80px_-12px_#000000]">
                <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f0d878]/70 to-transparent" />

                {/* gold ribbon header */}
                <div className="relative z-10 flex w-full items-center justify-center bg-gradient-to-r from-[#7a5a0c] via-[#d4a820] to-[#7a5a0c] py-1.5 shadow-[0px_2px_10px_0px_#c9a2274f]">
                    <div className="absolute left-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_0,100%_100%,0_50%)]" />
                    <div className="absolute right-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_50%,100%_100%,0_100%)]" />
                    <div className="flex items-center gap-2.5">
                        <span className="text-[#3a2502]">✦</span>
                        <span className="text-xs font-bold tracking-[0.35em] text-[#1c1203] drop-shadow-[0_1px_0px_#c9a22780]">
                            ITEM INDEX · {ownedCount} / {totalCount}
                        </span>
                        <span className="text-[#3a2502]">✦</span>
                    </div>
                </div>

                {/* close */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-solid border-[#c9a227]/45 bg-[#1a1025]/80 text-[#f0d878] transition-colors hover:border-[#c9a227]/80 hover:bg-[#2a1a35]"
                >
                    {I.x}
                </button>

                {/* corner ornaments */}
                <div className="pointer-events-none absolute left-3 top-9 h-5 w-5 border-l-2 border-t-2 border-solid border-[#c9a227]/55" />
                <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-solid border-[#c9a227]/55" />
                <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-solid border-[#c9a227]/55" />

                {/* unlock banner */}
                {!unlocked && (
                    <div className="relative z-10 mx-6 mt-4 flex items-center gap-2 rounded-md border border-solid border-red-700/50 bg-red-950/40 px-3 py-2">
                        <span className="text-red-400">🔒</span>
                        <span className="text-[11px] text-red-300">
                            Locked details. Unlock acquisition hints by earning <b className="text-yellow-300">$500Q total money (lifetime)</b> AND owning <b className="text-yellow-300">every Premium product</b>.
                        </span>
                    </div>
                )}

                {/* item grid */}
                <div className="relative z-0 flex-1 overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
                        {BOSS_ITEMS.filter(item => !item.hideFromIndex).map(item => {
                            const owned = ownedItemIds.has(item.id);
                            return (
                                <IndexTile
                                    key={item.id}
                                    item={item}
                                    owned={owned}
                                    unlocked={unlocked}
                                    gameState={gs}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />
            </div>
        </div>
    );
}

function IndexTile({
    item,
    owned,
    unlocked,
    gameState: gs,
}: {
    item: BossItem;
    owned: boolean;
    unlocked: boolean;
    gameState: { ownedPremiumProductIds?: number[]; fastestPrestigeTime?: number | null; ownedTrinketIds?: string[] } | null;
}) {
    const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; flipBelow: boolean } | null>(null);
    const rarityColor = RARITY_HEX[item.rarity];
    const showDetails = unlocked || owned;
    const gateOpen = !item.acquisitionGate || owned || (gs ? isGateSatisfied(item.acquisitionGate, gs) : false);

    const TOOLTIP_W = 240;
    const TOOLTIP_H_EST = 220; // rough max so we know whether to flip below

    const computePos = (rect: DOMRect) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;
        // Anchor horizontally to tile center, then clamp into viewport
        const tileCenter = rect.left + rect.width / 2;
        let left = tileCenter - TOOLTIP_W / 2;
        if (left < margin) left = margin;
        if (left + TOOLTIP_W > vw - margin) left = vw - TOOLTIP_W - margin;

        // Default: above the tile. Flip below if not enough room.
        const flipBelow = rect.top - TOOLTIP_H_EST - margin < 0;
        const top = flipBelow ? rect.bottom + margin : rect.top - margin;
        return { left, top, flipBelow };
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos(computePos(rect));
    };
    const handleMouseLeave = () => setTooltipPos(null);

    return (
        <div
            className="group relative flex flex-col items-center gap-1.5"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div
                className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-2 bg-[#0c0900cc] p-1.5 transition-transform hover:scale-[1.05] ${owned && (item.rarity === 'ExqUiZxyte' || item.dualRarity === 'ExqUiZxyte') ? 'exquizxyte-border' : ''}`}
                style={{
                    borderColor: owned && item.rarity !== 'ExqUiZxyte' && !item.dualRarity ? rarityColor : (!owned ? '#3a3a3a' : undefined),
                    boxShadow: owned && item.rarity !== 'ExqUiZxyte' && !item.dualRarity ? `0 0 12px ${rarityColor}55` : 'none',
                    color: rarityColor,
                }}
            >
                <div
                    className="flex h-full w-full items-center justify-center transition-all"
                    style={{ filter: owned ? 'none' : 'grayscale(100%) brightness(0.45) opacity(0.6)' }}
                >
                    <ItemImage item={item} />
                </div>
                {!owned && (
                    <span className="pointer-events-none absolute right-1 top-1 text-[14px] text-neutral-500">🔒</span>
                )}
            </div>
            <span
                className="w-full truncate text-center text-[10px] font-bold leading-tight"
                style={{ color: owned ? rarityColor : '#666' }}
                title={item.name}
            >
                {owned ? item.name : '???'}
            </span>
            <span className={`text-[9px] uppercase tracking-widest text-[#c9a22799] ${showDetails ? getRarityTextClass(item) : ''}`}>
                {showDetails ? `${item.dualRarity ? `${item.rarity}+${item.dualRarity}` : item.rarity} · ${item.slot}` : '???'}
            </span>

            {/* hover tooltip — fixed-position so it never gets cropped by parent overflow */}
            {tooltipPos && (
                <div
                    className="pointer-events-none fixed z-[200] rounded-lg border-2 border-solid bg-[#0c0900]/98 p-3 shadow-[0px_8px_32px_0px_#000000d0]"
                    style={{
                        left: tooltipPos.left,
                        top: tooltipPos.top,
                        width: TOOLTIP_W,
                        transform: tooltipPos.flipBelow ? 'translateY(0)' : 'translateY(-100%)',
                        borderColor: showDetails ? rarityColor : '#7f1d1d',
                    }}
                >
                    {showDetails ? (
                        <>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="text-sm font-bold" style={{ color: rarityColor }}>{item.name}</span>
                                <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                                    style={{ borderColor: rarityColor, color: rarityColor }}
                                >
                                    {item.rarity}
                                </span>
                            </div>
                            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-[#c9a22799]">
                                Slot: {item.slot}
                            </div>
                            <div className="mb-2 text-[11px] leading-snug text-[#f0d878cc]">
                                {item.description}
                            </div>
                            {item.debuff && (
                                <div className="flex items-start gap-1 rounded-md border border-solid border-red-800/50 bg-red-950/30 px-2 py-1">
                                    <span className="text-[10px] text-red-400">⚠️</span>
                                    <span className="text-[10px] leading-snug text-red-300">{item.debuff}</span>
                                </div>
                            )}
                            {gateOpen ? (
                                <div className="flex flex-col gap-1 rounded-md border border-solid border-emerald-800/60 bg-emerald-950/40 px-2 py-1.5">
                                    <span className="text-emerald-400 text-[10px] font-bold">📜 How to get:</span>
                                    {item.acquisitionMethods && item.acquisitionMethods.length > 0 ? (
                                        item.acquisitionMethods.filter(m => m.showInIndex).map((m, i) => (
                                            <span key={i} className="text-[10px] leading-snug text-emerald-200">• {m.description}</span>
                                        ))
                                    ) : (
                                        <span className="text-[10px] leading-snug text-emerald-200">{item.acquisition}</span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-start gap-1 rounded-md border border-solid border-amber-800/50 bg-amber-950/30 px-2 py-1.5">
                                    <span className="text-amber-400 text-[10px]">🔐</span>
                                    <span className="text-[10px] leading-snug text-amber-200">{item.acquisitionGate!.hintText}</span>
                                </div>
                            )}
                            {!owned && (
                                <div className="mt-1.5 text-[9px] italic text-[#c9a22799]">
                                    You don&apos;t have this one yet.
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="mb-1.5 flex items-center gap-2">
                                <span className="text-red-400">🔒</span>
                                <span className="text-sm font-bold text-red-300">Hidden Item</span>
                            </div>
                            <div className="text-[11px] leading-snug text-[#f0d878cc]">
                                Earn <b className="text-yellow-300">$500Q total money (lifetime)</b> AND own every <b className="text-yellow-300">Premium product</b> to unlock acquisition hints for items you don&apos;t own.
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function DividerLabel({ label }: { label: string }) {
    return (
        <div className="flex w-full items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c9a227]/45" />
            <span className="text-xs font-bold tracking-[0.15em] text-[#f5c842]">{label}</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c9a227]/45" />
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex w-full items-center justify-between text-xs">
            <span className="text-[#c9a227b3]">{label}</span>
            <span className="font-bold text-[#f0d878]">{value}</span>
        </div>
    );
}

function InventorySlot({
    item,
    rsClassName,
    rsStyle,
    onEquip,
    onUnequip,
}: {
    item: BossItem;
    rsClassName: string;
    rsStyle?: React.CSSProperties;
    onEquip: (id: string) => void;
    onUnequip: (slot: BossItemSlot) => void;
}) {
    const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; flipBelow: boolean } | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const TOOLTIP_W = 260;
    const TOOLTIP_H_EST = 260;

    const keepOpen = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
    const scheduleClose = () => { keepOpen(); closeTimer.current = setTimeout(() => setTooltipPos(null), 200); };

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
        keepOpen();
        const rect = e.currentTarget.getBoundingClientRect();
        const vw = window.innerWidth;
        const margin = 8;
        const tileCenter = rect.left + rect.width / 2;
        let left = tileCenter - TOOLTIP_W / 2;
        if (left < margin) left = margin;
        if (left + TOOLTIP_W > vw - margin) left = vw - TOOLTIP_W - margin;
        const flipBelow = rect.top - TOOLTIP_H_EST - margin < 0;
        const top = flipBelow ? rect.bottom + margin : rect.top - margin;
        setTooltipPos({ left, top, flipBelow });
    };

    const rarityColor = RARITY_HEX[item.rarity];

    return (
        <>
            <button
                onMouseEnter={handleMouseEnter}
                onMouseLeave={scheduleClose}
                className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-md border-2 bg-[#0c0900cc] p-1.5 transition-all hover:scale-[1.04] ${rsClassName}`}
                style={{ color: rarityColor, ...rsStyle }}
            >
                <ItemImage item={item} dropShadow />
            </button>
            {tooltipPos && typeof document !== 'undefined' && createPortal(
                <div
                    className="pointer-events-auto fixed z-[200] flex flex-col gap-2 rounded-lg border-2 border-solid bg-[#0c0900]/98 p-3 shadow-[0px_8px_32px_0px_#000000d0]"
                    style={{
                        left: tooltipPos.left,
                        top: tooltipPos.top,
                        width: TOOLTIP_W,
                        transform: tooltipPos.flipBelow ? 'translateY(0)' : 'translateY(-100%)',
                        borderColor: rarityColor,
                    }}
                    onMouseEnter={keepOpen}
                    onMouseLeave={scheduleClose}
                >
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 flex-none overflow-hidden rounded-md border border-solid bg-[#0c0900] p-0.5" style={{ borderColor: rarityColor }}>
                            <ItemImage item={item} />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col items-start leading-tight">
                            <span className={`text-sm font-bold leading-snug ${getRarityTextClass(item)}`} style={{ color: item.rarity !== 'ExqUiZxyte' && !item.dualRarity ? rarityColor : undefined }}>
                                {item.name}
                            </span>
                            <span className={`text-[9px] uppercase tracking-wider text-[#c9a22799] ${getRarityTextClass(item)}`}>
                                {item.dualRarity ? `${item.rarity}+${item.dualRarity}` : item.rarity} · {item.slot}
                            </span>
                        </div>
                    </div>
                    <span className="text-[11px] leading-snug text-[#f0d878cc]">{item.description}</span>
                    {item.debuff && (
                        <div className="flex items-start gap-1 rounded-md border border-solid border-red-800/50 bg-red-950/30 px-2 py-1">
                            <span className="text-[10px] text-red-400">⚠️</span>
                            <span className="text-[10px] leading-snug text-red-300">{item.debuff}</span>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#c9a22799]">
                        <span>Sell: {item.sellPriceBC == null ? 'No Sell' : `${item.sellPriceBC.toLocaleString()} BC`}</span>
                        {item.inputKey && <span className="text-[#a78bfa]">Key: {item.inputKey}</span>}
                        {item.manaCost != null && <span className="text-blue-400">{item.manaCost} mana</span>}
                        {item.cooldownSec != null && <span className="text-amber-400">{item.cooldownSec}s CD</span>}
                        {item.maxUsesPerMatch != null && <span className="text-orange-400">Max {item.maxUsesPerMatch}/match</span>}
                        {item.duration && <span className="text-cyan-400">Duration: {item.duration}</span>}
                    </div>
                    <div className="flex w-full items-center gap-2 pt-1 border-t border-solid border-[#c9a22733]">
                        <button
                            onClick={() => { onEquip(item.id); setTooltipPos(null); }}
                            className="flex flex-1 items-center justify-center rounded-md border border-solid border-[#10b98166] bg-[#04785733] px-2 py-1.5 text-[10px] font-bold text-[#34d399] hover:bg-[#04785755]"
                        >
                            EQUIP
                        </button>
                        <button
                            onClick={() => { onUnequip(item.slot); setTooltipPos(null); }}
                            className="flex flex-1 items-center justify-center rounded-md border border-solid border-[#ef444466] bg-[#991b1b33] px-2 py-1.5 text-[10px] font-bold text-[#f87171] hover:bg-[#991b1b55]"
                        >
                            UNEQUIP
                        </button>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}

function PaperDoll({
    loadoutItems,
    onUnequip,
    big = false,
}: {
    loadoutItems: Partial<Record<BossItemSlot, BossItem>>;
    onUnequip: (slot: BossItemSlot) => void;
    big?: boolean;
}) {
    const containerCls = big ? 'h-[380px] w-[280px]' : 'h-[280px] w-full max-w-[220px]';

    type SlotStyle = React.CSSProperties;
    const renderSlot = (
        slot: BossItemSlot,
        label: string,
        fallbackEmoji: string,
        posStyle: SlotStyle,
        sizeCls: string,
        extraTransform = '',
    ) => {
        const item = loadoutItems[slot];
        const baseStyle: SlotStyle = { ...posStyle, transform: extraTransform || undefined };
        if (item) {
            return (
                <button
                    onClick={() => onUnequip(slot)}
                    title={`${label}: ${item.name} (click to unequip)`}
                    className={`absolute flex ${sizeCls} items-center justify-center overflow-hidden rounded-md border-2 bg-[#0c0900cc] p-1 shadow-[0px_0px_10px_0px_currentColor] transition-transform hover:z-10 hover:scale-[1.06]`}
                    style={{ ...baseStyle, borderColor: RARITY_HEX[item.rarity], color: RARITY_HEX[item.rarity] }}
                >
                    <ItemImage item={item} dropShadow />
                </button>
            );
        }
        return (
            <div
                title={label}
                className={`absolute flex ${sizeCls} items-center justify-center rounded-md border border-dashed border-[#c9a22766] bg-[#0c0900cc] text-base text-[#c9a22799]`}
                style={baseStyle}
            >
                {fallbackEmoji}
            </div>
        );
    };

    // Sizes calibrated to the user's hand-drawn sketch:
    //   - Head / Weapon / Defense are squares
    //   - Arms are wider rectangles (short height)
    //   - Torso is a tall rectangle (taller than wide)
    //   - Legs are tall rectangles, rotated outward
    const sq      = big ? 'h-[68px] w-[68px]'  : 'h-[42px] w-[42px]';   // Head/Weapon/Defense
    const armRect = big ? 'h-[40px] w-[68px]'  : 'h-[26px] w-[42px]';   // Arms (wide rect)
    const torso   = big ? 'h-[120px] w-[80px]' : 'h-[74px] w-[50px]';   // Torso (tall rect)
    const legRect = big ? 'h-[90px] w-[40px]'  : 'h-[56px] w-[26px]';   // Legs (tall rect, rotated)

    // Sketch positions (top-left percent unless otherwise noted):
    //   Weapon: top center, highest tile
    //   Head:   left side, slightly below Weapon's top
    //   Defense: right side, slightly below Weapon
    //   Arms-L / Arms-R: vertically centered, flanking the Torso
    //   Torso:  centered horizontally and vertically (tall)
    //   Legs-L / Legs-R: bottom area, rotated ~22° outward
    return (
        <div className={`relative ${containerCls} mx-auto`}>
            {/* WEAPON — top center, highest */}
            {renderSlot('WEAPON', 'Weapon', '⚔️',
                { top: '0%', left: '50%' }, sq, 'translateX(-50%)')}

            {/* HEAD — upper left, below Weapon */}
            {renderSlot('HEAD', 'Head', '🪖',
                { top: '12%', left: '4%' }, sq, '')}

            {/* DEFENSE — upper right, below Weapon */}
            {renderSlot('DEFENSE', 'Defense', '🛡️',
                { top: '12%', right: '4%' }, sq, '')}

            {/* ARMS LEFT — center vertical, far left */}
            {renderSlot('ARMS', 'Left Arm', '🧤',
                { top: '52%', left: '0%' }, armRect, 'translateY(-50%)')}

            {/* TORSO — dead center */}
            {renderSlot('TORSO', 'Torso', '👕',
                { top: '52%', left: '50%' }, torso, 'translate(-50%, -50%)')}

            {/* ARMS RIGHT — center vertical, far right (binds to same ARMS slot) */}
            {renderSlot('ARMS', 'Right Arm', '🧤',
                { top: '52%', right: '0%' }, armRect, 'translateY(-50%)')}

            {/* LEGS LEFT — rotated counter-clockwise */}
            {renderSlot('LEGS', 'Left Leg', '👢',
                { bottom: '18%', left: '28%' }, legRect, 'translateX(-50%) rotate(-22deg)')}

            {/* LEGS RIGHT — rotated clockwise */}
            {renderSlot('LEGS', 'Right Leg', '👢',
                { bottom: '18%', right: '28%' }, legRect, 'translateX(50%) rotate(22deg)')}

            {/* TRANSFORMATION — bottom right, no border, just the image floating */}
            {(() => {
                const tItem = loadoutItems['TRANSFORMATION'];
                const tSize = big ? 'h-[60px] w-[60px]' : 'h-[40px] w-[40px]';
                const tPos: React.CSSProperties = { bottom: '0%', right: '2%', position: 'absolute' };
                if (tItem) {
                    return (
                        <button
                            onClick={() => onUnequip('TRANSFORMATION')}
                            title={`Transformation: ${tItem.name} (click to unequip)`}
                            className={`${tSize} flex items-center justify-center overflow-hidden rounded-full transition-transform hover:scale-[1.1]`}
                            style={tPos}
                        >
                            <img
                                src={tItem.image}
                                alt={tItem.name}
                                className="h-full w-full object-contain drop-shadow-[0_0_8px_#ff69b4]"
                                style={{ transform: tItem.displayScale && tItem.displayScale !== 1 ? `scale(${tItem.displayScale})` : undefined }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </button>
                    );
                }
                return (
                    <div
                        title="Transformation"
                        className={`${tSize} flex items-center justify-center rounded-full text-base text-[#c9a22740]`}
                        style={tPos}
                    >
                        🌀
                    </div>
                );
            })()}
        </div>
    );
}
