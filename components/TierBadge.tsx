'use client';

import { useTier, xpToNextTier, SPECIAL_EMPLOYEE_IDS } from '@/contexts/TierContext';

interface Props {
  employeeId: string;
  size?: 'xs' | 'sm' | 'md';
  showXp?: boolean;
  className?: string;
}

function tierColor(tier: number): string {
  if (tier >= 90) return 'from-purple-500 via-fuchsia-500 to-pink-500'; // legendary
  if (tier >= 70) return 'from-yellow-400 to-amber-500'; // gold
  if (tier >= 40) return 'from-emerald-400 to-green-600'; // green
  if (tier >= 20) return 'from-sky-400 to-blue-600'; // blue
  return 'from-gray-400 to-slate-600'; // gray
}

export default function TierBadge({ employeeId, size = 'sm', showXp = false, className = '' }: Props) {
  const { getTier } = useTier();
  const t = getTier(employeeId);
  const tier = t?.current_tier ?? 1;
  const xp = t?.current_xp ?? 0;
  const nextXp = xpToNextTier(tier);

  const sz = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }[size];

  const gradient = tierColor(tier);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-black text-white bg-gradient-to-r ${gradient} shadow-sm border border-black/20 ${sz} ${className}`}
      title={
        tier >= 100
          ? `Max tier! Total XP: ${t?.total_xp_earned ?? 0}`
          : `Tier ${tier} · ${xp} / ${nextXp} XP`
      }
    >
      <span>T{tier}</span>
      {showXp && tier < 100 && (
        <span className="opacity-80 font-bold">
          {xp}/{nextXp}
        </span>
      )}
      {showXp && tier >= 100 && <span className="opacity-80 font-bold">MAX</span>}
    </span>
  );
}

export function shouldShowRole(employeeId: string): boolean {
  return SPECIAL_EMPLOYEE_IDS.includes(employeeId);
}
