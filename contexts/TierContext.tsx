'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Employees who keep both a role AND a tier. Everyone else shows tier only.
export const SPECIAL_EMPLOYEE_IDS: string[] = [
  '000001', // Logan (CEO)
  '123456', // Bernardo (CTO/CFO)
  '319736', // Wyatt (LW)
];

export function xpToNextTier(tier: number): number {
  if (tier >= 100) return 0;
  return 100 + tier * 50;
}

export interface EmployeeTier {
  id: string;
  employee_id: string;
  current_tier: number;
  current_xp: number;
  total_xp_earned: number;
  updated_at: string;
  created_at: string;
}

export interface XpSource {
  source: string;
  description?: string;
}

interface AwardResult {
  success: boolean;
  error?: string;
  tier?: number;
  xp?: number;
  xpToNext?: number;
  tieredUp?: boolean;
}

interface TierContextType {
  tiers: Record<string, EmployeeTier>;
  loading: boolean;
  getTier: (employeeId: string) => EmployeeTier | null;
  awardXp: (employeeId: string, amount: number, source: string, description?: string) => Promise<AwardResult>;
  instantTierUp: (employeeId: string, source?: string) => Promise<AwardResult>;
  refresh: () => Promise<void>;
}

const TierContext = createContext<TierContextType | undefined>(undefined);

export function TierProvider({ children }: { children: React.ReactNode }) {
  const [tiers, setTiers] = useState<Record<string, EmployeeTier>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase.from('employee_tiers').select('*');
    if (error) {
      console.error('[TierContext] fetchAll:', error);
      return;
    }
    const next: Record<string, EmployeeTier> = {};
    (data || []).forEach((row) => {
      next[(row as EmployeeTier).employee_id] = row as EmployeeTier;
    });
    setTiers(next);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel('employee-tiers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_tiers' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  const getTier = useCallback(
    (employeeId: string) => tiers[employeeId] ?? null,
    [tiers],
  );

  const awardXp = useCallback<TierContextType['awardXp']>(
    async (employeeId, amount, source, description) => {
      if (!employeeId || !Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'Invalid grant' };
      }
      const { data, error } = await supabase.rpc('award_xp', {
        p_employee_id: employeeId,
        p_amount: Math.floor(amount),
        p_source: source,
        p_description: description ?? null,
      });
      if (error) {
        console.error('[TierContext] awardXp failed:', error);
        return { success: false, error: error.message };
      }
      await fetchAll();
      const payload = (data ?? {}) as Record<string, unknown>;
      return {
        success: true,
        tier: Number(payload.tier ?? 0),
        xp: Number(payload.xp ?? 0),
        xpToNext: Number(payload.xp_to_next ?? 0),
        tieredUp: Boolean(payload.tiered_up),
      };
    },
    [fetchAll],
  );

  const instantTierUp = useCallback<TierContextType['instantTierUp']>(
    async (employeeId, source = 'instant_tier_up') => {
      if (!employeeId) return { success: false, error: 'Missing employee id' };
      const { data, error } = await supabase.rpc('instant_tier_up', {
        p_employee_id: employeeId,
        p_source: source,
      });
      if (error) {
        console.error('[TierContext] instantTierUp failed:', error);
        return { success: false, error: error.message };
      }
      await fetchAll();
      const payload = (data ?? {}) as Record<string, unknown>;
      return {
        success: true,
        tier: Number(payload.tier ?? 0),
        tieredUp: true,
      };
    },
    [fetchAll],
  );

  return (
    <TierContext.Provider value={{ tiers, loading, getTier, awardXp, instantTierUp, refresh }}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error('useTier must be used within a TierProvider');
  return ctx;
}

// XP amounts per action. Keep them centralized so tuning is easy.
export const XP_VALUES = {
  TAX_VOTE: 50,
  BUDGET_CONTRIBUTION: 30, // per deposit >= threshold
  GAME_SESSION_TICK: 10, // per interval
} as const;

export const XP_SOURCES = {
  TAX_APPROVE: 'tax_approve',
  TAX_REJECT: 'tax_reject',
  BUDGET_CONTRIBUTION: 'budget_contribution',
  GAME_SESSION: 'game_session',
  EOTM_TIER_UP: 'eotm_tier_up',
  MANUAL_GRANT: 'manual_grant',
} as const;
