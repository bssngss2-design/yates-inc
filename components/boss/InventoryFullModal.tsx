'use client';

import BossOverlayFrame from './BossOverlayFrame';
import { BOSS_INVENTORY_MAX } from '@/contexts/BossContext';

interface InventoryFullModalProps {
    onClose: () => void;
    /** Close full modal and open loadout confirm (user accepts losing drops). */
    onFightAnyway: () => void;
    /** Close modal — user stays on boss menu to sell / remove items. */
    onManageInventory: () => void;
}

export default function InventoryFullModal({
    onClose,
    onFightAnyway,
    onManageInventory,
}: InventoryFullModalProps) {
    return (
        <BossOverlayFrame
            title="INVENTORY FULL"
            subtitle={`${BOSS_INVENTORY_MAX} / ${BOSS_INVENTORY_MAX} SLOTS`}
            onClose={onClose}
            footer={
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        onClick={onManageInventory}
                        className="flex flex-1 items-center justify-center rounded-lg border border-solid border-[#c9a227]/55 bg-gradient-to-b from-[#2a1e08] to-[#180f02] px-4 py-2.5 text-xs font-bold tracking-widest text-[#f0d878] transition-all hover:border-[#c9a227]/80 active:scale-[0.98]"
                    >
                        MANAGE INVENTORY
                    </button>
                    <button
                        onClick={onFightAnyway}
                        className="flex flex-1 items-center justify-center rounded-lg border border-solid border-[#f59e0b66] bg-gradient-to-b from-amber-800/80 to-amber-950 px-4 py-2.5 text-xs font-bold tracking-widest text-amber-200 transition-all hover:from-amber-700 hover:to-amber-900 active:scale-[0.98]"
                    >
                        FIGHT ANYWAY
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 rounded-lg border border-solid border-red-700/45 bg-red-950/35 px-4 py-3">
                    <span className="text-2xl leading-none">⚠️</span>
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-red-300">No room for new drops</p>
                        <p className="text-xs leading-relaxed text-red-200/80">
                            Your inventory is completely full. Any items you would earn from this fight{' '}
                            <span className="font-bold text-red-200">will be lost</span> until you free at least one slot.
                        </p>
                    </div>
                </div>

                <ul className="flex flex-col gap-2 text-xs text-[#c9a227]/75">
                    <li className="flex items-center gap-2">
                        <span className="text-[#f5c842]">•</span>
                        Sell items you don&apos;t need (future: sell from inventory)
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-[#f5c842]">•</span>
                        Use the cheat terminal or remove duplicates if testing
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-[#f5c842]">•</span>
                        Or press <span className="font-bold text-amber-300">FIGHT ANYWAY</span> if you only want BC
                    </li>
                </ul>
            </div>
        </BossOverlayFrame>
    );
}
