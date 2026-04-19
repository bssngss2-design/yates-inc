'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import {
  EMPLOYEE_SHOP_ITEMS,
  getShopItem,
  type ShopItem,
  type ShopEffectType,
} from '@/utils/employeeShopItems';

export interface ShopEffect {
  id: string;
  employee_id: string;
  effect_type: ShopEffectType;
  uses_remaining: number | null;
  expires_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ShopPurchase {
  id: string;
  employee_id: string;
  item_id: string;
  item_name: string;
  price: number;
  currency: 'yates' | 'walters';
  purchased_at: string;
}

interface BuyResult {
  success: boolean;
  error?: string;
}

interface EmployeeShopContextType {
  effects: ShopEffect[];
  purchases: ShopPurchase[];
  myEffects: ShopEffect[];                  // current user's active effects (filtered + non-expired)
  loading: boolean;

  hasEffect: (employeeId: string, effectType: ShopEffectType) => boolean;
  getEffect: (employeeId: string, effectType: ShopEffectType) => ShopEffect | null;
  hasActivePromotion: (employeeId: string) => boolean;
  isChairActive: (employeeId: string) => boolean;
  hasNasaPc: (employeeId: string) => boolean;
  hasActiveBomb: (employeeId: string) => boolean;
  motivationUsesRemaining: (employeeId: string) => number;

  buyItem: (item: ShopItem, employeeId: string, currentBalance: number, otherBalance: number) => Promise<BuyResult>;
  consumeMotivationUse: (employeeId: string) => Promise<BuyResult>;
  refresh: () => Promise<void>;
}

const EmployeeShopContext = createContext<EmployeeShopContextType | undefined>(undefined);

export function EmployeeShopProvider({ children }: { children: React.ReactNode }) {
  const { employee } = useAuth();
  const [effects, setEffects] = useState<ShopEffect[]>([]);
  const [purchases, setPurchases] = useState<ShopPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEffects = useCallback(async () => {
    const { data, error } = await supabase.from('employee_shop_effects').select('*');
    if (!error && data) {
      setEffects(
        data.map((e: any) => ({
          ...e,
          metadata: e.metadata || {},
        })),
      );
    }
  }, []);

  const fetchPurchases = useCallback(async () => {
    const { data, error } = await supabase
      .from('employee_shop_purchases')
      .select('*')
      .order('purchased_at', { ascending: false })
      .limit(200);
    if (!error && data) {
      setPurchases(
        data.map((p: any) => ({
          ...p,
          price: Number(p.price),
        })),
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchEffects(), fetchPurchases()]);
    setLoading(false);
  }, [fetchEffects, fetchPurchases]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime
  useEffect(() => {
    const ch1 = supabase
      .channel('shop-effects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_shop_effects' }, () => {
        fetchEffects();
      })
      .subscribe();
    const ch2 = supabase
      .channel('shop-purchases-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_shop_purchases' }, () => {
        fetchPurchases();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchEffects, fetchPurchases]);

  // ---------- Helpers ----------

  const isEffectLive = (e: ShopEffect): boolean => {
    if (e.expires_at && new Date(e.expires_at).getTime() < Date.now()) return false;
    if (e.uses_remaining !== null && e.uses_remaining !== undefined && e.uses_remaining <= 0) return false;
    return true;
  };

  const hasEffect = useCallback(
    (employeeId: string, effectType: ShopEffectType): boolean => {
      return effects.some(
        (e) => e.employee_id === employeeId && e.effect_type === effectType && isEffectLive(e),
      );
    },
    [effects],
  );

  const getEffect = useCallback(
    (employeeId: string, effectType: ShopEffectType): ShopEffect | null => {
      return effects.find(
        (e) => e.employee_id === employeeId && e.effect_type === effectType && isEffectLive(e),
      ) || null;
    },
    [effects],
  );

  const hasActivePromotion = useCallback(
    (employeeId: string) => hasEffect(employeeId, 'promotion_yellow_name'),
    [hasEffect],
  );
  const isChairActive = useCallback(
    (employeeId: string) => hasEffect(employeeId, 'chair_paycheck_boost'),
    [hasEffect],
  );
  const hasNasaPc = useCallback(
    (employeeId: string) => hasEffect(employeeId, 'nasa_pc_productivity'),
    [hasEffect],
  );
  const hasActiveBomb = useCallback(
    (employeeId: string) => hasEffect(employeeId, 'energy_bomb'),
    [hasEffect],
  );
  const motivationUsesRemaining = useCallback(
    (employeeId: string): number => {
      const e = getEffect(employeeId, 'motivation_pack');
      return e?.uses_remaining ?? 0;
    },
    [getEffect],
  );

  const myEffects = useMemo(
    () => (employee ? effects.filter((e) => e.employee_id === employee.id && isEffectLive(e)) : []),
    [effects, employee],
  );

  // ---------- Actions ----------

  const buyItem = useCallback<EmployeeShopContextType['buyItem']>(
    async (item, employeeId, currentBalance, _otherBalance) => {
      if (!employeeId) return { success: false, error: 'Not logged in' };
      if (currentBalance < item.price) return { success: false, error: 'Not enough cash' };

      // Enforce oneTime
      if (item.oneTime) {
        const existing = effects.find(
          (e) => e.employee_id === employeeId && e.effect_type === item.effectType && isEffectLive(e),
        );
        if (existing) return { success: false, error: 'You already own this' };
      }

      // 1) Deduct from paycheck balance
      const balanceCol = item.currency === 'yates' ? 'yates_balance' : 'walters_balance';
      const { data: pc, error: fetchErr } = await supabase
        .from('employee_paychecks')
        .select('*')
        .eq('employee_id', employeeId)
        .single();
      if (fetchErr || !pc) return { success: false, error: 'Couldn\'t read your paycheck' };

      const balVal = Number(pc[balanceCol]);
      if (balVal < item.price) return { success: false, error: 'Not enough cash' };

      const { error: updErr } = await supabase
        .from('employee_paychecks')
        .update({
          [balanceCol]: balVal - item.price,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employeeId);
      if (updErr) return { success: false, error: updErr.message };

      // 2) Record purchase
      await supabase.from('employee_shop_purchases').insert({
        employee_id: employeeId,
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        currency: item.currency,
      });

      // 3) Apply / extend effect
      const existing = effects.find(
        (e) => e.employee_id === employeeId && e.effect_type === item.effectType,
      );

      if (item.durationMs) {
        // Time-based (energy bomb): new expiry = max(now, existing) + duration
        const baseTs = existing?.expires_at
          ? Math.max(new Date(existing.expires_at).getTime(), Date.now())
          : Date.now();
        const expiresAt = new Date(baseTs + item.durationMs).toISOString();
        if (existing) {
          await supabase
            .from('employee_shop_effects')
            .update({ expires_at: expiresAt, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase.from('employee_shop_effects').insert({
            employee_id: employeeId,
            effect_type: item.effectType,
            expires_at: expiresAt,
          });
        }
      } else if (item.usesPerPurchase) {
        // Consumable (motivation pack)
        if (existing) {
          await supabase
            .from('employee_shop_effects')
            .update({
              uses_remaining: (existing.uses_remaining ?? 0) + item.usesPerPurchase,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('employee_shop_effects').insert({
            employee_id: employeeId,
            effect_type: item.effectType,
            uses_remaining: item.usesPerPurchase,
          });
        }
      } else {
        // Permanent flag
        if (!existing) {
          await supabase.from('employee_shop_effects').insert({
            employee_id: employeeId,
            effect_type: item.effectType,
          });
        }
      }

      await refresh();
      return { success: true };
    },
    [effects, refresh],
  );

  const consumeMotivationUse = useCallback<EmployeeShopContextType['consumeMotivationUse']>(
    async (employeeId) => {
      const existing = effects.find(
        (e) => e.employee_id === employeeId && e.effect_type === 'motivation_pack' && isEffectLive(e),
      );
      if (!existing || !existing.uses_remaining || existing.uses_remaining <= 0) {
        return { success: false, error: 'No motivation pack uses left' };
      }
      const { error } = await supabase
        .from('employee_shop_effects')
        .update({
          uses_remaining: existing.uses_remaining - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) return { success: false, error: error.message };
      await fetchEffects();
      return { success: true };
    },
    [effects, fetchEffects],
  );

  return (
    <EmployeeShopContext.Provider
      value={{
        effects,
        purchases,
        myEffects,
        loading,
        hasEffect,
        getEffect,
        hasActivePromotion,
        isChairActive,
        hasNasaPc,
        hasActiveBomb,
        motivationUsesRemaining,
        buyItem,
        consumeMotivationUse,
        refresh,
      }}
    >
      {children}
    </EmployeeShopContext.Provider>
  );
}

export function useEmployeeShop() {
  const ctx = useContext(EmployeeShopContext);
  if (!ctx) throw new Error('useEmployeeShop must be used within an EmployeeShopProvider');
  return ctx;
}

// Re-export items so consumers don't need two imports
export { EMPLOYEE_SHOP_ITEMS, getShopItem };
export type { ShopItem, ShopEffectType };
