'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useTaxVote } from '@/contexts/TaxVoteContext';
import { employees as staticEmployees } from '@/utils/products';
import WTBDManagerModal from '@/components/admin/WTBDManagerModal';
import PaycheckSidebar from '@/components/PaycheckSidebar';
import VoteForChangeModal from '@/components/VoteForChangeModal';
import TierBadge from '@/components/TierBadge';
import { useTier, xpToNextTier } from '@/contexts/TierContext';

export default function AdminPage() {
  const { employee, isLoggedIn } = useAuth();
  const router = useRouter();
  const {
    hired,
    fired,
    eotm,
    setEmployeeOfTheMonth,
    hireEmployee,
    fireEmployee,
    unfireEmployee,
  } = useAdmin();
  const { proposals } = useTaxVote();
  const { getTier, awardXp } = useTier();

  const [showWTBD, setShowWTBD] = useState(false);
  const [showPaychecks, setShowPaychecks] = useState(false);
  const [showTaxTimer, setShowTaxTimer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [eotmJustSet, setEotmJustSet] = useState<string | null>(null);
  const [hireDone, setHireDone] = useState<string | null>(null);
  const [fireDone, setFireDone] = useState<string | null>(null);

  const [eotmPick, setEotmPick] = useState('');
  const [hireForm, setHireForm] = useState({ employeeId: '', name: '', role: '', bio: '' });
  const [firePick, setFirePick] = useState('');
  const [fireReason, setFireReason] = useState('');
  const [xpPick, setXpPick] = useState('');
  const [xpAmount, setXpAmount] = useState('');
  const [xpReason, setXpReason] = useState('');
  const [xpDone, setXpDone] = useState<string | null>(null);

  // Auto-dismiss flash toast after 4s
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  // Auto-dismiss inline confirmations after 5s
  useEffect(() => {
    if (!eotmJustSet) return;
    const t = setTimeout(() => setEotmJustSet(null), 5000);
    return () => clearTimeout(t);
  }, [eotmJustSet]);
  useEffect(() => {
    if (!hireDone) return;
    const t = setTimeout(() => setHireDone(null), 5000);
    return () => clearTimeout(t);
  }, [hireDone]);
  useEffect(() => {
    if (!fireDone) return;
    const t = setTimeout(() => setFireDone(null), 5000);
    return () => clearTimeout(t);
  }, [fireDone]);
  useEffect(() => {
    if (!xpDone) return;
    const t = setTimeout(() => setXpDone(null), 5000);
    return () => clearTimeout(t);
  }, [xpDone]);

  const isLogan = employee?.id === '000001';

  // Gate
  if (!isLoggedIn || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md text-center shadow-xl border-2 border-red-500">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            Employee login required
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
            You need to be logged in as an employee to see this.
          </p>
          <Link
            href="/"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2 rounded-lg"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (!isLogan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md text-center shadow-xl border-2 border-red-500">
          <div className="text-5xl mb-3">⛔</div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            Not your bar, bud.
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
            This page is Logan-only. Nothing to see here.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2 rounded-lg"
          >
            Back home
          </button>
        </div>
      </div>
    );
  }

  // ==== Logan from here on ====
  const firedIds = new Set(fired.map((f) => f.employee_id));
  const roster = [
    ...staticEmployees.map((e) => ({ id: e.id, name: e.name, role: e.role })),
    ...hired.map((h) => ({ id: h.employee_id, name: h.name, role: h.role })),
  ].filter((e) => !firedIds.has(e.id));

  const awaitingTimer = proposals.filter((p) => p.status === 'approved').length;

  const setOk = (text: string) => setFlash({ kind: 'ok', text });
  const setErr = (text: string) => setFlash({ kind: 'err', text });

  const handleSetEotm = async () => {
    if (!eotmPick) return;
    const pick = roster.find((r) => r.id === eotmPick);
    if (!pick) return;
    setBusy(true);
    const res = await setEmployeeOfTheMonth(pick.id, pick.name, employee.id);
    setBusy(false);
    if (res.success) {
      setOk(`👑 ${pick.name} is now Employee of the Month`);
      setEotmJustSet(pick.name);
      setEotmPick('');
    } else {
      setErr(res.error || 'Failed — did you run sql/ADMIN_BAR_SQL.sql?');
    }
  };

  const handleHire = async () => {
    if (!hireForm.employeeId || !hireForm.name || !hireForm.role) {
      setErr('Need ID, name, and role');
      return;
    }
    setBusy(true);
    const res = await hireEmployee({
      employeeId: hireForm.employeeId.trim(),
      name: hireForm.name.trim(),
      role: hireForm.role.trim(),
      bio: hireForm.bio.trim(),
      hiredBy: employee.id,
    });
    setBusy(false);
    if (res.success) {
      setOk(`📥 Hired ${hireForm.name}`);
      setHireDone(hireForm.name);
      setHireForm({ employeeId: '', name: '', role: '', bio: '' });
    } else setErr(res.error || 'Failed — did you run sql/ADMIN_BAR_SQL.sql?');
  };

  const handleFire = async () => {
    if (!firePick) {
      setErr('Pick someone to fire');
      return;
    }
    const target = roster.find((r) => r.id === firePick);
    if (!target) return;
    setBusy(true);
    const res = await fireEmployee({
      employeeId: target.id,
      employeeName: target.name,
      reason: fireReason,
      firedBy: employee.id,
    });
    setBusy(false);
    if (res.success) {
      setOk(`💀 ${target.name} fired`);
      setFireDone(target.name);
      setFirePick('');
      setFireReason('');
    } else setErr(res.error || 'Failed — did you run sql/ADMIN_BAR_SQL.sql?');
  };

  const handleGiveXp = async () => {
    if (!xpPick) {
      setErr('Pick someone to give XP to');
      return;
    }
    const amt = parseInt(xpAmount, 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Enter a positive XP amount');
      return;
    }
    const target = roster.find((r) => r.id === xpPick);
    if (!target) return;
    setBusy(true);
    const res = await awardXp(
      target.id,
      amt,
      'manual_grant',
      xpReason.trim() || `Manual grant by Logan`,
    );
    setBusy(false);
    if (res.success) {
      setOk(
        res.tieredUp
          ? `🎉 ${target.name} tiered up to T${res.tier}! (+${amt} XP)`
          : `✨ +${amt} XP to ${target.name} (T${res.tier}, ${res.xp}/${res.xpToNext})`,
      );
      setXpDone(target.name);
      setXpAmount('');
      setXpReason('');
    } else {
      setErr(res.error || 'Failed — did you run sql/EMPLOYEE_TIERS_SQL.sql?');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-2">
                👑 Admin
              </h1>
              <p className="text-sm sm:text-base opacity-90 mt-1">
                Logan's control panel. Do not give this URL to anyone.
              </p>
            </div>
            <Link
              href="/"
              className="text-xs sm:text-sm bg-white/20 hover:bg-white/30 font-bold px-3 py-1.5 rounded-lg"
            >
              ← Home
            </Link>
          </div>
        </div>
      </div>

      {/* Floating toast (fixed — always visible on scroll) */}
      {flash && (
        <div
          className={`fixed top-20 right-4 z-[250] max-w-sm rounded-xl px-4 py-3 text-sm font-bold border-2 shadow-2xl animate-[slideInRight_0.2s_ease-out] ${
            flash.kind === 'ok'
              ? 'bg-green-500 text-white border-green-700'
              : 'bg-red-500 text-white border-red-700'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{flash.kind === 'ok' ? '✅' : '❌'}</span>
            <span>{flash.text}</span>
            <button
              onClick={() => setFlash(null)}
              className="ml-2 opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Quick Actions */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-xs uppercase tracking-wider font-black text-gray-500 dark:text-gray-400 mb-3">
            Quick Actions
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <button
              onClick={() => setShowPaychecks(true)}
              className="text-left bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl p-4 shadow transition-colors"
            >
              <div className="text-2xl">💰</div>
              <div className="font-black text-base mt-1">Paychecks</div>
              <div className="text-[11px] opacity-90">Salaries, intervals, balances</div>
            </button>
            <button
              onClick={() => setShowWTBD(true)}
              className="text-left bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl p-4 shadow transition-colors"
            >
              <div className="text-2xl">📋</div>
              <div className="font-black text-base mt-1">WTBD Tasks</div>
              <div className="text-[11px] opacity-90">Add / delete / nudge</div>
            </button>
            <button
              onClick={() => setShowTaxTimer(true)}
              className="relative text-left bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl p-4 shadow transition-colors"
            >
              <div className="text-2xl">⏱</div>
              <div className="font-black text-base mt-1">Tax Timer</div>
              <div className="text-[11px] opacity-90">
                {awaitingTimer > 0
                  ? `${awaitingTimer} awaiting a timer`
                  : 'Set timers on approved proposals'}
              </div>
              {awaitingTimer > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-black rounded-full min-w-[24px] h-6 px-2 flex items-center justify-center border-2 border-white">
                  {awaitingTimer}
                </span>
              )}
            </button>
          </div>
        </section>

        {/* EOTM */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-xs uppercase tracking-wider font-black text-gray-500 dark:text-gray-400 mb-3">
            Employee of the Month
          </h2>
          <div className="grid md:grid-cols-2 gap-4 items-start">
            <div>
              {eotm ? (
                <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-yellow-700 rounded-xl p-4 text-black">
                  <div className="text-[10px] font-black uppercase tracking-widest">Current</div>
                  <div className="text-2xl font-black mt-1">{eotm.employee_name}</div>
                  <div className="text-xs font-bold opacity-80 mt-1">
                    Since {new Date(eotm.set_date).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-4 text-gray-500 italic text-sm">
                  Nobody crowned yet.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Pick a new EOTM
              </label>
              <select
                value={eotmPick}
                onChange={(e) => setEotmPick(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              >
                <option value="">Select employee...</option>
                {roster.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role})
                  </option>
                ))}
              </select>
              <button
                disabled={!eotmPick || busy}
                onClick={handleSetEotm}
                className={`w-full font-bold py-2 rounded-lg transition-all ${
                  !eotmPick || busy
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow hover:shadow-lg'
                }`}
              >
                {busy ? 'Saving...' : 'Crown them 👑'}
              </button>
              {eotmJustSet && (
                <div className="bg-yellow-100 dark:bg-yellow-900/40 border-2 border-yellow-500 rounded-lg px-3 py-2 text-sm font-bold text-yellow-900 dark:text-yellow-100 animate-[fadeIn_0.3s_ease-out]">
                  👑 Crowned <span className="underline">{eotmJustSet}</span>! Check the plaque on the
                  homepage / employees page.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Hire + Fire */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-xs uppercase tracking-wider font-black text-gray-500 dark:text-gray-400 mb-3">
              📥 Hire Employee
            </h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Employee ID (e.g. 550001)"
                value={hireForm.employeeId}
                onChange={(e) => setHireForm({ ...hireForm, employeeId: e.target.value })}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              />
              <input
                type="text"
                placeholder="Full Name"
                value={hireForm.name}
                onChange={(e) => setHireForm({ ...hireForm, name: e.target.value })}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              />
              <input
                type="text"
                placeholder="Role (e.g. Junior Developer)"
                value={hireForm.role}
                onChange={(e) => setHireForm({ ...hireForm, role: e.target.value })}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              />
              <textarea
                placeholder="Bio (optional)"
                value={hireForm.bio}
                onChange={(e) => setHireForm({ ...hireForm, bio: e.target.value })}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
                rows={3}
              />
              <button
                disabled={busy}
                onClick={handleHire}
                className={`w-full font-bold py-2 rounded-lg ${
                  busy
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {busy ? 'Hiring...' : 'Hire 📥'}
              </button>
              {hireDone && (
                <div className="bg-green-100 dark:bg-green-900/40 border-2 border-green-500 rounded-lg px-3 py-2 text-sm font-bold text-green-900 dark:text-green-100 animate-[fadeIn_0.3s_ease-out]">
                  📥 {hireDone} is on the team.
                </div>
              )}
            </div>
            {hired.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-[10px] font-black uppercase text-gray-500 mb-2">
                  Previously hired
                </div>
                <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                  {hired.map((h) => (
                    <div
                      key={h.id}
                      className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded px-2 py-1.5"
                    >
                      <span className="truncate">
                        <span className="font-bold">{h.name}</span>{' '}
                        <span className="text-gray-500">· {h.role}</span>
                      </span>
                      <span className="text-xs text-gray-400">#{h.employee_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-xs uppercase tracking-wider font-black text-red-500 mb-3">
              💀 Fire Employee
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
              Applies immediately. Un-fire from the log below.
            </p>
            <div className="space-y-2">
              <select
                value={firePick}
                onChange={(e) => setFirePick(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              >
                <option value="">Select employee to fire...</option>
                {roster
                  .filter((r) => r.id !== '000001')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.role})
                    </option>
                  ))}
              </select>
              <textarea
                placeholder="Reason (optional)"
                value={fireReason}
                onChange={(e) => setFireReason(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
                rows={3}
              />
              <button
                disabled={!firePick || busy}
                onClick={handleFire}
                className={`w-full font-bold py-2 rounded-lg ${
                  !firePick || busy
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {busy ? 'Firing...' : 'Fire 💀'}
              </button>
              {fireDone && (
                <div className="bg-red-100 dark:bg-red-900/40 border-2 border-red-500 rounded-lg px-3 py-2 text-sm font-bold text-red-900 dark:text-red-100 animate-[fadeIn_0.3s_ease-out]">
                  💀 {fireDone} has been fired. Cold.
                </div>
              )}
            </div>

            {fired.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-[10px] font-black uppercase text-gray-500 mb-2">
                  Fired Log ({fired.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fired.map((f) => (
                    <div
                      key={f.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 dark:text-white truncate">
                            {f.employee_name}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            #{f.employee_id} · {new Date(f.fired_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const res = await unfireEmployee(f.employee_id);
                            if (res.success) setOk(`Un-fired ${f.employee_name}`);
                            else setErr(res.error || 'Failed');
                          }}
                          className="text-[11px] bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded font-bold shrink-0"
                        >
                          Un-fire
                        </button>
                      </div>
                      {f.reason && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 italic mt-1">
                          "{f.reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Give XP / Tiers */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-xs uppercase tracking-wider font-black text-gray-500 dark:text-gray-400 mb-3">
            ✨ Give XP (Employee Tiers)
          </h2>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Employee
              </label>
              <select
                value={xpPick}
                onChange={(e) => setXpPick(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              >
                <option value="">Select...</option>
                {roster.map((r) => {
                  const t = getTier(r.id);
                  return (
                    <option key={r.id} value={r.id}>
                      {r.name} — T{t?.current_tier ?? 1} ({t?.current_xp ?? 0}/
                      {xpToNextTier(t?.current_tier ?? 1)} XP)
                    </option>
                  );
                })}
              </select>

              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mt-2">
                XP Amount
              </label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 500"
                value={xpAmount}
                onChange={(e) => setXpAmount(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              />

              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mt-2">
                Reason (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. fixed the login bug"
                value={xpReason}
                onChange={(e) => setXpReason(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              />

              <button
                disabled={!xpPick || !xpAmount || busy}
                onClick={handleGiveXp}
                className={`w-full font-bold py-2 rounded-lg mt-2 transition-all ${
                  !xpPick || !xpAmount || busy
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow hover:shadow-lg'
                }`}
              >
                {busy ? 'Granting...' : 'Grant XP ✨'}
              </button>

              {xpDone && (
                <div className="bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-500 rounded-lg px-3 py-2 text-sm font-bold text-purple-900 dark:text-purple-100 animate-[fadeIn_0.3s_ease-out]">
                  ✨ Granted XP to <span className="underline">{xpDone}</span>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                Current roster
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {roster.map((r) => {
                  const t = getTier(r.id);
                  const tier = t?.current_tier ?? 1;
                  const xp = t?.current_xp ?? 0;
                  const next = xpToNextTier(tier);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <TierBadge employeeId={r.id} size="xs" />
                        <span className="font-bold truncate">{r.name}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 shrink-0">
                        {tier >= 100 ? 'MAX' : `${xp}/${next}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 italic mt-3">
            Auto XP: tax votes (50), budget deposits ≥$1M (30), /game session tick (10 every 5 min). EOTM = instant tier-up.
          </div>
        </section>

        <div className="text-center text-xs text-gray-500 italic pt-2">
          Heads up: the Wyatt-approval email flow for Fire is deferred — fire is immediate.
        </div>
      </div>

      {/* Overlays */}
      <WTBDManagerModal isOpen={showWTBD} onClose={() => setShowWTBD(false)} />
      <PaycheckSidebar isOpen={showPaychecks} onClose={() => setShowPaychecks(false)} />
      <VoteForChangeModal
        isOpen={showTaxTimer}
        onClose={() => setShowTaxTimer(false)}
        initialTab="proposals"
      />
    </div>
  );
}
