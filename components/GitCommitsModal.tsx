'use client';

import { useState, useEffect } from 'react';

interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface DeploymentStatus {
  status: 'success' | 'failed' | 'building' | 'unknown';
  message: string;
}

interface GitCommitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function GitCommitsModal({ isOpen, onClose }: GitCommitsModalProps) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [deployStatus, setDeployStatus] = useState<DeploymentStatus>({ status: 'unknown', message: 'Checking...' });

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const fetchCommits = async () => {
      setLoading(true);
      setError(null);
      setStale(false);

      try {
        const response = await fetch('/api/github/commits');
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.commits) {
          throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        if (cancelled) return;

        const formatted: GitCommit[] = payload.commits.map((c: any) => ({
          sha: c.sha,
          message: c.message,
          author: c.author,
          date: formatDate(c.date),
          url: c.url,
        }));

        setCommits(formatted);
        setStale(Boolean(payload.stale));
        setDeployStatus({
          status: 'success',
          message: payload.stale ? 'Live (showing cached commits)' : 'Live & Running',
        });
      } catch (err: any) {
        if (cancelled) return;
        setError(`Could not fetch commits: ${err?.message ?? 'unknown error'}`);
        setDeployStatus({ status: 'unknown', message: 'Could not verify' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCommits();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusColor = (status: DeploymentStatus['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'building': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: DeploymentStatus['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'building': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🔧</span> Dev Status
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none p-2"
          >
            ×
          </button>
        </div>

        {/* Deployment Status */}
        <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(deployStatus.status)}`} />
            <div>
              <p className="text-white font-medium">Deployment Status</p>
              <p className="text-gray-400 text-sm">{getStatusIcon(deployStatus.status)} {deployStatus.message}</p>
            </div>
          </div>
        </div>

        {/* Commits List */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <h3 className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
            <span>📝</span> Recent Commits
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full" />
            </div>
          ) : error ? (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 text-red-300 text-sm">
              {error}
            </div>
          ) : (
            <div className="space-y-2">
              {commits.map((commit, index) => (
                <a
                  key={commit.sha}
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 rounded-lg transition-all hover:bg-gray-800 ${
                    index === 0 ? 'bg-gray-800/80 border border-green-600/30' : 'bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {commit.message}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {commit.author} • {commit.date}
                      </p>
                    </div>
                    <code className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded font-mono">
                      {commit.sha}
                    </code>
                  </div>
                  {index === 0 && (
                    <div className="mt-2 text-green-400 text-xs font-medium">
                      ← Latest commit
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-800/50 border-t border-gray-700 text-center">
          <p className="text-gray-500 text-xs">
            {commits.length} commits loaded{stale ? ' • cached' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
