'use client';

import { useState, useEffect } from 'react';
import { UPDATE_LOG } from './updateData';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export default function UpdatePage() {
  const [showCommits, setShowCommits] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [commitError, setCommitError] = useState(false);

  useEffect(() => {
    if (!showCommits || commits.length > 0) return;
    setLoadingCommits(true);
    setCommitError(false);
    fetch('/api/github/commits')
      .then(r => r.json())
      .then(data => {
        setCommits(data.commits || []);
        setLoadingCommits(false);
      })
      .catch(() => {
        setCommitError(true);
        setLoadingCommits(false);
      });
  }, [showCommits, commits.length]);

  function formatCommitDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a1a] text-gray-100 font-sans">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0d0d22]">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Yates Inc.
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Version history &amp; update log — newest first
            </p>
          </div>
          <button
            onClick={() => setShowCommits(v => !v)}
            className={`mt-1 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
              showCommits
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
            }`}
          >
            INFO {showCommits ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Commits panel */}
      {showCommits && (
        <div className="border-b border-gray-800 bg-[#080814]">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">
              Raw Commits — GitHub
            </h2>
            {loadingCommits && (
              <p className="text-gray-500 text-sm animate-pulse">Loading commits…</p>
            )}
            {commitError && (
              <p className="text-red-400 text-sm">Could not load commits. Check back later.</p>
            )}
            {!loadingCommits && !commitError && commits.length === 0 && (
              <p className="text-gray-500 text-sm">No commits found.</p>
            )}
            <div className="space-y-2">
              {commits.map(c => (
                <a
                  key={c.sha}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <span className="font-mono text-[10px] text-indigo-400/70 pt-0.5 shrink-0 w-16 truncate">
                    {c.sha.slice(0, 7)}
                  </span>
                  <span className="flex-1 text-sm text-gray-300 group-hover:text-white transition-colors leading-snug">
                    {c.message.split('\n')[0]}
                  </span>
                  <span className="text-[10px] text-gray-600 shrink-0 pt-0.5">
                    {formatCommitDate(c.date)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Changelog entries */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-0">
        {UPDATE_LOG.map((entry, i) => (
          <div key={i} className="border-b border-gray-800/60 pb-8 mb-8 last:border-0 last:mb-0">
            {/* Entry header */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className={`text-sm font-mono shrink-0 ${entry.upcoming ? 'text-teal-400/80' : 'text-gray-500'}`}>
                {entry.date}
              </span>
              <h2
                className={`text-lg font-bold leading-tight ${
                  entry.upcoming
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-teal-400'
                    : entry.major
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400'
                    : 'text-white'
                }`}
              >
                {entry.title}
              </h2>
              {entry.upcoming && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-teal-400/60 border border-teal-400/30 rounded px-1.5 py-0.5">
                  Coming never
                </span>
              )}
              {!entry.upcoming && entry.major && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-amber-400/60 border border-amber-400/30 rounded px-1.5 py-0.5">
                  Major
                </span>
              )}
            </div>

            {/* Bullet list */}
            <ul className="space-y-2">
              {entry.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300 leading-relaxed">
                  <span className="text-gray-600 mt-0.5 shrink-0">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 mt-4">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center text-xs text-gray-600">
          Yates Inc. · All rights reserved · <a href="/" className="hover:text-gray-400 transition-colors">← Back to site</a>
        </div>
      </div>
    </main>
  );
}
