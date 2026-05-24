'use client';

import { BossItem, BossItemSlot, RARITY_HEX } from '@/lib/bossItems';
import { BossStats } from '@/lib/bossDefaults';
import BossOverlayFrame from './BossOverlayFrame';

const SLOT_ORDER: { slot: BossItemSlot; label: string }[] = [
    { slot: 'WEAPON', label: 'Weapon' },
    { slot: 'HEAD', label: 'Head' },
    { slot: 'TORSO', label: 'Torso' },
    { slot: 'ARMS', label: 'Arms' },
    { slot: 'LEGS', label: 'Legs' },
    { slot: 'DEFENSE', label: 'Defense' },
    { slot: 'TRANSFORMATION', label: 'Transformation' },
];

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex w-full items-center justify-between gap-2 text-[11px]">
            <span className="text-[#c9a227]/75">{label}</span>
            <span className="font-bold text-[#f0d878]">{value}</span>
        </div>
    );
}

interface LoadoutConfirmScreenProps {
    bossName: string;
    bossSubtitle?: string;
    loadoutItems: Partial<Record<BossItemSlot, BossItem>>;
    computedStats: BossStats;
    mkHpMin: number;
    mkHpMax: number;
    inventoryFull?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function LoadoutConfirmScreen({
    bossName,
    bossSubtitle = 'The First Boss',
    loadoutItems,
    computedStats,
    mkHpMin,
    mkHpMax,
    inventoryFull = false,
    onConfirm,
    onCancel,
}: LoadoutConfirmScreenProps) {
    const hasWeapon = Boolean(loadoutItems.WEAPON);
    const equippedCount = SLOT_ORDER.filter(({ slot }) => loadoutItems[slot]).length;

    return (
        <BossOverlayFrame
            title="ENTER ARENA"
            subtitle={`VS ${bossName.toUpperCase()}`}
            onClose={onCancel}
            maxWidth="max-w-2xl"
            footer={
                <div className="flex flex-col gap-2">
                    {inventoryFull && (
                        <p className="text-center text-[10px] font-bold text-amber-400/90">
                            ⚠ Inventory full — drops from this fight will be lost
                        </p>
                    )}
                    {!hasWeapon && (
                        <p className="text-center text-[10px] font-bold text-red-400">
                            Equip a weapon before fighting (Wooden PCK is free by default in arena)
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="flex flex-1 items-center justify-center rounded-lg border border-solid border-[#c9a227]/40 bg-[#1a1206]/80 px-4 py-2.5 text-xs font-bold tracking-widest text-[#c9a227]/80 transition-all hover:border-[#c9a227]/60 hover:text-[#f0d878] active:scale-[0.98]"
                        >
                            BACK
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex flex-[2] items-center justify-center gap-2 rounded-lg border border-solid border-[#10b98180] bg-gradient-to-b from-emerald-600 to-emerald-800 px-4 py-2.5 text-sm font-bold tracking-[0.15em] text-[#d1fae5] transition-all hover:from-emerald-500 hover:to-emerald-700 hover:shadow-[0px_6px_24px_0px_#05966958] active:scale-[0.98]"
                        >
                            <span>▶</span>
                            ENTER FIGHT
                        </button>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-5 lg:flex-row">
                {/* Boss preview */}
                <div className="flex flex-none flex-col gap-2 lg:w-[200px]">
                    <div className="overflow-hidden rounded-lg border-2 border-solid border-[#c9a227]/55">
                        <img
                            src="/bosses/Meganut.jpeg"
                            alt={bossName}
                            className="h-32 w-full object-cover"
                        />
                        <div className="bg-[#0c0900]/90 px-2 py-1.5 text-center">
                            <p className="text-sm font-bold text-[#f0d878]">{bossName}</p>
                            <p className="text-[10px] text-[#c9a227]/70">{bossSubtitle}</p>
                        </div>
                    </div>
                    <div className="rounded-md border border-solid border-[#c9a227]/35 bg-[#c9a2270a] px-3 py-2">
                        <p className="text-[9px] font-bold tracking-wider text-[#c9a227]/60">MK EST. HP</p>
                        <p className="text-sm font-bold text-[#f87171]">
                            {mkHpMin.toLocaleString()} – {mkHpMax.toLocaleString()}
                        </p>
                        <p className="mt-1 text-[9px] italic text-[#a78bfa]/80">Based on weapon + gear</p>
                    </div>
                    <p className="text-center text-[10px] text-[#f5c842]">+2,500 BC per kill</p>
                </div>

                {/* Loadout + stats */}
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <div>
                        <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-[#f5c842]">
                            LOADOUT · {equippedCount} EQUIPPED
                        </p>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {SLOT_ORDER.map(({ slot, label }) => {
                                const item = loadoutItems[slot];
                                return (
                                    <div
                                        key={slot}
                                        className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                                            item
                                                ? 'border-solid bg-[#0c0900]/60'
                                                : 'border-dashed border-[#c9a227]/25 bg-[#0c0900]/30'
                                        }`}
                                        style={item ? { borderColor: `${RARITY_HEX[item.rarity]}66` } : undefined}
                                    >
                                        <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded bg-[#0c0900]">
                                            {item ? (
                                                <img
                                                    src={item.image}
                                                    alt=""
                                                    className="max-h-full max-w-full object-contain"
                                                    style={{
                                                        transform:
                                                            item.displayScale && item.displayScale !== 1
                                                                ? `scale(${item.displayScale})`
                                                                : undefined,
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-sm text-[#c9a227]/30">—</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] uppercase tracking-wider text-[#c9a227]/50">
                                                {label}
                                            </p>
                                            <p className="truncate text-[11px] font-bold text-[#f0d878]">
                                                {item?.name ?? 'Empty'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-lg border border-solid border-[#c9a227]/40 bg-[#c9a2270a] px-3 py-2.5">
                        <p className="mb-2 border-b border-solid border-[#c9a227]/20 pb-1 text-[10px] font-bold tracking-[0.15em] text-[#f5c842]">
                            YOUR STATS
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <StatRow label="❤️ Health" value={computedStats.health.toLocaleString()} />
                            <StatRow label="⚔️ Damage" value={computedStats.dmg.toLocaleString()} />
                            <StatRow label="💨 Speed" value={String(computedStats.speed)} />
                            <StatRow label="⚡ Atk Speed" value={String(computedStats.atkSpeed)} />
                            <StatRow label="🛡️ Dmg Reduc" value={String(computedStats.defense)} />
                            <StatRow label="💫 Dodge" value={`${computedStats.dodge}%`} />
                            <StatRow label="🎯 Crit" value={`${computedStats.crit}%`} />
                            <StatRow label="✨ Mana" value={String(computedStats.mana)} />
                            <StatRow label="💚 HP Regen" value={`${computedStats.hpRegen}/3s`} />
                        </div>
                    </div>
                </div>
            </div>
        </BossOverlayFrame>
    );
}
