'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// Budget fluctuation settings (slower than stocks)
const FLUCTUATION_INTERVAL = 30 * 1000; // Every 30 seconds
const MAX_FLUCTUATION_PERCENT = 0.001; // Max 0.1% change per tick
const HISTORY_POINTS = 100;

interface BudgetPricePoint {
  timestamp: number;
  totalFunds: number;
  activeBudget: number;
}

interface BudgetState {
  totalFunds: number;
  activeBudget: number;
  priceHistory: BudgetPricePoint[];
  lastUpdated: number;
}

interface BudgetTransaction {
  id: string;
  amount: number;
  transaction_type: 'product_sale' | 'prestige' | 'paycheck' | 'manual_add' | 'manual_subtract';
  description: string;
  affects: 'total_funds' | 'active_budget' | 'both';
  created_by: string;
  created_at: string;
}

interface BudgetContextType {
  budget: BudgetState;
  transactions: BudgetTransaction[];
  loading: boolean;
  canEdit: boolean;
  addToTotalFunds: (amount: number, description: string, type: BudgetTransaction['transaction_type']) => Promise<void>;
  addToActiveBudget: (amount: number, description: string, type: BudgetTransaction['transaction_type']) => Promise<void>;
  subtractFromActiveBudget: (amount: number, description: string, type: BudgetTransaction['transaction_type']) => Promise<void>;
  manualAdjust: (totalChange: number, activeChange: number, description: string) => Promise<void>;
  fetchBudget: () => Promise<void>;
}

// Who can edit the budget (Yates only - the true owner)
const EDIT_ALLOWED_IDS = ['000000']; // Only Yates

const STORAGE_KEY = 'yates-company-budget';

const defaultBudgetState: BudgetState = {
  totalFunds: 700532000,
  activeBudget: 100000000,
  priceHistory: [],
  lastUpdated: 0,
};

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// Generate fluctuating value with slight upward bias
function fluctuate(value: number): number {
  const changePercent = (Math.random() * MAX_FLUCTUATION_PERCENT * 2) - MAX_FLUCTUATION_PERCENT;
  // 60% chance of positive change (slight upward bias)
  const biasedChange = Math.random() > 0.4 ? Math.abs(changePercent) : changePercent;
  return Math.round(value * (1 + biasedChange));
}

// Generate initial history with gradual growth toward current values
function generateInitialHistory(totalFunds: number, activeBudget: number): BudgetPricePoint[] {
  const history: BudgetPricePoint[] = [];
  const now = Date.now();
  
  // Start from slightly lower values and grow toward current
  let tf = totalFunds * 0.98; // Start 2% lower
  let ab = activeBudget * 0.97; // Start 3% lower
  
  const tfGrowthPerStep = (totalFunds - tf) / HISTORY_POINTS;
  const abGrowthPerStep = (activeBudget - ab) / HISTORY_POINTS;
  
  for (let i = HISTORY_POINTS - 1; i >= 0; i--) {
    const timestamp = now - (i * FLUCTUATION_INTERVAL);
    // Add small random noise but trend upward
    const noise = (Math.random() - 0.5) * 0.002;
    tf += tfGrowthPerStep + (tf * noise);
    ab += abGrowthPerStep + (ab * noise);
    history.push({ timestamp, totalFunds: Math.round(tf), activeBudget: Math.round(ab) });
  }
  
  // Make sure the last point matches current values exactly
  history[history.length - 1] = { timestamp: now, totalFunds, activeBudget };
  
  return history;
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudget] = useState<BudgetState>(defaultBudgetState);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { employee } = useAuth();
  
  const canEdit = employee ? EDIT_ALLOWED_IDS.includes(employee.id) : false;

  // Fetch budget from Supabase
  const fetchBudget = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('company_budget')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching budget:', error);
        // Fall back to localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setBudget(parsed);
        }
        return;
      }

      if (data) {
        const newBudget: BudgetState = {
          totalFunds: parseFloat(data.total_funds),
          activeBudget: parseFloat(data.active_budget),
          priceHistory: generateInitialHistory(
            parseFloat(data.total_funds),
            parseFloat(data.active_budget)
          ),
          lastUpdated: Date.now(),
        };
        setBudget(newBudget);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newBudget));
      }
    } catch (err) {
      console.error('Error fetching budget:', err);
    } finally {
      setLoading(false);
      setIsLoaded(true);
    }
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      if (data) {
        setTransactions(data as BudgetTransaction[]);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBudget();
    fetchTransactions();
  }, [fetchBudget, fetchTransactions]);

  // Price fluctuation interval (cosmetic only - actual values in Supabase)
  useEffect(() => {
    if (!isLoaded) return;

    const updateFluctuation = () => {
      setBudget((prev) => {
        const newTotal = fluctuate(prev.totalFunds);
        const newActive = fluctuate(prev.activeBudget);
        const now = Date.now();
        
        const newHistory = [...prev.priceHistory, {
          timestamp: now,
          totalFunds: newTotal,
          activeBudget: newActive,
        }];
        
        // Trim history
        while (newHistory.length > HISTORY_POINTS) {
          newHistory.shift();
        }
        
        return {
          ...prev,
          totalFunds: newTotal,
          activeBudget: newActive,
          priceHistory: newHistory,
          lastUpdated: now,
        };
      });
    };

    intervalRef.current = setInterval(updateFluctuation, FLUCTUATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoaded]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('budget-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_budget' },
        () => {
          fetchBudget();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'budget_transactions' },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBudget, fetchTransactions]);

  // Add to active budget (game money contributions)
  const addToActiveBudget = useCallback(async (
    amount: number,
    description: string,
    type: BudgetTransaction['transaction_type']
  ) => {
    try {
      // Update budget
      const { error: budgetError } = await supabase
        .from('company_budget')
        .update({
          active_budget: budget.activeBudget + amount,
          last_updated: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('company_budget').select('id').single()).data?.id);

      if (budgetError) {
        console.error('Error updating budget:', budgetError);
        return;
      }

      // Record transaction
      await supabase.from('budget_transactions').insert({
        amount,
        transaction_type: type,
        description,
        affects: 'active_budget',
        created_by: employee?.id || 'system',
      });

      // Award XP for contributions over 1M (non-fatal)
      if (employee?.id && amount >= 1_000_000) {
        try {
          await supabase.rpc('award_xp', {
            p_employee_id: employee.id,
            p_amount: 30,
            p_source: 'budget_contribution',
            p_description: description?.slice(0, 120) || null,
          });
        } catch (e) {
          console.warn('[Budget] XP grant failed (non-fatal):', e);
        }
      }

      await fetchBudget();
    } catch (err) {
      console.error('Error adding to active budget:', err);
    }
  }, [budget.activeBudget, employee?.id, fetchBudget]);

  // Add to total funds (large investments, etc.)
  const addToTotalFunds = useCallback(async (
    amount: number,
    description: string,
    type: BudgetTransaction['transaction_type']
  ) => {
    try {
      // Update budget
      const { error: budgetError } = await supabase
        .from('company_budget')
        .update({
          total_funds: budget.totalFunds + amount,
          last_updated: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('company_budget').select('id').single()).data?.id);

      if (budgetError) {
        console.error('Error updating budget:', budgetError);
        return;
      }

      // Record transaction
      await supabase.from('budget_transactions').insert({
        amount,
        transaction_type: type,
        description,
        affects: 'total_funds',
        created_by: employee?.id || 'system',
      });

      await fetchBudget();
    } catch (err) {
      console.error('Error adding to total funds:', err);
    }
  }, [budget.totalFunds, employee?.id, fetchBudget]);

  // Subtract from active budget (paychecks)
  const subtractFromActiveBudget = useCallback(async (
    amount: number,
    description: string,
    type: BudgetTransaction['transaction_type']
  ) => {
    try {
      // Update budget
      const { error: budgetError } = await supabase
        .from('company_budget')
        .update({
          active_budget: budget.activeBudget - amount,
          last_updated: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('company_budget').select('id').single()).data?.id);

      if (budgetError) {
        console.error('Error updating budget:', budgetError);
        return;
      }

      // Record transaction
      await supabase.from('budget_transactions').insert({
        amount: -amount,
        transaction_type: type,
        description,
        affects: 'active_budget',
        created_by: employee?.id || 'system',
      });

      await fetchBudget();
    } catch (err) {
      console.error('Error subtracting from active budget:', err);
    }
  }, [budget.activeBudget, employee?.id, fetchBudget]);

  // Manual adjustment (for Logan/Yates)
  const manualAdjust = useCallback(async (
    totalChange: number,
    activeChange: number,
    description: string
  ) => {
    if (!canEdit) return;

    try {
      // Update budget
      const { error: budgetError } = await supabase
        .from('company_budget')
        .update({
          total_funds: budget.totalFunds + totalChange,
          active_budget: budget.activeBudget + activeChange,
          last_updated: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('company_budget').select('id').single()).data?.id);

      if (budgetError) {
        console.error('Error updating budget:', budgetError);
        return;
      }

      // Record transaction
      const transactionType = (totalChange + activeChange) >= 0 ? 'manual_add' : 'manual_subtract';
      await supabase.from('budget_transactions').insert({
        amount: totalChange + activeChange,
        transaction_type: transactionType,
        description,
        affects: 'both',
        created_by: employee?.id || 'unknown',
      });

      await fetchBudget();
    } catch (err) {
      console.error('Error in manual adjustment:', err);
    }
  }, [canEdit, budget.totalFunds, budget.activeBudget, employee?.id, fetchBudget]);

  return (
    <BudgetContext.Provider
      value={{
        budget,
        transactions,
        loading,
        canEdit,
        addToTotalFunds,
        addToActiveBudget,
        subtractFromActiveBudget,
        manualAdjust,
        fetchBudget,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
