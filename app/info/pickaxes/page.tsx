'use client';

import Link from 'next/link';

interface Pickaxe {
    name: string;
    damage: number | string;
    mkHealth: number | string;
    ability: string;
    rewardChance: string;
}

const PICKAXES: Pickaxe[] = [
    { name: 'Wood', damage: 1, mkHealth: 10, ability: 'None', rewardChance: 'N/A' },
    { name: 'Stone', damage: 3, mkHealth: 300, ability: 'None', rewardChance: 'N/A' },
    { name: 'Bronze', damage: 6, mkHealth: 360, ability: 'None', rewardChance: 'N/A' },
    { name: 'Copper', damage: 12, mkHealth: 450, ability: 'None', rewardChance: 'N/A' },
    {
        name: 'Iron',
        damage: 22,
        mkHealth: 700,
        ability: '15% per hit to start oxidation — MK takes 5% HP every 10s (no stacks)',
        rewardChance: '0.5%',
    },
    { name: 'Steel', damage: 40, mkHealth: '1K', ability: 'None', rewardChance: '0.7%' },
    { name: 'Silver', damage: 70, mkHealth: '1.2K', ability: 'None', rewardChance: '0.9%' },
    {
        name: 'Gold',
        damage: 120,
        mkHealth: '1.5K',
        ability: '50% per hit — crit + 2 attacks in 1',
        rewardChance: '2%',
    },
    { name: 'Platinum', damage: 200, mkHealth: '1.7K', ability: 'None', rewardChance: '1.2%' },
    {
        name: 'Diamond',
        damage: 350,
        mkHealth: '2K',
        ability: '15% to double reward (items get +45% money instead)',
        rewardChance: '3%',
    },
    { name: 'Obsidian', damage: 600, mkHealth: '3K', ability: '10% to paralyze MK after hit', rewardChance: '2.2%' },
    { name: 'Alexandrite', damage: 1, mkHealth: '6K', ability: 'None', rewardChance: '2.5%' },
    {
        name: 'Opal',
        damage: '1.8K',
        mkHealth: '10K',
        ability: 'Click anywhere to send pickaxe there (2x dmg if you retrieve it)',
        rewardChance: '2.7%',
    },
    {
        name: 'Doge',
        damage: '3.5K',
        mkHealth: '120K',
        ability: '3x money on win, 15% to stun for 2s after 2 hits <1s apart',
        rewardChance: '4%',
    },
    { name: 'Miner', damage: '5K', mkHealth: '100K', ability: 'None', rewardChance: '2.9%' },
    { name: 'Pin', damage: '8K', mkHealth: '129K', ability: 'Every 2 hits — stun for 2s', rewardChance: '3.1%' },
    {
        name: 'Heavens',
        damage: '12K',
        mkHealth: '150K',
        ability: 'Press X to teleport to cursor (5s cooldown)',
        rewardChance: '4.2%',
    },
    { name: 'Demon', damage: '18K', mkHealth: '200K', ability: 'Heal for 50% of damage dealt (can overheal)', rewardChance: '2.6%' },
    {
        name: 'Nuclear',
        damage: '25K',
        mkHealth: '300K',
        ability: 'Press X to drop nuke for 2x your damage',
        rewardChance: '2.6%',
    },
    { name: 'Laser', damage: '35K', mkHealth: '335K', ability: 'None', rewardChance: '3.7%' },
    {
        name: 'Nightmare',
        damage: '50K',
        mkHealth: '800K',
        ability: 'Stun 3s every time within 5 blocks (no stacks, 6s CD)',
        rewardChance: '4%',
    },
    {
        name: 'Sun',
        damage: '10K',
        mkHealth: '5M',
        ability: 'Press H to shoot sun laser (10K/s, +5K compound every 2s)',
        rewardChance: '6.7%',
    },
    { name: 'Light Saber', damage: '100K', mkHealth: '1.5M', ability: 'None', rewardChance: '4.5%' },
    { name: 'Plasma', damage: '120K', mkHealth: '4.5M', ability: 'Hit twice in a row — 500K instant dmg', rewardChance: '5%' },
    {
        name: 'Galaxy',
        damage: '180K',
        mkHealth: '10M',
        ability: 'Press B to throw black hole (600K dmg, 5s CD)',
        rewardChance: '5.5%',
    },
    { name: 'Yates', damage: '500K', mkHealth: '50M', ability: 'Every 2 hits — crit for 1M dmg', rewardChance: '6.5%' },
];

export default function PickaxesPage() {
    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Link href="/info" className="text-sm text-amber-400 hover:text-amber-300 transition">
                        ← Back
                    </Link>
                    <h1 className="text-4xl font-bold text-amber-300 mt-4 mb-2">Pickaxe Reference</h1>
                    <p className="text-slate-400">All 24 pickaxes with MK health scaling, damage, and special abilities</p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-xl">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700">
                                <th className="px-6 py-3 text-left text-amber-300 font-semibold">Pickaxe</th>
                                <th className="px-6 py-3 text-left text-amber-300 font-semibold">Damage</th>
                                <th className="px-6 py-3 text-left text-amber-300 font-semibold">MK Health</th>
                                <th className="px-6 py-3 text-left text-amber-300 font-semibold">Special Ability</th>
                                <th className="px-6 py-3 text-left text-amber-300 font-semibold">Reward Chance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {PICKAXES.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/30 transition">
                                    <td className="px-6 py-4 font-semibold text-slate-100">{p.name}</td>
                                    <td className="px-6 py-4 text-slate-300">{p.damage}</td>
                                    <td className="px-6 py-4 text-slate-300">{p.mkHealth}</td>
                                    <td className="px-6 py-4 text-slate-400 text-xs">{p.ability}</td>
                                    <td className="px-6 py-4 text-slate-300">{p.rewardChance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 p-6 bg-slate-800/40 rounded-lg border border-slate-700">
                    <h2 className="text-lg font-semibold text-amber-300 mb-3">How MK Health Works</h2>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        MK's health is determined by your pickaxe. Each pickaxe has a base health value (shown above). Your equipped gear
                        multiplies this: legendary items add 1x, mythic items add 2x, ExqUiZxyte items add 5x. Use the{' '}
                        <Link href="/info/pck-to-health" className="text-amber-400 hover:text-amber-300 underline">
                            calculator
                        </Link>{' '}
                        to estimate MK health for a specific loadout.
                    </p>
                </div>
            </div>
        </div>
    );
}
