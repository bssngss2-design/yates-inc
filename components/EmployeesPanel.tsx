'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { employees as staticEmployees } from '@/utils/products';
import { useAdmin } from '@/contexts/AdminContext';

// =====================================================================
// Helpers
// =====================================================================

function formatMoney(amount: number): string {
  if (!isFinite(amount)) return '∞';
  if (amount >= 1e42) return `${(amount / 1e42).toFixed(1)}Tr`;
  if (amount >= 1e39) return `${(amount / 1e39).toFixed(1)}Dr`;
  if (amount >= 1e36) return `${(amount / 1e36).toFixed(1)}Un`;
  if (amount >= 1e33) return `${(amount / 1e33).toFixed(1)}Dc`;
  if (amount >= 1e30) return `${(amount / 1e30).toFixed(1)}No`;
  if (amount >= 1e27) return `${(amount / 1e27).toFixed(1)}Oc`;
  if (amount >= 1e24) return `${(amount / 1e24).toFixed(1)}Sp`;
  if (amount >= 1e21) return `${(amount / 1e21).toFixed(1)}Sx`;
  if (amount >= 1e18) return `${(amount / 1e18).toFixed(1)}Qi`;
  if (amount >= 1e15) return `${(amount / 1e15).toFixed(1)}Q`;
  if (amount >= 1e12) return `${(amount / 1e12).toFixed(1)}T`;
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toFixed(0);
}

function formatHours(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0h';
  const totalMin = Math.floor(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  if (h < 1000) return `${h}h ${m}m`;
  return `${h.toLocaleString()}h`;
}

function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return 'never';
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
}

const ACTIVE_WINDOW_MS = 60_000; // anyone whose last_seen ping was within 60s

// =====================================================================
// Types
// =====================================================================

interface UserGameRow {
  user_id: string;
  user_type: 'employee' | 'client';
  yates_dollars: number | null;
  anti_cheat_warnings: number | null;
  is_on_watchlist: boolean | null;
  is_blocked: boolean | null;
  total_playtime_seconds: number | null;
  has_autoclicker: boolean | null;
  created_at: string | null;
}

interface ClientRow {
  id: string;
  username: string;
  mail_handle: string;
  created_at: string | null;
}

interface BannedRow {
  user_id: string;
  username: string | null;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
}

interface BanHistoryRow {
  user_id: string;
  action: 'ban' | 'unban';
  created_at: string | null;
  reason: string | null;
}

interface PresenceRow {
  user_id: string;
  user_type: 'employee' | 'client';
  username: string | null;
  current_path: string | null;
  last_seen: string | null;
}

interface UnifiedUser {
  id: string;
  type: 'employee' | 'client';
  name: string;
  role?: string;
  joinedAt: string | null;
  isFired?: boolean;
  // Stats from user_game_data (may be missing if user never played)
  money: number;
  warnings: number;
  watchlist: boolean;
  blocked: boolean;
  hasAutoclicker: boolean;
  playtimeSec: number;
  // Ban state
  currentlyBanned: boolean;
  currentBanReason: string | null;
  currentBanAt: string | null;
  banCount: number;
  unbanCount: number;
}

// =====================================================================
// Component
// =====================================================================

interface EmployeesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'all' | 'active';

export default function EmployeesPanel({ isOpen, onClose }: EmployeesPanelProps) {
  const { hired, fired } = useAdmin();
  const [tab, setTab] = useState<Tab>('all');

  const [gameRows, setGameRows] = useState<UserGameRow[]>([]);
  const [clientRows, setClientRows] = useState<ClientRow[]>([]);
  const [bannedRows, setBannedRows] = useState<BannedRow[]>([]);
  const [historyRows, setHistoryRows] = useState<BanHistoryRow[]>([]);
  const [presenceRows, setPresenceRows] = useState<PresenceRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'employees' | 'clients' | 'banned' | 'flagged'>('all');
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second to refresh "last seen Xs ago" labels
  useEffect(() => {
    if (!isOpen) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [isOpen]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [
        { data: g, error: gErr },
        { data: c, error: cErr },
        { data: b, error: bErr },
        { data: h, error: hErr },
        { data: p, error: pErr },
      ] = await Promise.all([
        supabase
          .from('user_game_data')
          .select(
            'user_id, user_type, yates_dollars, anti_cheat_warnings, is_on_watchlist, is_blocked, total_playtime_seconds, has_autoclicker, created_at',
          ),
        supabase.from('clients').select('id, username, mail_handle, created_at'),
        supabase.from('banned_users').select('user_id, username, ban_reason, banned_at, banned_by'),
        supabase.from('ban_history').select('user_id, action, created_at, reason'),
        supabase.from('user_presence').select('user_id, user_type, username, current_path, last_seen'),
      ]);

      // The panel can still render even if one table is missing — just note it.
      const errs: string[] = [];
      if (gErr) errs.push(`user_game_data: ${gErr.message}`);
      if (cErr) errs.push(`clients: ${cErr.message}`);
      if (bErr) errs.push(`banned_users: ${bErr.message}`);
      if (hErr) errs.push(`ban_history: ${hErr.message} (run sql/BAN_HISTORY.sql)`);
      if (pErr) errs.push(`user_presence: ${pErr.message} (run sql/USER_PRESENCE.sql)`);
      if (errs.length) setErr(errs.join(' • '));

      setGameRows((g as UserGameRow[]) ?? []);
      setClientRows((c as ClientRow[]) ?? []);
      setBannedRows((b as BannedRow[]) ?? []);
      setHistoryRows((h as BanHistoryRow[]) ?? []);
      setPresenceRows((p as PresenceRow[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen, refresh]);

  // Build unified user list
  const unifiedUsers: UnifiedUser[] = useMemo(() => {
    const gameById = new Map<string, UserGameRow>();
    gameRows.forEach((g) => gameById.set(g.user_id, g));

    const banById = new Map<string, BannedRow>();
    bannedRows.forEach((b) => banById.set(b.user_id, b));

    const banCountById = new Map<string, number>();
    const unbanCountById = new Map<string, number>();
    historyRows.forEach((h) => {
      const map = h.action === 'ban' ? banCountById : unbanCountById;
      map.set(h.user_id, (map.get(h.user_id) ?? 0) + 1);
    });

    const firedIds = new Set(fired.map((f) => f.employee_id));
    const hiredIds = new Set(hired.map((h) => h.employee_id));

    const out: UnifiedUser[] = [];

    // Static employees (excluding fired)
    staticEmployees.forEach((e) => {
      const g = gameById.get(e.id);
      const ban = banById.get(e.id);
      out.push({
        id: e.id,
        type: 'employee',
        name: e.name,
        role: e.role,
        joinedAt: g?.created_at ?? null,
        isFired: firedIds.has(e.id),
        money: Number(g?.yates_dollars ?? 0),
        warnings: g?.anti_cheat_warnings ?? 0,
        watchlist: g?.is_on_watchlist ?? false,
        blocked: g?.is_blocked ?? false,
        hasAutoclicker: g?.has_autoclicker ?? false,
        playtimeSec: g?.total_playtime_seconds ?? 0,
        currentlyBanned: !!ban,
        currentBanReason: ban?.ban_reason ?? null,
        currentBanAt: ban?.banned_at ?? null,
        banCount: banCountById.get(e.id) ?? 0,
        unbanCount: unbanCountById.get(e.id) ?? 0,
      });
    });

    // Hired employees (skip ones already in static)
    const staticIds = new Set(staticEmployees.map((e) => e.id));
    hired.forEach((h) => {
      if (staticIds.has(h.employee_id)) return;
      const g = gameById.get(h.employee_id);
      const ban = banById.get(h.employee_id);
      out.push({
        id: h.employee_id,
        type: 'employee',
        name: h.name,
        role: h.role,
        joinedAt: g?.created_at ?? h.hired_at ?? null,
        isFired: firedIds.has(h.employee_id),
        money: Number(g?.yates_dollars ?? 0),
        warnings: g?.anti_cheat_warnings ?? 0,
        watchlist: g?.is_on_watchlist ?? false,
        blocked: g?.is_blocked ?? false,
        hasAutoclicker: g?.has_autoclicker ?? false,
        playtimeSec: g?.total_playtime_seconds ?? 0,
        currentlyBanned: !!ban,
        currentBanReason: ban?.ban_reason ?? null,
        currentBanAt: ban?.banned_at ?? null,
        banCount: banCountById.get(h.employee_id) ?? 0,
        unbanCount: unbanCountById.get(h.employee_id) ?? 0,
      });
    });

    // Clients
    clientRows.forEach((c) => {
      const g = gameById.get(c.id);
      const ban = banById.get(c.id);
      out.push({
        id: c.id,
        type: 'client',
        name: c.username,
        joinedAt: c.created_at ?? g?.created_at ?? null,
        money: Number(g?.yates_dollars ?? 0),
        warnings: g?.anti_cheat_warnings ?? 0,
        watchlist: g?.is_on_watchlist ?? false,
        blocked: g?.is_blocked ?? false,
        hasAutoclicker: g?.has_autoclicker ?? false,
        playtimeSec: g?.total_playtime_seconds ?? 0,
        currentlyBanned: !!ban,
        currentBanReason: ban?.ban_reason ?? null,
        currentBanAt: ban?.banned_at ?? null,
        banCount: banCountById.get(c.id) ?? 0,
        unbanCount: unbanCountById.get(c.id) ?? 0,
      });
    });

    // Game-data rows that aren't in clients/employees yet (orphans — still
    // useful so we don't hide actively-playing accounts)
    const knownIds = new Set(out.map((u) => u.id));
    gameRows.forEach((g) => {
      if (knownIds.has(g.user_id)) return;
      const ban = banById.get(g.user_id);
      out.push({
        id: g.user_id,
        type: g.user_type,
        name: ban?.username || `(unnamed ${g.user_type})`,
        joinedAt: g.created_at,
        money: Number(g.yates_dollars ?? 0),
        warnings: g.anti_cheat_warnings ?? 0,
        watchlist: g.is_on_watchlist ?? false,
        blocked: g.is_blocked ?? false,
        hasAutoclicker: g.has_autoclicker ?? false,
        playtimeSec: g.total_playtime_seconds ?? 0,
        currentlyBanned: !!ban,
        currentBanReason: ban?.ban_reason ?? null,
        currentBanAt: ban?.banned_at ?? null,
        banCount: banCountById.get(g.user_id) ?? 0,
        unbanCount: unbanCountById.get(g.user_id) ?? 0,
      });
    });

    return out;
  }, [gameRows, clientRows, bannedRows, historyRows, hired, fired]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unifiedUsers
      .filter((u) => {
        if (filter === 'employees' && u.type !== 'employee') return false;
        if (filter === 'clients' && u.type !== 'client') return false;
        if (filter === 'banned' && !(u.currentlyBanned || u.banCount > 0)) return false;
        if (filter === 'flagged' && !(u.warnings > 0 || u.watchlist || u.blocked)) return false;
        if (q) {
          const hay = `${u.name} ${u.id} ${u.role ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Currently banned + flagged float to top, then by money descending
        const aFlag = (a.currentlyBanned ? 2 : 0) + (a.warnings > 0 ? 1 : 0);
        const bFlag = (b.currentlyBanned ? 2 : 0) + (b.warnings > 0 ? 1 : 0);
        if (aFlag !== bFlag) return bFlag - aFlag;
        return b.money - a.money;
      });
  }, [unifiedUsers, search, filter]);

  const activeNow = useMemo(() => {
    return presenceRows.filter((p) => {
      if (!p.last_seen) return false;
      return now - new Date(p.last_seen).getTime() < ACTIVE_WINDOW_MS;
    });
  }, [presenceRows, now]);

  const inGame = activeNow.filter((p) => (p.current_path ?? '').startsWith('/game'));
  const elsewhere = activeNow.filter((p) => !(p.current_path ?? '').startsWith('/game'));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-4 border-purple-500 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              👥 Users
            </h2>
            <p className="text-xs sm:text-sm opacity-80 mt-0.5">
              Everyone who ever stepped foot in here. Plus who's online right now.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="text-xs bg-white/20 hover:bg-white/30 font-bold px-3 py-1.5 rounded-lg"
              disabled={loading}
              title="Refresh"
            >
              {loading ? '…' : '↻ Refresh'}
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full w-9 h-9 flex items-center justify-center text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {([
            ['all', `All Users (${unifiedUsers.length})`],
            ['active', `Active Now (${activeNow.length})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={`flex-1 py-3 px-2 text-xs sm:text-sm font-semibold transition-colors ${
                tab === key
                  ? 'bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {err && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300 text-[11px] px-4 py-2 border-b border-yellow-200 dark:border-yellow-900/50">
            ⚠️ {err}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'all' ? (
            <AllUsersTab
              users={filteredUsers}
              total={unifiedUsers.length}
              search={search}
              setSearch={setSearch}
              filter={filter}
              setFilter={setFilter}
            />
          ) : (
            <ActiveUsersTab inGame={inGame} elsewhere={elsewhere} now={now} />
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// All Users tab
// =====================================================================

function AllUsersTab({
  users,
  total,
  search,
  setSearch,
  filter,
  setFilter,
}: {
  users: UnifiedUser[];
  total: number;
  search: string;
  setSearch: (s: string) => void;
  filter: 'all' | 'employees' | 'clients' | 'banned' | 'flagged';
  setFilter: (f: 'all' | 'employees' | 'clients' | 'banned' | 'flagged') => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, id, role…"
          className="flex-1 min-w-[200px] border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
        />
        <div className="flex gap-1 text-xs">
          {(
            [
              ['all', 'All'],
              ['employees', 'Employees'],
              ['clients', 'Clients'],
              ['banned', '🔨 Banned'],
              ['flagged', '⚠ Flagged'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2.5 py-1 rounded font-bold ${
                filter === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 italic py-12">
          No users match this filter. {total === 0 && '(Did the data even load?)'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {users.map((u) => (
            <UserCard key={`${u.type}-${u.id}`} u={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({ u }: { u: UnifiedUser }) {
  const flagBorder = u.currentlyBanned
    ? 'border-red-500'
    : u.warnings > 0 || u.watchlist || u.blocked
      ? 'border-yellow-500'
      : u.type === 'employee'
        ? 'border-blue-300 dark:border-blue-700'
        : 'border-gray-200 dark:border-gray-700';

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border-2 ${flagBorder} p-3 shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Top row: name + type badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-gray-900 dark:text-white truncate">{u.name}</h4>
            <span
              className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                u.type === 'employee'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {u.type}
            </span>
            {u.isFired && (
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                fired
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            #{u.id}
            {u.role && <> · {u.role}</>}
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat label="Money" value={`$${formatMoney(u.money)}`} tone="money" />
        <Stat label="Hours" value={formatHours(u.playtimeSec)} />
        <Stat label="Joined" value={formatDate(u.joinedAt)} />
        <Stat
          label="Warnings"
          value={u.warnings.toString()}
          tone={u.warnings > 0 ? 'warn' : undefined}
        />
      </div>

      {/* Flags */}
      {(u.hasAutoclicker || u.watchlist || u.blocked) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {u.hasAutoclicker && (
            <Pill
              tone="warn"
              title="This account owns the in-game autoclicker upgrade. Not a punishment — just info."
            >
              🤖 Autoclicker
            </Pill>
          )}
          {u.watchlist && (
            <Pill
              tone="warn"
              title="Anti-cheat flagged suspicious click patterns. They can still play, just being watched."
            >
              👁 Watchlist
            </Pill>
          )}
          {u.blocked && (
            <Pill
              tone="bad"
              title="Anti-cheat froze their game (rock turns to bedrock, no earnings). Different from a site ban — they can still browse the site. Lifts when they dismiss the warning, appeal, or an admin clears it."
            >
              🚫 Blocked
            </Pill>
          )}
        </div>
      )}

      {/* Ban info */}
      <div className="mt-2 text-[11px]">
        {u.currentlyBanned ? (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-900 rounded px-2 py-1 text-red-700 dark:text-red-300">
            <div className="font-bold">🔨 Currently banned</div>
            {u.currentBanAt && (
              <div className="opacity-80">since {formatDate(u.currentBanAt)}</div>
            )}
            {u.currentBanReason && (
              <div className="italic opacity-80 truncate">"{u.currentBanReason}"</div>
            )}
          </div>
        ) : u.banCount > 0 ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900 rounded px-2 py-1 text-amber-800 dark:text-amber-300">
            ⚠ Was banned {u.banCount}× before · {u.unbanCount > 0 ? `unbanned ${u.unbanCount}×` : 'never unbanned officially'}
          </div>
        ) : (
          <div className="text-gray-400 dark:text-gray-500 italic">
            Never banned
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'money' | 'warn';
}) {
  const valueClass =
    tone === 'money'
      ? 'text-yellow-600 dark:text-yellow-400 font-black'
      : tone === 'warn'
        ? 'text-yellow-700 dark:text-yellow-400 font-black'
        : 'text-gray-900 dark:text-white font-bold';
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className={`text-sm tabular-nums ${valueClass} truncate`}>{value}</div>
    </div>
  );
}

function Pill({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone?: 'warn' | 'bad';
  title?: string;
}) {
  const toneClass =
    tone === 'bad'
      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
      : tone === 'warn'
        ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
  return (
    <span
      title={title}
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${toneClass}`}
    >
      {children}
    </span>
  );
}

// =====================================================================
// Active Now tab
// =====================================================================

function ActiveUsersTab({
  inGame,
  elsewhere,
  now,
}: {
  inGame: PresenceRow[];
  elsewhere: PresenceRow[];
  now: number;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-5">
      <div className="text-[11px] text-gray-500 dark:text-gray-400 italic">
        Anyone whose browser pinged in the last 60 seconds. Heartbeat is every ~20s.
      </div>

      <Section
        title="🎮 In the game"
        emptyText="Nobody's mining right now."
        rows={inGame}
        now={now}
        accent="emerald"
      />

      <Section
        title="🌐 Elsewhere on the site"
        emptyText="Nobody's lurking anywhere else."
        rows={elsewhere}
        now={now}
        accent="purple"
      />
    </div>
  );
}

function Section({
  title,
  emptyText,
  rows,
  now,
  accent,
}: {
  title: string;
  emptyText: string;
  rows: PresenceRow[];
  now: number;
  accent: 'emerald' | 'purple';
}) {
  const headerClass =
    accent === 'emerald'
      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
      : 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-900 text-purple-800 dark:text-purple-300';
  return (
    <div>
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 mb-2 ${headerClass}`}
      >
        <div className="font-black text-sm">{title}</div>
        <div className="text-xs font-bold tabular-nums">{rows.length}</div>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic px-2">{emptyText}</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {rows
            .slice()
            .sort((a, b) => {
              const at = a.last_seen ? new Date(a.last_seen).getTime() : 0;
              const bt = b.last_seen ? new Date(b.last_seen).getTime() : 0;
              return bt - at;
            })
            .map((p) => (
              <PresenceCard key={p.user_id} p={p} now={now} />
            ))}
        </div>
      )}
    </div>
  );
}

function PresenceCard({ p, now }: { p: PresenceRow; now: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <div className="font-bold text-gray-900 dark:text-white truncate">
            {p.username || `(unnamed ${p.user_type})`}
          </div>
          <span
            className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0 ${
              p.user_type === 'employee'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {p.user_type}
          </span>
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate font-mono">
          {p.current_path || '/'}
        </div>
      </div>
      <div className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 text-right tabular-nums">
        {formatRelative(p.last_seen, now)}
      </div>
    </div>
  );
}
