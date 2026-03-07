'use client';

import { useState } from 'react';
import { usePaycheck } from '@/contexts/PaycheckContext';
import { employees } from '@/utils/products';

interface PaycheckSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Format money with K, M, B, T, Q suffixes
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
  return amount.toFixed(2);
}

export default function PaycheckSidebar({ isOpen, onClose }: PaycheckSidebarProps) {
  const { paychecks, updateSalary, updatePayInterval, loading, getPaycheckTaxInfo } = usePaycheck();
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCurrency, setEditCurrency] = useState<'yates' | 'walters'>('yates');
  const [editInterval, setEditInterval] = useState<string>('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Get employee name by ID
  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp?.name || 'Unknown';
  };

  // Get employee role by ID
  const getEmployeeRole = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp?.role || '';
  };

  const handleEdit = (employeeId: string, currentAmount: number, currentCurrency: 'yates' | 'walters', currentInterval: number) => {
    setEditingEmployee(employeeId);
    setEditAmount(currentAmount.toString());
    setEditCurrency(currentCurrency);
    setEditInterval(currentInterval.toString());
  };

  const handleSave = async (employeeId: string) => {
    setSaving(true);
    // Cap at $1B
    const amount = Math.min(parseFloat(editAmount) || 0, 1000000000);
    await updateSalary(employeeId, amount, editCurrency);
    const newInterval = parseInt(editInterval) || 5;
    if (newInterval > 0) {
      await updatePayInterval(employeeId, newInterval);
    }
    setEditingEmployee(null);
    setSaving(false);
  };

  const handleCancel = () => {
    setEditingEmployee(null);
    setEditAmount('');
    setEditInterval('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, employeeId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(employeeId);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Sort paychecks: Logan first, then by days until paycheck
  const sortedPaychecks = [...paychecks].sort((a, b) => {
    if (a.employee_id === '000001') return -1;
    if (b.employee_id === '000001') return 1;
    return a.days_until_paycheck - b.days_until_paycheck;
  });

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
        <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-green-600 to-emerald-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <h2 className="text-2xl font-bold text-white">Paychecks</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">
            Manage employee salaries and view balances
          </p>
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Loading paycheck data...
            </div>
          ) : sortedPaychecks.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No paycheck data found. Run the SQL to set up the table!
            </div>
          ) : (
            sortedPaychecks.map((paycheck) => (
              <div
                key={paycheck.employee_id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                {/* Employee Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {getEmployeeName(paycheck.employee_id)}
                    </h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {getEmployeeRole(paycheck.employee_id)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Next paycheck in
                    </div>
                    <div className={`font-bold ${
                      paycheck.days_until_paycheck <= 1 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {paycheck.days_until_paycheck} day{paycheck.days_until_paycheck !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 text-center">
                    <div className="text-xs text-yellow-700 dark:text-yellow-400">Yates $</div>
                    <div className="font-bold text-yellow-800 dark:text-yellow-300">
                      ${formatMoney(paycheck.yates_balance)}
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2 text-center">
                    <div className="text-xs text-purple-700 dark:text-purple-400">Walters $</div>
                    <div className="font-bold text-purple-800 dark:text-purple-300">
                      ${formatMoney(paycheck.walters_balance)}
                    </div>
                  </div>
                </div>

                {/* Salary Section - Fixed height container to prevent layout jumping */}
                <div className="min-h-[100px]">
                  {editingEmployee === paycheck.employee_id ? (
                    <div className="space-y-2">
                      {/* Salary Amount & Currency */}
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, paycheck.employee_id)}
                          className="flex-1 px-3 py-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                          placeholder="Amount (max $1B)"
                          min="0"
                          max="1000000000"
                          step="0.01"
                          autoFocus
                        />
                        <select
                          value={editCurrency}
                          onChange={(e) => setEditCurrency(e.target.value as 'yates' | 'walters')}
                          onKeyDown={(e) => handleKeyDown(e, paycheck.employee_id)}
                          className="px-3 py-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                        >
                          <option value="yates">Yates $</option>
                          <option value="walters">Walters $</option>
                        </select>
                      </div>
                      {/* Pay Interval */}
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Pay every</span>
                        <input
                          type="number"
                          value={editInterval}
                          onChange={(e) => setEditInterval(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, paycheck.employee_id)}
                          className="w-16 px-2 py-1.5 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm text-center"
                          placeholder="5"
                          min="1"
                          max="365"
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
                      </div>
                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(paycheck.employee_id)}
                          disabled={saving}
                          className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-1.5 rounded text-sm font-medium hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 text-center">Press Enter to save, Escape to cancel</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Gross Salary: </span>
                          <span className={`font-semibold ${
                            paycheck.salary_currency === 'yates' 
                              ? 'text-yellow-700 dark:text-yellow-400' 
                              : 'text-purple-700 dark:text-purple-400'
                          }`}>
                            ${formatMoney(paycheck.salary_amount)} {paycheck.salary_currency === 'yates' ? 'Yates' : 'Walters'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleEdit(
                            paycheck.employee_id,
                            paycheck.salary_amount,
                            paycheck.salary_currency,
                            paycheck.pay_interval
                          )}
                          className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      {/* Pay Interval Display */}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Pays every {paycheck.pay_interval} day{paycheck.pay_interval !== 1 ? 's' : ''}
                      </div>
                      {/* Tax breakdown */}
                      {paycheck.salary_amount > 0 && (
                        <div className="text-xs bg-red-50 dark:bg-red-900/20 rounded px-2 py-1 border border-red-200 dark:border-red-800">
                          <div className="flex justify-between text-red-600 dark:text-red-400">
                            <span>Tax ({getPaycheckTaxInfo(paycheck.salary_amount).taxRateLabel}):</span>
                            <span>-${formatMoney(getPaycheckTaxInfo(paycheck.salary_amount).taxAmount)}</span>
                          </div>
                          <div className="flex justify-between text-green-700 dark:text-green-400 font-semibold mt-0.5">
                            <span>Net Pay:</span>
                            <span>${formatMoney(getPaycheckTaxInfo(paycheck.salary_amount).finalAmount)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Paychecks are automatically processed based on each employee&apos;s interval
          </p>
        </div>
      </div>
    </>
  );
}
