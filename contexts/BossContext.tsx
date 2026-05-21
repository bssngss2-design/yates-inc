'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { BossItem, BossItemSlot, getItemById } from '@/lib/bossItems';
import { BossLoadout, BossStats, DEFAULT_BOSS_STATS, calculateComputedStats } from '@/lib/bossDefaults';
import { supabase } from '@/lib/supabase';

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
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Get authenticated user
    useEffect(() => {
        const getUser = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                setUserId(user?.id || null);
                if (user?.id) {
                    // Fetch from DB if user exists
                    await loadFromDB(user.id);
                }
            } catch (err) {
                console.error('Auth error:', err);
            } finally {
                setLoading(false);
            }
        };
        getUser();
    }, []);

    const loadFromDB = async (uid: string) => {
        try {
            // Fetch BC
            const { data: bcData } = await supabase.from('boss_coins').select('amount').eq('user_id', uid).single();
            if (bcData) setBC(bcData.amount);

            // Fetch inventory
            const { data: invData } = await supabase.from('boss_inventory').select('item_id').eq('user_id', uid);
            if (invData) setInventory(invData.map((i) => i.item_id));

            // Fetch loadout
            const { data: loadoutData } = await supabase.from('boss_loadout').select('*').eq('user_id', uid).single();
            if (loadoutData) {
                const lo: BossLoadout = {};
                if (loadoutData.weapon) lo['WEAPON'] = loadoutData.weapon;
                if (loadoutData.head) lo['HEAD'] = loadoutData.head;
                if (loadoutData.torso) lo['TORSO'] = loadoutData.torso;
                if (loadoutData.defense) lo['DEFENSE'] = loadoutData.defense;
                if (loadoutData.legs) lo['LEGS'] = loadoutData.legs;
                if (loadoutData.arms) lo['ARMS'] = loadoutData.arms;
                if (loadoutData.transformation) lo['TRANSFORMATION'] = loadoutData.transformation;
                setLoadout(lo);
            }
        } catch (err) {
            console.error('DB load error:', err);
        }
    };

    // Sync BC to DB
    useEffect(() => {
        if (!userId) return;
        const syncBC = async () => {
            try {
                await supabase.from('boss_coins').upsert({ user_id: userId, amount: bc, updated_at: new Date().toISOString() });
            } catch (err) {
                console.error('BC sync error:', err);
            }
        };
        syncBC();
    }, [bc, userId]);

    // Sync inventory to DB
    useEffect(() => {
        if (!userId) return;
        const syncInventory = async () => {
            try {
                // Clear old inventory
                await supabase.from('boss_inventory').delete().eq('user_id', userId);
                // Insert new
                if (inventory.length > 0) {
                    await supabase.from('boss_inventory').insert(inventory.map((item_id) => ({ user_id: userId, item_id })));
                }
            } catch (err) {
                console.error('Inventory sync error:', err);
            }
        };
        syncInventory();
    }, [inventory, userId]);

    // Sync loadout to DB
    useEffect(() => {
        if (!userId) return;
        const syncLoadout = async () => {
            try {
                await supabase.from('boss_loadout').upsert({
                    user_id: userId,
                    weapon: loadout.WEAPON || null,
                    head: loadout.HEAD || null,
                    torso: loadout.TORSO || null,
                    defense: loadout.DEFENSE || null,
                    legs: loadout.LEGS || null,
                    arms: loadout.ARMS || null,
                    transformation: loadout.TRANSFORMATION || null,
                    updated_at: new Date().toISOString(),
                });
            } catch (err) {
                console.error('Loadout sync error:', err);
            }
        };
        syncLoadout();
    }, [loadout, userId]);

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

    return (
        <BossContext.Provider value={loading ? { ...value, inventoryItems: [] } : value}>{children}</BossContext.Provider>
    );
}

export function useBoss(): BossContextValue {
    const ctx = useContext(BossContext);
    if (!ctx) throw new Error('useBoss must be used inside BossProvider');
    return ctx;
}

export const BOSS_INVENTORY_MAX = INVENTORY_MAX;
