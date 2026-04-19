'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EmployeePaycheck, PaycheckContextType } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { calculateFinalAmount, getTaxBreakdown, calculateTax } from '@/utils/taxes';

// Small portion of collected paycheck tax that feeds the Tax Pool (Vote for Change)
const PAYCHECK_TAX_TO_POOL_PCT = 0.25;

async function fundTaxPoolFromPaycheckTax(salaryAmount: number, employeeId: string): Promise<void> {
  try {
    const taxTotal = calculateTax(salaryAmount, 'paycheck');
    const toPool = taxTotal * PAYCHECK_TAX_TO_POOL_PCT;
    if (!isFinite(toPool) || toPool <= 0) return;
    await supabase.rpc('add_to_tax_pool', {
      p_amount: toPool,
      p_source: 'paycheck_tax',
      p_description: `Paycheck tax cut from ${employeeId}`,
    });
  } catch (err) {
    console.error('[TaxVote] failed to route paycheck tax to pool:', err);
  }
}

// Helper to drain from company budget when paycheck is processed
async function drainBudgetForPaycheck(amount: number, employeeId: string): Promise<void> {
  try {
    // Get current budget
    const { data: budgetData, error: fetchError } = await supabase
      .from('company_budget')
      .select('*')
      .limit(1)
      .single();

    if (fetchError) {
      console.error('Error fetching budget for paycheck drain:', fetchError);
      return;
    }

    if (budgetData) {
      // Update active budget
      const { error: updateError } = await supabase
        .from('company_budget')
        .update({
          active_budget: parseFloat(budgetData.active_budget) - amount,
          last_updated: new Date().toISOString(),
        })
        .eq('id', budgetData.id);

      if (updateError) {
        console.error('Error updating budget for paycheck:', updateError);
        return;
      }

      // Record transaction
      await supabase.from('budget_transactions').insert({
        amount: -amount,
        transaction_type: 'paycheck',
        description: `Paycheck for employee #${employeeId}`,
        affects: 'active_budget',
        created_by: 'system',
      });

      console.log(`💸 Budget drained by $${amount} for employee #${employeeId}'s paycheck`);
    }
  } catch (err) {
    console.error('Error draining budget for paycheck:', err);
  }
}

const PaycheckContext = createContext<PaycheckContextType | undefined>(undefined);

export function PaycheckProvider({ children }: { children: React.ReactNode }) {
  const [paychecks, setPaychecks] = useState<EmployeePaycheck[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();

  // Fetch all paychecks from Supabase
  const fetchPaychecks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employee_paychecks')
        .select('*');

      if (error) {
        console.error('Error fetching paychecks:', error);
        return;
      }

      if (data) {
        setPaychecks(data as EmployeePaycheck[]);
      }
    } catch (err) {
      console.error('Error fetching paychecks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get current user's paycheck
  const currentUserPaycheck = employee
    ? paychecks.find((p) => p.employee_id === employee.id) || null
    : null;

  // Update salary for an employee (CEO only) - max $1B
  const MAX_SALARY = 1000000000; // $1B cap
  
  const updateSalary = async (
    employeeId: string,
    amount: number,
    currency: 'yates' | 'walters'
  ) => {
    // Cap salary at $1B
    const cappedAmount = Math.min(amount, MAX_SALARY);
    
    try {
      const { error } = await supabase
        .from('employee_paychecks')
        .update({
          salary_amount: cappedAmount,
          salary_currency: currency,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employeeId);

      if (error) {
        console.error('Error updating salary:', error);
        return;
      }

      // Refresh paychecks
      await fetchPaychecks();
    } catch (err) {
      console.error('Error updating salary:', err);
    }
  };

  // Update pay interval for an employee (CEO only)
  const updatePayInterval = async (employeeId: string, interval: number) => {
    try {
      const { error } = await supabase
        .from('employee_paychecks')
        .update({
          pay_interval: interval,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employeeId);

      if (error) {
        console.error('Error updating pay interval:', error);
        return;
      }

      // Refresh paychecks
      await fetchPaychecks();
    } catch (err) {
      console.error('Error updating pay interval:', err);
    }
  };

  // Process paycheck - add salary to balance (after tax deduction)
  const processPaycheck = async (employeeId: string) => {
    const paycheck = paychecks.find((p) => p.employee_id === employeeId);
    if (!paycheck) return;

    // Calculate net salary after tax deduction
    const netSalary = calculateFinalAmount(paycheck.salary_amount, 'paycheck');

    const newBalance =
      paycheck.salary_currency === 'yates'
        ? { yates_balance: paycheck.yates_balance + netSalary }
        : { walters_balance: paycheck.walters_balance + netSalary };

    try {
      const { error } = await supabase
        .from('employee_paychecks')
        .update({
          ...newBalance,
          days_until_paycheck: paycheck.pay_interval,
          last_paycheck_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employeeId);

      if (error) {
        console.error('Error processing paycheck:', error);
        return;
      }

      // Drain from company budget (full salary amount)
      await drainBudgetForPaycheck(paycheck.salary_amount, paycheck.employee_id);

      // Route a small % of paycheck tax into the Vote-for-Change pool
      await fundTaxPoolFromPaycheckTax(paycheck.salary_amount, paycheck.employee_id);

      await fetchPaychecks();
    } catch (err) {
      console.error('Error processing paycheck:', err);
    }
  };

  // Check and process automatic paychecks
  const checkAndProcessPaychecks = useCallback(async () => {
    for (const paycheck of paychecks) {
      if (paycheck.days_until_paycheck <= 0 && paycheck.salary_amount > 0) {
        // Time to pay! Calculate net salary after tax deduction
        const taxRate = 0.15; // 15% tax
        const taxes = paycheck.salary_amount * taxRate;
        const netSalary = paycheck.salary_amount - taxes;
        
        const newBalance =
          paycheck.salary_currency === 'yates'
            ? { yates_balance: paycheck.yates_balance + netSalary }
            : { walters_balance: paycheck.walters_balance + netSalary };

        try {
          await supabase
            .from('employee_paychecks')
            .update({
              ...newBalance,
              days_until_paycheck: paycheck.pay_interval,
              last_paycheck_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('employee_id', paycheck.employee_id);

          // Drain from company budget (full salary amount)
          await drainBudgetForPaycheck(paycheck.salary_amount, paycheck.employee_id);

          // Route a small % of paycheck tax into the Vote-for-Change pool
          await fundTaxPoolFromPaycheckTax(paycheck.salary_amount, paycheck.employee_id);

          // Save pending notification for the popup
          const pendingData = {
            amount: paycheck.salary_amount,
            currency: paycheck.salary_currency,
            taxes: taxes,
            total: netSalary,
          };
          localStorage.setItem(
            `yates-paycheck-pending-${paycheck.employee_id}`,
            JSON.stringify(pendingData)
          );
        } catch (err) {
          console.error('Error auto-processing paycheck:', err);
        }
      }
    }
    // Refresh after processing
    await fetchPaychecks();
  }, [paychecks, fetchPaychecks]);

  // Decrement days (call this once per day in real app, but we'll simulate)
  const decrementDays = useCallback(async () => {
    // Check last decrement time from localStorage
    const lastDecrement = localStorage.getItem('yates-last-paycheck-decrement');
    const now = new Date();
    const today = now.toDateString();

    if (lastDecrement === today) {
      // Already decremented today
      return;
    }

    // Decrement all days_until_paycheck by 1
    for (const paycheck of paychecks) {
      if (paycheck.days_until_paycheck > 0) {
        try {
          await supabase
            .from('employee_paychecks')
            .update({
              days_until_paycheck: paycheck.days_until_paycheck - 1,
              updated_at: new Date().toISOString(),
            })
            .eq('employee_id', paycheck.employee_id);
        } catch (err) {
          console.error('Error decrementing days:', err);
        }
      }
    }

    localStorage.setItem('yates-last-paycheck-decrement', today);
    await fetchPaychecks();
  }, [paychecks, fetchPaychecks]);

  // Initial fetch
  useEffect(() => {
    fetchPaychecks();
  }, [fetchPaychecks]);

  // Check for auto-paychecks when paychecks change
  useEffect(() => {
    if (paychecks.length > 0) {
      // Check if any paychecks need processing
      const needsProcessing = paychecks.some(
        (p) => p.days_until_paycheck <= 0 && p.salary_amount > 0
      );
      if (needsProcessing) {
        checkAndProcessPaychecks();
      }
    }
  }, [paychecks, checkAndProcessPaychecks]);

  // Decrement days on app load (once per real day)
  useEffect(() => {
    if (paychecks.length > 0) {
      decrementDays();
    }
  }, [paychecks.length, decrementDays]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('paycheck-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_paychecks' },
        () => {
          fetchPaychecks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPaychecks]);

  // Get tax breakdown for a salary amount
  const getPaycheckTaxInfo = (salaryAmount: number) => {
    return getTaxBreakdown(salaryAmount, 'paycheck');
  };

  return (
    <PaycheckContext.Provider
      value={{
        paychecks,
        currentUserPaycheck,
        loading,
        fetchPaychecks,
        updateSalary,
        updatePayInterval,
        processPaycheck,
        getPaycheckTaxInfo,
      }}
    >
      {children}
    </PaycheckContext.Provider>
  );
}

export function usePaycheck() {
  const context = useContext(PaycheckContext);
  if (context === undefined) {
    throw new Error('usePaycheck must be used within a PaycheckProvider');
  }
  return context;
}
