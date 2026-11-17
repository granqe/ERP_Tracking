import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';
import type { DbHealthStatus } from '../lib/supabase';
import type { User } from '../types';
import { hashPassword } from '../utils/auth';

interface LoginScreenProps {
  users: User[];
  dbHealth: DbHealthStatus;
  onRetryConnection: () => void;
  onLogin: (user: User) => void;
  onBootstrapAdmin: (
    name: string,
    username: string,
    password: string
  ) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  dbHealth,
  onRetryConnection,
  onLogin,
  onBootstrapAdmin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // First-time production admin setup (only shown if users table is completely empty)
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const activeUsers = users.filter((u) => u.active);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Ju lutem shkruani emrin e përdoruesit dhe fjalëkalimin.');
      return;
    }

    setLoggingIn(true);
    setError('');
    try {
      const normalized = username.trim().toLowerCase();
      const found = users.find(
        (u) => u.username.toLowerCase() === normalized
      );

      if (!found) {
        setError('Emri i përdoruesit ose fjalëkalimi është i pasaktë.');
        return;
      }

      if (!found.active) {
        setError(
          'Kjo llogari është çaktivizuar. Kontaktoni Superadmin-in.'
        );
        return;
      }

      const inputHash = await hashPassword(password);
      if (found.password_hash !== inputHash) {
        setError('Emri i përdoruesit ose fjalëkalimi është i pasaktë.');
        return;
      }

      onLogin(found);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCreateFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminUsername.trim() || !adminPassword) return;
    setCreatingAdmin(true);
    try {
      await onBootstrapAdmin(adminName, adminUsername, adminPassword);
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Panel: Brand */}
          <div className="lg:col-span-5 flex flex-col justify-center rounded-2xl bg-slate-900 p-8 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  ERP Migration & Bug Tracker
                </h1>
                <p className="text-xs text-slate-400">
                  Sistemi i Gjurmimit: QuickBooks → ERP
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Connection Status / First Admin Setup / Username+Password Login */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-center">
            {!dbHealth.connected ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-rose-950">
                      Lidhja me Databazën (Supabase) nuk është gati
                    </h3>
                    <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                      {dbHealth.error}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 text-sm">
                    Si ta përfundoni lidhjen në Vercel:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                    <li>
                      Krijoni databazën Supabase (nga{' '}
                      <strong>Vercel → Storage → Supabase</strong> ose{' '}
                      <strong>supabase.com</strong>).
                    </li>
                    <li>
                      Hapni <strong>Supabase SQL Editor</strong> dhe ekzekutoni
                      skedarin <code>schema.sql</code>.
                    </li>
                    <li>
                      Te{' '}
                      <strong>
                        Vercel → Settings → Environment Variables
                      </strong>
                      , sigurohuni që ekzistojnë variablat{' '}
                      <code>VITE_SUPABASE_URL</code> dhe{' '}
                      <code>VITE_SUPABASE_ANON_KEY</code> (dhe bëni{' '}
                      <strong>Redeploy</strong>).
                    </li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={onRetryConnection}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Kontrollo Lidhjen Përsëri</span>
                </button>
              </div>
            ) : activeUsers.length === 0 ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Databaza është e lidhur!
                    </h3>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      Regjistroni llogarinë e parë të{' '}
                      <strong>Superadmin / Menaxherit</strong> për të filluar.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleCreateFirstAdmin}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <span>Krijo Superadmin-in e Parë</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emri dhe Mbiemri *
                    </label>
                    <input
                      required
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Emri dhe Mbiemri"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emri i Përdoruesit (Username) *
                    </label>
                    <input
                      required
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Emri i përdoruesit"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fjalëkalimi *
                    </label>
                    <input
                      required
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingAdmin
                      ? 'Duke krijuar llogarinë...'
                      : 'Krijo Llogarinë & Hyr në Sistem'}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    Hyrje në Sistem
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Vendosni emrin e përdoruesit dhe fjalëkalimin tuaj.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-username"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Emri i Përdoruesit (Username)
                    </label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="login-username"
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Shkruani emrin e përdoruesit"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Fjalëkalimi
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>
                      {loggingIn ? 'Duke verifikuar...' : 'Hyr në Sistem'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
