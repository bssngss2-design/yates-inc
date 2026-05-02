'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { BossItem, BossItemSlot, getItemById } from '@/lib/bossItems';
import { BossLoadout, BossStats, DEFAULT_BOSS_STATS, calculateComputedStats } from '@/lib/bossDefaults';

const STORAGE_KEY = 'yates.bosses.v1';
const INVENTORY_MAX = 45;

interface PersistedState {
    bc: number;
    inventory: string[]; // item IDs
    loadout: BossLoadout;
}

interface BossContextValue {
    bc: number;
    inventory: string[];
    inventoryItems: BossItem[]; // resolved
    loadout: BossLoadout;
    loadoutItems: Partial<Record<BossItemSlot, BossItem>>;
    baseStats: BossStats;
    computedStats: BossStats;
    addBC: (amount: number) => void;
    spendBC: (amount: number) => boolean;
    addItem: (id: string) => boolean; // false if inventory full
    removeItem: (id: string) => void;
    equipItem: (id: string) => void;
    unequipSlot: (slot: BossItemSlot) => void;
    isFull: boolean;
}

const BossContext = createContext<BossContextValue | null>(null);

const DEFAULT_DEMO_INVENTORY: string[] = [
    'meganut_sword',
    'meganut_helmet',
    'mk_chestplate',
    'mk_gauntlets',
    'gis_pin',
    'mj_hat',
    'bernardo_bomb',
    '42nd_eye',
    'mc_block',
    'tuff_wig',
    'blue_glasses',
];

export function BossProvider({ children }: { children: ReactNode }) {
    const [bc, setBC] = useState<number>(12_450);
    const [inventory, setInventory] = useState<string[]>(DEFAULT_DEMO_INVENTORY);
    const [loadout, setLoadout] = useState<BossLoadout>({
        HEAD: 'meganut_helmet',
        WEAPON: 'meganut_sword',
        TORSO: 'mk_chestplate',
        DEFENSE: 'mk_gauntlets',
    });

    // Hydrate from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed: PersistedState = JSON.parse(raw);
            if (typeof parsed.bc === 'number') setBC(parsed.bc);
            if (Array.isArray(parsed.inventory)) setInventory(parsed.inventory);
            if (parsed.loadout && typeof parsed.loadout === 'object') setLoadout(parsed.loadout);
        } catch {}
    }, []);

    useEffect(() => {
        try {
            const payload: PersistedState = { bc, inventory, loadout };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {}
    }, [bc, inventory, loadout]);

    const inventoryItems = useMemo(
        () => inventory.map(getItemById).filter((i): i is BossItem => Boolean(i)),
        [inventory],
    );

    const loadoutItems = useMemo(() => {
        const out: Partial<Record<BossItemSlot, BossItem>> = {};
        for (const [slot, id] of Object.entries(loadout) as [BossItemSlot, string][]) {
            const item = id ? getItemById(id) : undefined;
            if (item) out[slot] = item;
        }
        return out;
    }, [loadout]);

    const computedStats = useMemo(
        () => calculateComputedStats(DEFAULT_BOSS_STATS, loadout),
        [loadout],
    );

    const addBC = useCallback((amount: number) => setBC(p => Math.max(0, p + amount)), []);
    const spendBC = useCallback((amount: number) => {
        let ok = false;
        setBC(p => {
            if (p >= amount) { ok = true; return p - amount; }
            return p;
        });
        return ok;
    }, []);

    const addItem = useCallback((id: string): boolean => {
        if (inventory.length >= INVENTORY_MAX) return false;
        if (!getItemById(id)) return false;
        setInventory(p => [...p, id]);
        return true;
    }, [inventory.length]);

    const removeItem = useCallback((id: string) => {
        setInventory(p => {
            const idx = p.indexOf(id);
            if (idx < 0) return p;
            const next = [...p];
            next.splice(idx, 1);
            return next;
        });
        // also unequip if equipped
        setLoadout(p => {
            const next = { ...p };
            for (const slot of Object.keys(next) as BossItemSlot[]) {
                if (next[slot] === id) delete next[slot];
            }
            return next;
        });
    }, []);

    const equipItem = useCallback((id: string) => {
        const item = getItemById(id);
        if (!item) return;
        if (!inventory.includes(id)) return;
        setLoadout(p => ({ ...p, [item.slot]: id }));
    }, [inventory]);

    const unequipSlot = useCallback((slot: BossItemSlot) => {
        setLoadout(p => {
            const next = { ...p };
            delete next[slot];
            return next;
        });
    }, []);

    const value: BossContextValue = {
        bc,
        inventory,
        inventoryItems,
        loadout,
        loadoutItems,
        baseStats: DEFAULT_BOSS_STATS,
        computedStats,
        addBC,
        spendBC,
        addItem,
        removeItem,
        equipItem,
        unequipSlot,
        isFull: inventory.length >= INVENTORY_MAX,
    };

    return <BossContext.Provider value={value}>{children}</BossContext.Provider>;
}

export function useBoss(): BossContextValue {
    const ctx = useContext(BossContext);
    if (!ctx) throw new Error('useBoss must be used inside BossProvider');
    return ctx;
}

export const BOSS_INVENTORY_MAX = INVENTORY_MAX;
