'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClient } from '@/contexts/ClientContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ isOpen, onClose }: Props) {
  const { client, setClient } = useClient();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!isOpen || !client) return null;

  const canSubmit = confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    setError('');

    if (!canSubmit) {
      setError('Type DELETE in the box to confirm.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/client-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, password: password || null }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Could not delete your account.');
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => {
        setClient(null);
        localStorage.removeItem('yates-client');
        router.push('/');
      }, 1200);
    } catch (err) {
      console.error('Delete account error:', err);
      setError('Something went wrong. Check console.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 max-w-md w-full border-2 border-red-500 shadow-2xl">
        {done ? (
          <div className="text-center space-y-3">
            <div className="text-5xl">👋</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account deleted</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Logging you out…
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">⚠️</div>
              <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Delete your account?
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                This wipes your user row for{' '}
                <strong className="text-gray-900 dark:text-white">@{client.username}</strong>.
                Your in-game progress, mail handle, and saved data tied to this
                account go with it. This cannot be undone.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Type <span className="font-mono text-red-600 dark:text-red-400">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full border-2 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Password <span className="font-normal text-gray-500 dark:text-gray-400">(only if your account has one)</span>:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank if no password set"
                  className="w-full border-2 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2.5 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                >
                  Keep my account
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canSubmit || loading}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Deleting…' : 'Delete forever'}
                </button>
              </div>

              <p className="text-[11px] text-center text-gray-500 dark:text-gray-400 italic pt-1">
                You can also DM Logan (ID 000001) if this button is broken.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
