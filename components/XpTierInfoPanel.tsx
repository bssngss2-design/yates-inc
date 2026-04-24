'use client';

/**
 * XpTierInfoPanel — tutorial-style rundown of how employees earn XP and what
 * each tier milestone unlocks. Designed to sit on the /employees page next to
 * the Employee of the Month plaque. Styling mirrors the ForemanJackTutorial
 * in-game dialog so the whole "this is a gamified workplace" vibe carries
 * from the mines to the office.
 */

interface Props {
  className?: string;
}

interface XpSource {
  icon: string;
  label: string;
  reward: string;
}

interface TierReward {
  tier: string;
  title: string;
  detail?: string;
}

const XP_SOURCES: XpSource[] = [
  { icon: '🗳️', label: 'Voting on tax proposals', reward: '+50 XP' },
  { icon: '💰', label: 'Budget contributions (per deposit)', reward: '+30 XP' },
  { icon: '⛏️', label: 'Playing the mining game (every 5 min)', reward: '+10 XP' },
  { icon: '👑', label: 'Winning Employee of the Month', reward: '+1 instant tier' },
];

const TIER_REWARDS: TierReward[] = [
  {
    tier: 'T50',
    title: 'SwurM store exclusive + Bank interest rate +1',
    detail: 'Unlocks a special item in the SwurM store and permanently bumps your in-game Bank interest rate by 1.',
  },
  {
    tier: 'T67',
    title: 'Achievement: Tier 67 — +25 XP to every XP source',
    detail: 'Unlocks an achievement that tacks on an extra +25 XP to every single thing that earns XP.',
  },
  {
    tier: 'T70',
    title: '+10% paycheck (and +2% per tier after)',
    detail: 'Base paycheck raise. Each tier past 70 adds another +2% to your salary.',
  },
  {
    tier: 'T90',
    title: '+15% paycheck milestone',
    detail: 'Bigger paycheck bump once you hit Tier 90.',
  },
  {
    tier: 'T100',
    title: '+25% paycheck · Double VfC vote · Rock 35 & Pickaxe 29',
    detail: 'Max tier perks: +25% paycheck, your vote counts twice in Vote for Change, and you unlock up to Rock 35 and Pickaxe 29 in the mining game.',
  },
];

export default function XpTierInfoPanel({ className = '' }: Props) {
  return (
    <div
      className={`bg-gray-900/95 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden ${className}`}
    >
      {/* Header — matches Foreman Jack dialog styling */}
      <div className="bg-gradient-to-r from-amber-900/60 to-amber-800/40 px-4 py-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-700 rounded-full flex items-center justify-center text-xl border-2 border-amber-500">
          ⭐
        </div>
        <div className="min-w-0">
          <div className="text-amber-300 font-bold text-sm">XP & Tier Rewards</div>
          <div className="text-amber-500/60 text-[10px]">How to grind Yates Co.</div>
        </div>
      </div>

      <div className="px-4 py-4 text-gray-200 text-sm leading-relaxed space-y-5">
        {/* How to gain XP */}
        <section>
          <h3 className="text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
            How to gain XP
          </h3>
          <ul className="space-y-1.5">
            {XP_SOURCES.map((s) => (
              <li key={s.label} className="flex items-start gap-2">
                <span className="text-base leading-tight">{s.icon}</span>
                <span className="flex-1">
                  {s.label}
                  <span className="ml-2 text-amber-300 font-bold whitespace-nowrap">{s.reward}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* What XP unlocks */}
        <section>
          <h3 className="text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
            What XP is for — tier milestones
          </h3>
          <p className="text-[11px] text-gray-400 mb-3">
            Every tier is earned, every milestone is permanent.
          </p>
          <ul className="space-y-2">
            {TIER_REWARDS.map((r) => (
              <li
                key={r.tier}
                className="rounded-lg bg-amber-950/40 border border-amber-800/40 px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold shrink-0">
                    {r.tier}
                  </span>
                  <span className="text-sm font-semibold text-amber-200">{r.title}</span>
                </div>
                {r.detail && (
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{r.detail}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
