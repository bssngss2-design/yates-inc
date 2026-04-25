'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// The 5 approvers: Logan, Bernardo, Harris, Wyatt, Suhas
export const APPROVER_IDS = ['000001', '123456', '674121', '319736', '010101'] as const;
export const LOGAN_ID = '000001';
export const APPROVER_NAMES: Record<string, string> = {
  '000001': 'Logan',
  '123456': 'Bernardo',
  '674121': 'Harris',
  '319736': 'Wyatt',
  '010101': 'Suhas',
  // Legacy: Yates (000000) was previously an approver — kept here so old vote
  // history still renders a name instead of "undefined".
  '000000': 'Yates',
};

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'queued';

// Logan can have at most this many proposals scheduled at once
// (1 active + N-1 queued, or N queued if nothing is active).
export const MAX_SCHEDULED_PROPOSALS = 3;

export interface ChangeProposal {
  id: string;
  proposer_id: string;
  proposer_name: string;
  proposer_type: 'employee' | 'client';
  title: string;
  description: string;
  status: ProposalStatus;
  cost_amount: number | null;
  cost_percentage: number | null;
  approvals: string[];
  rejections: string[];
  cost_set_by: string | null;
  cost_set_at: string | null;
  timer_set_by: string | null;
  timer_start: string | null;
  timer_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxPool {
  id: string;
  balance: number;
  total_collected: number;
  total_spent: number;
  updated_at: string;
}

interface TaxVoteContextType {
  pool: TaxPool | null;
  proposals: ChangeProposal[];
  activeProposal: ChangeProposal | null;
  loading: boolean;

  addToPool: (amount: number, source: 'wealth_tax' | 'paycheck_tax', description?: string) => Promise<void>;
  submitProposal: (args: {
    proposer_id: string;
    proposer_name: string;
    proposer_type: 'employee' | 'client';
    title: string;
    description: string;
  }) => Promise<{ success: boolean; error?: string }>;
  voteOnProposal: (proposalId: string, approverId: string, vote: 'yes' | 'no') => Promise<{ success: boolean; error?: string }>;
  setProposalCost: (proposalId: string, approverId: string, costAmount: number, costPercentage?: number | null) => Promise<{ success: boolean; error?: string }>;
  setProposalTimer: (proposalId: string, approverId: string, durationMs: number) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const TaxVoteContext = createContext<TaxVoteContextType | undefined>(undefined);

export function TaxVoteProvider({ children }: { children: React.ReactNode }) {
  const [pool, setPool] = useState<TaxPool | null>(null);
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const completionCheckRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPool = useCallback(async () => {
    const { data, error } = await supabase.from('tax_pool').select('*').limit(1).single();
    if (!error && data) {
      setPool({
        id: data.id,
        balance: Number(data.balance),
        total_collected: Number(data.total_collected),
        total_spent: Number(data.total_spent),
        updated_at: data.updated_at,
      });
    }
  }, []);

  const fetchProposals = useCallback(async () => {
    const { data, error } = await supabase
      .from('change_proposals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setProposals(
        data.map((p: any) => ({
          ...p,
          cost_amount: p.cost_amount === null ? null : Number(p.cost_amount),
          cost_percentage: p.cost_percentage === null ? null : Number(p.cost_percentage),
          approvals: Array.isArray(p.approvals) ? p.approvals : [],
          rejections: Array.isArray(p.rejections) ? p.rejections : [],
        })),
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPool(), fetchProposals()]);
    setLoading(false);
  }, [fetchPool, fetchProposals]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subs
  useEffect(() => {
    const poolChannel = supabase
      .channel('tax-pool-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tax_pool' }, () => {
        fetchPool();
      })
      .subscribe();

    const proposalChannel = supabase
      .channel('change-proposals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'change_proposals' }, () => {
        fetchProposals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(poolChannel);
      supabase.removeChannel(proposalChannel);
    };
  }, [fetchPool, fetchProposals]);

  // Auto-mark active proposals as completed when timer expires (every 5s while any active)
  useEffect(() => {
    const active = proposals.find((p) => p.status === 'active' && p.timer_end);
    if (!active) {
      if (completionCheckRef.current) clearInterval(completionCheckRef.current);
      return;
    }

    const tick = async () => {
      if (!active.timer_end) return;
      const end = new Date(active.timer_end).getTime();
      if (Date.now() >= end) {
        await supabase
          .from('change_proposals')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', active.id)
          .eq('status', 'active');
      }
    };

    tick();
    completionCheckRef.current = setInterval(tick, 5000);
    return () => {
      if (completionCheckRef.current) clearInterval(completionCheckRef.current);
    };
  }, [proposals]);

  const activeProposal = proposals.find((p) => p.status === 'active') || null;

  // ---------- Actions ----------

  const addToPool: TaxVoteContextType['addToPool'] = useCallback(async (amount, source, description) => {
    if (!isFinite(amount) || amount <= 0) return;
    // Cap at a sane JS-safe number before sending (numbers larger than ~1e38 still fine for NUMERIC,
    // but we never want NaN/Infinity hitting the DB)
    const safeAmount = Math.min(amount, 1e38);
    try {
      const { error } = await supabase.rpc('add_to_tax_pool', {
        p_amount: safeAmount,
        p_source: source,
        p_description: description || null,
      });
      if (error) console.error('[TaxVote] addToPool error:', error);
    } catch (err) {
      console.error('[TaxVote] addToPool exception:', err);
    }
  }, []);

  const submitProposal: TaxVoteContextType['submitProposal'] = useCallback(
    async ({ proposer_id, proposer_name, proposer_type, title, description }) => {
      if (!title.trim() || !description.trim()) {
        return { success: false, error: 'Title and description required' };
      }
      const { error } = await supabase.from('change_proposals').insert({
        proposer_id,
        proposer_name,
        proposer_type,
        title: title.trim(),
        description: description.trim(),
      });
      if (error) return { success: false, error: error.message };
      await fetchProposals();
      return { success: true };
    },
    [fetchProposals],
  );

  const voteOnProposal: TaxVoteContextType['voteOnProposal'] = useCallback(
    async (proposalId, approverId, vote) => {
      if (!APPROVER_IDS.includes(approverId as any)) {
        return { success: false, error: 'Not an approver' };
      }
      const proposal = proposals.find((p) => p.id === proposalId);
      if (!proposal) return { success: false, error: 'Proposal not found' };
      if (proposal.status !== 'pending') {
        return { success: false, error: 'Proposal no longer pending' };
      }
      if (proposal.approvals.includes(approverId) || proposal.rejections.includes(approverId)) {
        return { success: false, error: 'Already voted' };
      }

      const approvals = [...proposal.approvals];
      const rejections = [...proposal.rejections];
      if (vote === 'yes') approvals.push(approverId);
      else rejections.push(approverId);

      let newStatus: ProposalStatus = 'pending';
      if (approvals.length >= 3) newStatus = 'approved';
      else if (rejections.length >= 3) newStatus = 'rejected';

      const { error } = await supabase
        .from('change_proposals')
        .update({
          approvals,
          rejections,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      if (error) return { success: false, error: error.message };
      await fetchProposals();
      // Award XP for participating in the vote (fire-and-forget)
      try {
        await supabase.rpc('award_xp', {
          p_employee_id: approverId,
          p_amount: 50,
          p_source: vote === 'yes' ? 'tax_approve' : 'tax_reject',
          p_description: `Voted ${vote} on proposal`,
        });
      } catch (e) {
        console.warn('[TaxVote] XP grant failed (non-fatal):', e);
      }
      return { success: true };
    },
    [proposals, fetchProposals],
  );

  const setProposalCost: TaxVoteContextType['setProposalCost'] = useCallback(
    async (proposalId, approverId, costAmount, costPercentage) => {
      if (!APPROVER_IDS.includes(approverId as any)) {
        return { success: false, error: 'Not an approver' };
      }
      if (!isFinite(costAmount) || costAmount <= 0) {
        return { success: false, error: 'Invalid cost' };
      }
      const proposal = proposals.find((p) => p.id === proposalId);
      if (!proposal) return { success: false, error: 'Proposal not found' };
      if (proposal.status !== 'approved') {
        return { success: false, error: 'Proposal must be approved before setting cost' };
      }

      // Spend from pool atomically
      const { data, error } = await supabase.rpc('spend_from_tax_pool', {
        p_amount: costAmount,
        p_proposal_id: proposalId,
        p_description: `Cost set for: ${proposal.title}`,
      });
      if (error) return { success: false, error: error.message };
      if (data === null) return { success: false, error: 'Insufficient tax pool funds' };

      const { error: updateErr } = await supabase
        .from('change_proposals')
        .update({
          cost_amount: costAmount,
          cost_percentage: costPercentage ?? null,
          cost_set_by: approverId,
          cost_set_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);
      if (updateErr) return { success: false, error: updateErr.message };

      await Promise.all([fetchPool(), fetchProposals()]);
      return { success: true };
    },
    [proposals, fetchPool, fetchProposals],
  );

  const setProposalTimer: TaxVoteContextType['setProposalTimer'] = useCallback(
    async (proposalId, approverId, durationMs) => {
      if (approverId !== LOGAN_ID) {
        return { success: false, error: 'Only Logan can set the timer' };
      }
      if (!isFinite(durationMs) || durationMs <= 0) {
        return { success: false, error: 'Invalid timer duration' };
      }
      const proposal = proposals.find((p) => p.id === proposalId);
      if (!proposal) return { success: false, error: 'Proposal not found' };
      if (proposal.status !== 'approved' || proposal.cost_amount === null) {
        return { success: false, error: 'Set cost first' };
      }

      const alreadyActive = proposals.find((p) => p.status === 'active');
      const queuedCount = proposals.filter((p) => p.status === 'queued').length;
      const scheduledCount = (alreadyActive ? 1 : 0) + queuedCount;

      const now = new Date();

      // No active proposal -> activate immediately (and any existing queue
      // already has its head spot reserved for the trigger to promote).
      if (!alreadyActive) {
        const end = new Date(now.getTime() + durationMs);
        const { error } = await supabase
          .from('change_proposals')
          .update({
            status: 'active',
            timer_set_by: approverId,
            timer_start: now.toISOString(),
            timer_end: end.toISOString(),
            queued_duration_ms: null,
            queued_at: null,
            updated_at: now.toISOString(),
          })
          .eq('id', proposalId);

        if (error) return { success: false, error: error.message };
        await fetchProposals();
        return { success: true };
      }

      // Something is active -> queue this one (backend only, no UI).
      if (scheduledCount >= MAX_SCHEDULED_PROPOSALS) {
        return {
          success: false,
          error: `Queue full (${MAX_SCHEDULED_PROPOSALS} max). Wait for one to finish.`,
        };
      }

      const { error } = await supabase
        .from('change_proposals')
        .update({
          status: 'queued',
          timer_set_by: approverId,
          queued_duration_ms: Math.round(durationMs),
          queued_at: now.toISOString(),
          timer_start: null,
          timer_end: null,
          updated_at: now.toISOString(),
        })
        .eq('id', proposalId);

      if (error) return { success: false, error: error.message };
      await fetchProposals();
      return { success: true };
    },
    [proposals, fetchProposals],
  );

  return (
    <TaxVoteContext.Provider
      value={{
        pool,
        proposals,
        activeProposal,
        loading,
        addToPool,
        submitProposal,
        voteOnProposal,
        setProposalCost,
        setProposalTimer,
        refresh,
      }}
    >
      {children}
    </TaxVoteContext.Provider>
  );
}

export function useTaxVote() {
  const ctx = useContext(TaxVoteContext);
  if (!ctx) throw new Error('useTaxVote must be used within a TaxVoteProvider');
  return ctx;
}
