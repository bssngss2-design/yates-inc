'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { BOSS_ITEMS, RARITY_WEIGHT } from '@/lib/bossItems';

const PICKAXE_BASE_HP: Record<string, number> = {
    Wood: 10,
    Stone: 300,
    Bronze: 360,
    Copper: 450,
    Iron: 700,
    Steel: 1000,
    Silver: 1200,
    Gold: 1500,
    Platinum: 1700,
    Diamond: 2000,
    Obsidian: 3000,
    Alexandrite: 6000,
    Opal: 10000,
    Doge: 120000,
    Miner: 100000,
    Pin: 129000,
    Heavens: 150000,
    Demon: 200000,
    Nuclear: 300000,
    Laser: 335000,
    Nightmare: 800000,
    Sun: 5000000,
    'Light Saber': 1500000,
    Plasma: 4500000,
    Galaxy: 10000000,
    Yates: 50000000,
};

export default function PickaxeToHealthPage() {
    const [selectedPickaxe, setSelectedPickaxe] = useState<string>('Yates');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const pickaxes = Object.keys(PICKAXE_BASE_HP).sort();
    const baseHP = PICKAXE_BASE_HP[selectedPickaxe] || 10;

    // Calculate gear multiplier
    const gearMultiplier = useMemo(() => {
        let total = 0;
        selectedItems.forEach((itemId) => {
            const item = BOSS_ITEMS.find((i) => i.id === itemId);
            if (!item || item.slot === 'WEAPON') return; // Skip weapons
            const weight = RARITY_WEIGHT[item.rarity] || 0;
            const dualWeight = item.dualRarity ? (RARITY_WEIGHT[item.dualRarity] || 0) : 0;
            total += weight + dualWeight;
        });
        return total;
    }, [selectedItems]);

    const finalHP = useMemo(() => {
        return Math.floor(baseHP * (1 + gearMultiplier));
    }, [baseHP, gearMultiplier]);

    const toggleItem = (itemId: string) => {
        setSelectedItems((prev) => (prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]));
    };

    // Group items by slot for display
    const itemsBySlot = useMemo(() => {
        const grouped: Record<string, typeof BOSS_ITEMS> = {};
        BOSS_ITEMS.forEach((item) => {
            if (!grouped[item.slot]) grouped[item.slot] = [];
            grouped[item.slot].push(item);
        });
        return grouped;
    }, []);

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link href="/info" className="text-sm text-amber-400 hover:text-amber-300 transition">
                        ← Back
                    </Link>
                    <h1 className="text-4xl font-bold text-amber-300 mt-4 mb-2">MK Health Calculator</h1>
                    <p className="text-slate-400">See how your loadout affects MegaKnight's health</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Controls */}
                    <div className="space-y-6">
                        {/* Pickaxe Selector */}
                        <div className="p-6 bg-slate-800/40 rounded-lg border border-slate-700">
                            <label className="block text-sm font-semibold text-amber-300 mb-3">Select Pickaxe</label>
                            <select
                                value={selectedPickaxe}
                                onChange={(e) => setSelectedPickaxe(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded hover:border-amber-500 transition focus:outline-none focus:border-amber-400"
                            >
                                {pickaxes.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-400 mt-2">
                                Base HP: <span className="text-amber-300 font-semibold">{baseHP.toLocaleString()}</span>
                            </p>
                        </div>

                        {/* Item Selector by Slot */}
                        <div className="p-6 bg-slate-800/40 rounded-lg border border-slate-700 space-y-4">
                            <label className="block text-sm font-semibold text-amber-300">Add Gear</label>
                            {Object.entries(itemsBySlot)
                                .sort()
                                .map(([slot, items]) => (
                                    <div key={slot} className="space-y-2">
                                        <p className="text-xs font-semibold text-slate-300 uppercase">{slot}</p>
                                        <div className="space-y-1">
                                            {items.map((item) => (
                                                <label
                                                    key={item.id}
                                                    className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded cursor-pointer transition"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.includes(item.id)}
                                                        onChange={() => toggleItem(item.id)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs text-slate-300">{item.name}</span>
                                                    <span className="text-xs text-slate-500 ml-auto">
                                                        {item.rarity}
                                                        {item.dualRarity && ` + ${item.dualRarity}`}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="flex flex-col gap-6">
                        <div className="p-8 bg-gradient-to-br from-amber-900/20 to-red-900/20 rounded-lg border border-amber-600/30 shadow-xl">
                            <p className="text-sm text-slate-400 mb-2">MegaKnight Health</p>
                            <p className="text-5xl font-bold text-amber-300">{finalHP.toLocaleString()}</p>
                            <p className="text-xs text-slate-500 mt-4">
                                {baseHP.toLocaleString()} × (1 + {gearMultiplier.toFixed(2)})
                            </p>
                        </div>

                        {/* Gear Breakdown */}
                        {selectedItems.length > 0 && (
                            <div className="p-6 bg-slate-800/40 rounded-lg border border-slate-700">
                                <h3 className="text-sm font-semibold text-amber-300 mb-3">Equipped Gear</h3>
                                <div className="space-y-2 text-xs">
                                    {selectedItems.map((itemId) => {
                                        const item = BOSS_ITEMS.find((i) => i.id === itemId);
                                        if (!item) return null;
                                        const weight = RARITY_WEIGHT[item.rarity] || 0;
                                        const dualWeight = item.dualRarity ? RARITY_WEIGHT[item.dualRarity] || 0 : 0;
                                        return (
                                            <div key={itemId} className="flex justify-between text-slate-300">
                                                <span>{item.name}</span>
                                                <span className="text-amber-400">+{weight + dualWeight}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-slate-600 mt-3 pt-3 flex justify-between font-semibold">
                                    <span className="text-slate-300">Total Multiplier</span>
                                    <span className="text-amber-300">1 + {gearMultiplier.toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        {/* Help Text */}
                        <div className="p-6 bg-slate-800/40 rounded-lg border border-slate-700">
                            <h3 className="text-sm font-semibold text-amber-300 mb-2">How It Works</h3>
                            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                                <li>Pick a pickaxe above for base MK health</li>
                                <li>Select gear to add rarity multipliers</li>
                                <li>Rarity weights: Common +0.1, Rare +0.2, Epic +0.5, Legendary +1.0, Mythic +2.0, ExqUiZxyte +5.0</li>
                                <li>Dual-rarity items stack both weights</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
