'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import {
  useTaxVote,
  APPROVER_IDS,
  APPROVER_NAMES,
  LOGAN_ID,
  MAX_SCHEDULED_PROPOSALS,
  type ChangeProposal,
} from '@/contexts/TaxVoteContext';

function formatMoney(amount: number): string {
  if (!isFinite(amount)) return '∞';
  if (amount >= 1e42) return `${(amount / 1e42).toFixed(2)}Tr`;
  if (amount >= 1e39) return `${(amount / 1e39).toFixed(2)}Dr`;
  if (amount >= 1e36) return `${(amount / 1e36).toFixed(2)}Un`;
  if (amount >= 1e33) return `${(amount / 1e33).toFixed(2)}Dc`;
  if (amount >= 1e30) return `${(amount / 1e30).toFixed(2)}No`;
  if (amount >= 1e27) return `${(amount / 1e27).toFixed(2)}Oc`;
  if (amount >= 1e24) return `${(amount / 1e24).toFixed(2)}Sp`;
  if (amount >= 1e21) return `${(amount / 1e21).toFixed(2)}Sx`;
  if (amount >= 1e18) return `${(amount / 1e18).toFixed(2)}Qi`;
  if (amount >= 1e15) return `${(amount / 1e15).toFixed(2)}Q`;
  if (amount >= 1e12) return `${(amount / 1e12).toFixed(2)}T`;
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toFixed(0);
}

// Suffix -> multiplier. Mirrors the suffixes that formatMoney produces, plus a
// few common aliases (e.g. "non" for nonillion, "dec" for decillion) so users
// can type whatever feels natural. Order in the regex matters: longer suffixes
// must be tried before shorter ones so "qi" doesn't match as "q" + "i".
const SHORT_SUFFIX_MULTIPLIERS: Array<[string, number]> = [
  ['tr', 1e42],
  ['dr', 1e39],
  ['un', 1e36],
  ['dec', 1e33],
  ['dc', 1e33],
  ['non', 1e30],
  ['no', 1e30],
  ['oc', 1e27],
  ['sp', 1e24],
  ['sx', 1e21],
  ['qi', 1e18],
  ['q', 1e15],
  ['t', 1e12],
  ['b', 1e9],
  ['m', 1e6],
  ['k', 1e3],
];

function parseShortMoney(input: string): number | null {
  const cleaned = input.trim().replace(/[\s,$_]/g, '').toLowerCase();
  if (!cleaned) return null;
  const match = cleaned.match(/^(-?\d*\.?\d+)([a-z]*)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (!isFinite(num)) return null;
  const suffix = match[2];
  if (!suffix) return num;
  const found = SHORT_SUFFIX_MULTIPLIERS.find(([s]) => s === suffix);
  if (!found) return null;
  return num * found[1];
}

function timeLeft(endIso: string): string {
  const ms = new Date(endIso).getTime() - Date.now();
  if (ms <= 0) return 'ENDED';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface VoteForChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

type Tab = 'active' | 'proposals' | 'suggest' | 'history';

export default function VoteForChangeModal({ isOpen, onClose, initialTab }: VoteForChangeModalProps) {
  const { employee, isLoggedIn } = useAuth();
  const { client, isClient } = useClient();
  const {
    pool,
    proposals,
    activeProposal,
    submitProposal,
    voteOnProposal,
    setProposalCost,
    setProposalTimer,
  } = useTaxVote();

  const [tab, setTab] = useState<Tab>(initialTab ?? 'active');

  // Sync to prop when it changes (e.g. admin bar jumps directly to 'proposals')
  useEffect(() => {
    if (isOpen && initialTab) setTab(initialTab);
  }, [isOpen, initialTab]);
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestDesc, setSuggestDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [, forceRerender] = useState(0);

  // Tick every second so countdown updates
  useEffect(() => {
    if (!isOpen) return;
    const i = setInterval(() => forceRerender((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [isOpen]);

  const currentUserId = employee?.id || (isClient ? client?.id : null);
  const currentUserName = employee?.name || client?.username || 'Anonymous';
  const currentUserType: 'employee' | 'client' = employee ? 'employee' : 'client';
  const isApprover = employee ? APPROVER_IDS.includes(employee.id as any) : false;
  const isLogan = employee?.id === LOGAN_ID;

  const pending = useMemo(() => proposals.filter((p) => p.status === 'pending'), [proposals]);
  const approved = useMemo(() => proposals.filter((p) => p.status === 'approved'), [proposals]);
  const queuedCount = useMemo(
    () => proposals.filter((p) => p.status === 'queued').length,
    [proposals],
  );
  const history = useMemo(
    () => proposals.filter((p) => ['rejected', 'completed'].includes(p.status)),
    [proposals],
  );

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!currentUserId) {
      setSubmitMsg({ type: 'err', text: 'You need to be logged in to submit an idea.' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    const res = await submitProposal({
      proposer_id: currentUserId,
      proposer_name: currentUserName,
      proposer_type: currentUserType,
      title: suggestTitle,
      description: suggestDesc,
    });
    setSubmitting(false);
    if (res.success) {
      setSuggestTitle('');
      setSuggestDesc('');
      setSubmitMsg({ type: 'ok', text: 'Idea submitted! Awaiting approver votes.' });
      setTab('proposals');
    } else {
      setSubmitMsg({ type: 'err', text: res.error || 'Failed to submit' });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-4 border-yellow-500 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-black p-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">🗳️ Vote for Change</h2>
            <p className="text-xs sm:text-sm opacity-80 mt-1">
              Community-funded upgrades to Yates Co. Your tax dollars at work.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:bg-black/10 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Pool balance */}
        <div className="bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-950/30 dark:to-gray-900 px-5 py-4 border-b-2 border-yellow-400/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-xs uppercase font-bold text-yellow-700 dark:text-yellow-400 tracking-wide">
                Tax Pool Balance
              </div>
              <div className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                ${formatMoney(pool?.balance ?? 0)}
              </div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 sm:text-right">
              <div>
                Collected: <span className="font-semibold">${formatMoney(pool?.total_collected ?? 0)}</span>
              </div>
              <div>
                Spent: <span className="font-semibold">${formatMoney(pool?.total_spent ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {([
            ['active', `Active${activeProposal ? ' ●' : ''}`],
            ['proposals', `Proposals (${pending.length + approved.length})`],
            ['suggest', 'Suggest an Idea'],
            ['history', 'History'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={`flex-1 py-3 px-2 text-xs sm:text-sm font-semibold transition-colors ${
                tab === key
                  ? 'bg-white dark:bg-gray-900 text-yellow-700 dark:text-yellow-400 border-b-2 border-yellow-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'active' && (
            <ActiveTab active={activeProposal} />
          )}

          {tab === 'proposals' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  ⏳ Pending Approval
                  <span className="text-xs font-normal text-gray-500">(3/5 vote needed)</span>
                </h3>
                {pending.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                    No pending proposals. Got an idea? Head to the "Suggest an Idea" tab.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pending.map((p) => (
                      <ProposalCard
                        key={p.id}
                        p={p}
                        isApprover={isApprover}
                        approverId={employee?.id}
                        onVote={voteOnProposal}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  ✅ Approved — Awaiting Cost &amp; Timer
                </h3>
                {approved.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                    Nothing approved right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approved.map((p) => (
                      <ApprovedProposalCard
                        key={p.id}
                        p={p}
                        isApprover={isApprover}
                        isLogan={isLogan}
                        approverId={employee?.id}
                        poolBalance={pool?.balance ?? 0}
                        hasActive={!!activeProposal}
                        activeTitle={activeProposal?.title}
                        queuedCount={queuedCount}
                        scheduledCount={(activeProposal ? 1 : 0) + queuedCount}
                        maxScheduled={MAX_SCHEDULED_PROPOSALS}
                        onSetCost={setProposalCost}
                        onSetTimer={setProposalTimer}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'suggest' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500 p-4 rounded-r">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Submit anything — a new feature, a party, a bonus. The 5 approvers
                  (Logan, Bernardo, Harris, Wyatt, Suhas) will vote. 3 yes votes = approved.
                </p>
              </div>

              {!isLoggedIn && !isClient && (
                <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 rounded-r text-sm text-red-800 dark:text-red-300">
                  You need an account to submit ideas. Click "Make an account" in the top bar.
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Idea title
                </label>
                <input
                  type="text"
                  value={suggestTitle}
                  onChange={(e) => setSuggestTitle(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Demote logan cause why not"
                  className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Describe it
                </label>
                <textarea
                  value={suggestDesc}
                  onChange={(e) => setSuggestDesc(e.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="What, why, and how much should it cost from the pool?"
                  className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                />
                <div className="text-xs text-gray-500 mt-1">{suggestDesc.length}/500</div>
              </div>

              {submitMsg && (
                <div
                  className={`text-sm p-3 rounded-lg ${
                    submitMsg.type === 'ok'
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300'
                  }`}
                >
                  {submitMsg.text}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || !suggestTitle.trim() || !suggestDesc.trim() || (!isLoggedIn && !isClient)}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-black font-bold py-3 rounded-lg transition-colors"
              >
                {submitting ? 'Submitting...' : '📨 Submit Idea for Vote'}
              </button>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                  No history yet.
                </div>
              ) : (
                history.map((p) => <HistoryCard key={p.id} p={p} />)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Sub-components ----------------

function ActiveTab({ active }: { active: ChangeProposal | null }) {
  if (!active) {
    return (
      <div className="text-center py-10">
        <div className="text-6xl mb-3">🏛️</div>
        <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Nothing active right now
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Once a proposal is approved, gets its cost set, and Logan starts the timer, it'll show up here.
        </div>
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-black rounded-xl p-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs font-black uppercase tracking-widest opacity-70">
            Currently Active Change
          </div>
          <h3 className="text-3xl font-black mt-1">{active.title}</h3>
          <p className="mt-3 text-sm whitespace-pre-wrap">{active.description}</p>
          <div className="mt-4 text-xs opacity-80">
            Proposed by <span className="font-bold">{active.proposer_name}</span> · Cost:{' '}
            <span className="font-bold">${formatMoney(active.cost_amount ?? 0)}</span>
          </div>
        </div>
        <div className="bg-black text-yellow-400 rounded-lg px-4 py-3 text-center min-w-[140px]">
          <div className="text-[10px] uppercase tracking-widest opacity-70">Ends in</div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {active.timer_end ? timeLeft(active.timer_end) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({
  p,
  isApprover,
  approverId,
  onVote,
}: {
  p: ChangeProposal;
  isApprover: boolean;
  approverId?: string;
  onVote: (id: string, approverId: string, vote: 'yes' | 'no') => Promise<{ success: boolean; error?: string }>;
}) {
  const [voting, setVoting] = useState<'yes' | 'no' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const hasVoted = approverId ? p.approvals.includes(approverId) || p.rejections.includes(approverId) : false;

  const doVote = async (v: 'yes' | 'no') => {
    if (!approverId) return;
    setVoting(v);
    setErr(null);
    const res = await onVote(p.id, approverId, v);
    setVoting(null);
    if (!res.success) setErr(res.error || 'Vote failed');
  };

  return (
    <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-white">{p.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">
            {p.description}
          </p>
          <div className="text-xs text-gray-500 mt-2">
            Proposed by <span className="font-medium">{p.proposer_name}</span> ·{' '}
            {new Date(p.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs">
          <div className="text-green-600 dark:text-green-400 font-bold">
            ✅ {p.approvals.length}/3
          </div>
          <div className="text-red-500 font-bold">❌ {p.rejections.length}/3</div>
        </div>
      </div>

      {/* Approver avatars */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {APPROVER_IDS.map((id) => {
          const name = APPROVER_NAMES[id];
          const yes = p.approvals.includes(id);
          const no = p.rejections.includes(id);
          return (
            <span
              key={id}
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                yes
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-400'
                  : no
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
              }`}
            >
              {name} {yes ? '✓' : no ? '✗' : '·'}
            </span>
          );
        })}
      </div>

      {isApprover && !hasVoted && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => doVote('yes')}
            disabled={voting !== null}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg text-sm"
          >
            {voting === 'yes' ? '...' : '✅ Approve'}
          </button>
          <button
            onClick={() => doVote('no')}
            disabled={voting !== null}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg text-sm"
          >
            {voting === 'no' ? '...' : '❌ Reject'}
          </button>
        </div>
      )}
      {hasVoted && (
        <div className="mt-3 text-xs text-gray-500 italic">
          You already voted on this one.
        </div>
      )}
      {err && <div className="mt-2 text-xs text-red-500">{err}</div>}
    </div>
  );
}

function ApprovedProposalCard({
  p,
  isApprover,
  isLogan,
  approverId,
  poolBalance,
  hasActive,
  activeTitle,
  queuedCount,
  scheduledCount,
  maxScheduled,
  onSetCost,
  onSetTimer,
}: {
  p: ChangeProposal;
  isApprover: boolean;
  isLogan: boolean;
  approverId?: string;
  poolBalance: number;
  hasActive: boolean;
  activeTitle?: string;
  queuedCount: number;
  scheduledCount: number;
  maxScheduled: number;
  onSetCost: (id: string, approverId: string, cost: number, pct?: number | null) => Promise<{ success: boolean; error?: string }>;
  onSetTimer: (id: string, approverId: string, durationMs: number) => Promise<{ success: boolean; error?: string }>;
}) {
  const [costMode, setCostMode] = useState<'amount' | 'percent'>('amount');
  const [costInput, setCostInput] = useState('');
  const [percentInput, setPercentInput] = useState('');
  const [timerDays, setTimerDays] = useState('7');
  const [timerHours, setTimerHours] = useState('0');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const costSet = p.cost_amount !== null;

  const handleSetCost = async () => {
    if (!approverId) return;
    setErr(null);
    let amount: number;
    let pct: number | null = null;
    if (costMode === 'amount') {
      const parsed = parseShortMoney(costInput);
      if (parsed === null || !isFinite(parsed) || parsed <= 0) {
        setErr('Enter a valid amount (e.g. 1000000, 5M, 2.5B, 100T, 5Q)');
        return;
      }
      amount = parsed;
    } else {
      pct = parseFloat(percentInput);
      if (!isFinite(pct) || pct <= 0 || pct > 100) {
        setErr('Enter a percentage between 0 and 100');
        return;
      }
      amount = (poolBalance * pct) / 100;
    }
    if (amount > poolBalance) {
      setErr(`Not enough in the pool ($${formatMoney(poolBalance)} available)`);
      return;
    }
    setBusy(true);
    const res = await onSetCost(p.id, approverId, amount, pct);
    setBusy(false);
    if (!res.success) setErr(res.error || 'Failed');
  };

  const handleSetTimer = async () => {
    if (!approverId) return;
    setErr(null);
    const d = parseInt(timerDays, 10) || 0;
    const h = parseInt(timerHours, 10) || 0;
    const ms = (d * 24 + h) * 60 * 60 * 1000;
    if (ms <= 0) {
      setErr('Timer must be at least 1 hour');
      return;
    }
    setBusy(true);
    const res = await onSetTimer(p.id, approverId, ms);
    setBusy(false);
    if (!res.success) setErr(res.error || 'Failed');
  };

  return (
    <div className="border-2 border-green-400/50 rounded-xl p-4 bg-green-50 dark:bg-green-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-white">{p.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">
            {p.description}
          </p>
          <div className="text-xs text-gray-500 mt-2">
            Proposed by <span className="font-medium">{p.proposer_name}</span> · Approved by{' '}
            {p.approvals.map((id) => APPROVER_NAMES[id]).join(', ')}
          </div>
        </div>
        {costSet && (
          <div className="shrink-0 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-center">
            <div className="text-[10px] uppercase text-gray-500">Cost</div>
            <div className="font-bold text-gray-900 dark:text-white">
              ${formatMoney(p.cost_amount!)}
            </div>
          </div>
        )}
      </div>

      {/* Step 1: set cost (any approver) */}
      {!costSet && isApprover && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
            Step 1: Set the cost
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setCostMode('amount')}
              className={`px-3 py-1 rounded ${
                costMode === 'amount' ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              $ Amount
            </button>
            <button
              onClick={() => setCostMode('percent')}
              className={`px-3 py-1 rounded ${
                costMode === 'percent' ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              % of Pool
            </button>
          </div>
          {costMode === 'amount' ? (
            <div>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                placeholder="e.g. 5M, 2.5B, 100T, 5Q, 7Qi…"
                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2 text-sm"
              />
              {(() => {
                const parsed = parseShortMoney(costInput);
                if (!costInput.trim()) {
                  return (
                    <div className="text-[10px] text-gray-500 mt-1 leading-snug">
                      Suffixes: K, M, B, T, Q, Qi, Sx, Sp, Oc, No, Dc, Un, Dr, Tr — case-insensitive.
                    </div>
                  );
                }
                if (parsed === null || parsed <= 0) {
                  return (
                    <div className="text-[10px] text-red-500 mt-1">
                      Can't parse that. Try: 1000000, 5M, 2.5B, 100T, 5Q…
                    </div>
                  );
                }
                return (
                  <div className="text-xs text-gray-500 mt-1">
                    = ${formatMoney(parsed)}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div>
              <input
                type="number"
                value={percentInput}
                onChange={(e) => setPercentInput(e.target.value)}
                placeholder="e.g. 25"
                min={0}
                max={100}
                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2 text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">
                ≈ ${formatMoney(((parseFloat(percentInput) || 0) * poolBalance) / 100)}
              </div>
            </div>
          )}
          <button
            onClick={handleSetCost}
            disabled={busy}
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-black font-bold py-2 rounded text-sm"
          >
            💸 Set Cost &amp; Deduct from Pool
          </button>
        </div>
      )}

      {/* Step 2: Logan sets the timer */}
      {costSet && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
            Step 2: Logan sets the timer
          </div>
          {!isLogan ? (
            <div className="text-xs text-gray-500 italic">
              Waiting on Logan to start the timer...
            </div>
          ) : hasActive && scheduledCount >= maxScheduled ? (
            <div className="text-xs text-orange-600 dark:text-orange-400">
              Queue full ({maxScheduled} max — currently active: {activeTitle}). Wait for one to
              finish.
            </div>
          ) : (
            <>
              {hasActive && (
                <div className="text-[11px] text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-700 rounded px-2 py-1">
                  &ldquo;{activeTitle}&rdquo; is currently active. Setting a timer here will queue
                  this change as #{queuedCount + 2} of {maxScheduled} — it&apos;ll auto-activate
                  when the active one ends.
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Days</label>
                  <input
                    type="number"
                    value={timerDays}
                    onChange={(e) => setTimerDays(e.target.value)}
                    min={0}
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Hours</label>
                  <input
                    type="number"
                    value={timerHours}
                    onChange={(e) => setTimerHours(e.target.value)}
                    min={0}
                    max={23}
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleSetTimer}
                disabled={busy}
                className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-yellow-400 font-bold py-2 rounded text-sm"
              >
                {hasActive ? '➕ Add to Queue' : '⏱ Start Timer & Activate'}
              </button>
            </>
          )}
        </div>
      )}

      {err && <div className="mt-2 text-xs text-red-500">{err}</div>}
    </div>
  );
}

function HistoryCard({ p }: { p: ChangeProposal }) {
  const isRejected = p.status === 'rejected';
  return (
    <div
      className={`border-2 rounded-xl p-4 ${
        isRejected
          ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20'
          : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-white">{p.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">
            {p.description}
          </p>
          <div className="text-xs text-gray-500 mt-2">
            By {p.proposer_name} · {new Date(p.created_at).toLocaleDateString()}
          </div>
        </div>
        <span
          className={`text-xs font-bold uppercase px-2 py-1 rounded shrink-0 ${
            isRejected
              ? 'bg-red-500 text-white'
              : 'bg-gray-600 text-white'
          }`}
        >
          {isRejected ? '❌ Rejected' : '✓ Completed'}
        </span>
      </div>
    </div>
  );
}
