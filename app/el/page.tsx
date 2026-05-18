'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function EmployeeLoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(employeeId, password);

    if (result.success) {
      router.push('/');
    } else {
      if (result.error === 'id') {
        setError(
          'No employee matched that ID. In Supabase: Table Editor → employees — look up the id you typed. If it is missing, run sql/00_EMPLOYEES_AND_TASKS.sql. If the row exists but login still fails, run sql/FIX_EMPLOYEES_LOGIN.sql (RLS can hide rows). Confirm .env.local points at THIS Supabase project.',
        );
      } else if (result.error === 'password') {
        setError(
          'Wrong password. Bernardo\'s seeded password from the docs is typically PSSW (check SUPABASE_SETUP or sql/00_EMPLOYEES_AND_TASKS.sql).',
        );
      } else if (result.error === 'rls') {
        setError(
          'Database blocked the login (Row Level Security on employees). Run sql/FIX_EMPLOYEES_LOGIN.sql in Supabase SQL Editor.',
        );
      } else if (result.error === 'no_table') {
        setError('Database is missing the employees table. Run sql/00_EMPLOYEES_AND_TASKS.sql first.');
      } else if (result.error === 'config') {
        setError(
          'Server missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart dev.',
        );
      } else {
        setError('Login failed — check terminal / browser console or try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">Employee Login</h1>
          <p className="text-gray-700 dark:text-gray-300 text-center mb-6 text-lg">Log-in:</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Employee ID"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

