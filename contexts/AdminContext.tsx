'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface HiredEmployee {
  id: string;
  employee_id: string;
  name: string;
  role: string;
  bio: string | null;
  hired_by: string;
  hired_at: string;
}

export interface FiredEmployee {
  id: string;
  employee_id: string;
  employee_name: string;
  reason: string | null;
  fired_by: string;
  fired_at: string;
}

export interface EmployeeOfTheMonth {
  id: string;
  employee_id: string;
  employee_name: string;
  set_date: string;
  set_by: string;
  created_at: string;
}

interface AdminContextType {
  hired: HiredEmployee[];
  fired: FiredEmployee[];
  eotm: EmployeeOfTheMonth | null;
  loading: boolean;

  isFired: (employeeId: string) => boolean;

  setEmployeeOfTheMonth: (employeeId: string, employeeName: string, setBy: string) => Promise<{ success: boolean; error?: string }>;
  hireEmployee: (params: { employeeId: string; name: string; role: string; bio: string; hiredBy: string }) => Promise<{ success: boolean; error?: string }>;
  fireEmployee: (params: { employeeId: string; employeeName: string; reason: string; firedBy: string }) => Promise<{ success: boolean; error?: string }>;
  unfireEmployee: (employeeId: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [hired, setHired] = useState<HiredEmployee[]>([]);
  const [fired, setFired] = useState<FiredEmployee[]>([]);
  const [eotm, setEotm] = useState<EmployeeOfTheMonth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHired = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_hired_employees')
      .select('*')
      .order('hired_at', { ascending: false });
    if (!error && data) setHired(data as HiredEmployee[]);
  }, []);

  const fetchFired = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_fired_employees')
      .select('*')
      .order('fired_at', { ascending: false });
    if (!error && data) setFired(data as FiredEmployee[]);
  }, []);

  const fetchEotm = useCallback(async () => {
    const { data, error } = await supabase
      .from('employee_of_the_month')
      .select('*')
      .order('set_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error) setEotm((data as EmployeeOfTheMonth | null) ?? null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchHired(), fetchFired(), fetchEotm()]);
    setLoading(false);
  }, [fetchHired, fetchFired, fetchEotm]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel('admin-bar-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_hired_employees' }, fetchHired)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_fired_employees' }, fetchFired)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_of_the_month' }, fetchEotm)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchHired, fetchFired, fetchEotm]);

  const isFired = useCallback(
    (employeeId: string) => fired.some((f) => f.employee_id === employeeId),
    [fired],
  );

  const setEmployeeOfTheMonth = useCallback<AdminContextType['setEmployeeOfTheMonth']>(
    async (employeeId, employeeName, setBy) => {
      const { data, error } = await supabase
        .from('employee_of_the_month')
        .insert({
          employee_id: employeeId,
          employee_name: employeeName,
          set_by: setBy,
        })
        .select()
        .single();
      if (error) {
        console.error('[AdminContext] setEmployeeOfTheMonth failed:', error);
        return { success: false, error: error.message };
      }
      // Optimistic update + realtime fetch
      if (data) setEotm(data as EmployeeOfTheMonth);
      await fetchEotm();
      // Instant tier-up for the new EOTM (non-fatal)
      try {
        await supabase.rpc('instant_tier_up', {
          p_employee_id: employeeId,
          p_source: 'eotm_tier_up',
        });
      } catch (e) {
        console.warn('[AdminContext] EOTM instant tier-up failed (non-fatal):', e);
      }
      return { success: true };
    },
    [fetchEotm],
  );

  const hireEmployee = useCallback<AdminContextType['hireEmployee']>(
    async ({ employeeId, name, role, bio, hiredBy }) => {
      if (!employeeId || !name || !role) {
        return { success: false, error: 'ID, name, and role are required' };
      }
      const { error } = await supabase.from('admin_hired_employees').insert({
        employee_id: employeeId,
        name,
        role,
        bio: bio || null,
        hired_by: hiredBy,
      });
      if (error) return { success: false, error: error.message };
      // If they were previously fired, un-fire them silently so the hire sticks.
      await supabase.from('admin_fired_employees').delete().eq('employee_id', employeeId);
      await Promise.all([fetchHired(), fetchFired()]);
      return { success: true };
    },
    [fetchHired, fetchFired],
  );

  const fireEmployee = useCallback<AdminContextType['fireEmployee']>(
    async ({ employeeId, employeeName, reason, firedBy }) => {
      if (!employeeId) return { success: false, error: 'Missing employee id' };
      const { error } = await supabase.from('admin_fired_employees').insert({
        employee_id: employeeId,
        employee_name: employeeName,
        reason: reason || null,
        fired_by: firedBy,
      });
      if (error) return { success: false, error: error.message };
      await fetchFired();
      return { success: true };
    },
    [fetchFired],
  );

  const unfireEmployee = useCallback<AdminContextType['unfireEmployee']>(
    async (employeeId) => {
      const { error } = await supabase
        .from('admin_fired_employees')
        .delete()
        .eq('employee_id', employeeId);
      if (error) return { success: false, error: error.message };
      await fetchFired();
      return { success: true };
    },
    [fetchFired],
  );

  return (
    <AdminContext.Provider
      value={{
        hired,
        fired,
        eotm,
        loading,
        isFired,
        setEmployeeOfTheMonth,
        hireEmployee,
        fireEmployee,
        unfireEmployee,
        refresh,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within an AdminProvider');
  return ctx;
}
