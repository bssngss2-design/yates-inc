'use client';

import { useState, useMemo } from 'react';
import { useBudget } from '@/contexts/BudgetContext';

interface BudgetSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BudgetSidebar({ isOpen, onClose }: BudgetSidebarProps) {
  const { budget, transactions, loading, canEdit, manualAdjust } = useBudget();
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTotal, setAdjustTotal] = useState('');
  const [adjustActive, setAdjustActive] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const formatMoney = (amount: number): string => {
    if (!isFinite(amount)) return '$∞';
    if (amount >= 1e42) return `$${(amount / 1e42).toFixed(2)}Tr`;
    if (amount >= 1e39) return `$${(amount / 1e39).toFixed(2)}Dr`;
    if (amount >= 1e36) return `$${(amount / 1e36).toFixed(2)}Un`;
    if (amount >= 1e33) return `$${(amount / 1e33).toFixed(2)}Dc`;
    if (amount >= 1e30) return `$${(amount / 1e30).toFixed(2)}No`;
    if (amount >= 1e27) return `$${(amount / 1e27).toFixed(2)}Oc`;
    if (amount >= 1e24) return `$${(amount / 1e24).toFixed(2)}Sp`;
    if (amount >= 1e21) return `$${(amount / 1e21).toFixed(2)}Sx`;
    if (amount >= 1e18) return `$${(amount / 1e18).toFixed(2)}Qi`;
    if (amount >= 1e15) return `$${(amount / 1e15).toFixed(2)}Q`;
    if (amount >= 1e12) return `$${(amount / 1e12).toFixed(2)}T`;
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const handleAdjust = async () => {
    if (!adjustDescription.trim()) return;
    setIsSaving(true);
    const totalChange = parseFloat(adjustTotal) || 0;
    const activeChange = parseFloat(adjustActive) || 0;
    await manualAdjust(totalChange, activeChange, adjustDescription);
    setAdjustTotal('');
    setAdjustActive('');
    setAdjustDescription('');
    setShowAdjustModal(false);
    setIsSaving(false);
  };

  // Calculate graph dimensions with padding
  const graphHeight = 120;
  const graphWidth = 350;
  const padding = 8; // Padding so line doesn't get cut off

  // Generate SVG path for the graph
  const generatePath = (data: { timestamp: number; value: number }[], color: string) => {
    if (data.length < 2) return null;

    const minValue = Math.min(...data.map(d => d.value));
    const maxValue = Math.max(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    // Add padding to prevent line from touching edges
    const drawableHeight = graphHeight - (padding * 2);
    const drawableWidth = graphWidth - (padding * 2);

    const points = data.map((point, i) => {
      const x = padding + (i / (data.length - 1)) * drawableWidth;
      const y = padding + drawableHeight - ((point.value - minValue) / range) * drawableHeight;
      return `${x},${y}`;
    });

    return (
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  const totalFundsData = budget.priceHistory.map(p => ({ timestamp: p.timestamp, value: p.totalFunds }));
  const activeBudgetData = budget.priceHistory.map(p => ({ timestamp: p.timestamp, value: p.activeBudget }));

  // Calculate 24h change (approximate)
  const get24hChange = (current: number, history: { value: number }[]): { amount: number; percent: number } => {
    if (history.length < 2) return { amount: 0, percent: 0 };
    const oldest = history[0].value;
    const amount = current - oldest;
    const percent = ((current - oldest) / oldest) * 100;
    return { amount, percent };
  };

  const totalChange = get24hChange(budget.totalFunds, totalFundsData);
  const activeChange = get24hChange(budget.activeBudget, activeBudgetData);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-16 bottom-0 w-[420px] bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏦</span>
              <h2 className="text-2xl font-bold text-white">Company Budget</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          <p className="text-emerald-100 text-sm mt-1">
            Real-time company financials
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Loading budget data...
            </div>
          ) : (
            <>
              {/* Total Funds Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Total Company Funds</p>
                    <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">
                      {formatMoney(budget.totalFunds)}
                    </p>
                  </div>
                  <div className={`text-right ${totalChange.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <p className="text-sm font-medium">
                      {totalChange.amount >= 0 ? '↑' : '↓'} {formatMoney(Math.abs(totalChange.amount))}
                    </p>
                    <p className="text-xs">
                      ({totalChange.percent >= 0 ? '+' : ''}{totalChange.percent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
                {/* Graph */}
                <div className="mt-3 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                  <svg width={graphWidth} height={graphHeight} className="w-full">
                    {generatePath(totalFundsData, '#059669')}
                  </svg>
                </div>
              </div>

              {/* Active Budget Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Active Budget (In Use)</p>
                    <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                      {formatMoney(budget.activeBudget)}
                    </p>
                  </div>
                  <div className={`text-right ${activeChange.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <p className="text-sm font-medium">
                      {activeChange.amount >= 0 ? '↑' : '↓'} {formatMoney(Math.abs(activeChange.amount))}
                    </p>
                    <p className="text-xs">
                      ({activeChange.percent >= 0 ? '+' : ''}{activeChange.percent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
                {/* Graph */}
                <div className="mt-3 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                  <svg width={graphWidth} height={graphHeight} className="w-full">
                    {generatePath(activeBudgetData, '#3b82f6')}
                  </svg>
                </div>
              </div>

              {/* Edit Button (Logan/Yates only) */}
              {canEdit && (
                <button
                  onClick={() => setShowAdjustModal(true)}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
                >
                  ✏️ Adjust Budget
                </button>
              )}

              {/* Recent Transactions */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Recent Transactions</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No transactions yet</p>
                  ) : (
                    transactions.slice(0, 10).map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-200 dark:border-gray-600 last:border-0">
                        <div>
                          <p className="text-gray-800 dark:text-gray-200">{tx.description}</p>
                          <p className="text-xs text-gray-500">{tx.transaction_type}</p>
                        </div>
                        <span className={`font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Budget updates every 30 seconds • {canEdit ? 'You can edit' : 'View only'}
          </p>
        </div>
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowAdjustModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-6 z-[70] w-96 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Adjust Budget</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Total Funds Change</label>
                <input
                  type="number"
                  value={adjustTotal}
                  onChange={(e) => setAdjustTotal(e.target.value)}
                  placeholder="e.g. 1000000 or -2000000"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Active Budget Change</label>
                <input
                  type="number"
                  value={adjustActive}
                  onChange={(e) => setAdjustActive(e.target.value)}
                  placeholder="e.g. 500000 or -100000"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description *</label>
                <input
                  type="text"
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="e.g. Logan bought equipment"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={!adjustDescription.trim() || isSaving}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Apply'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
