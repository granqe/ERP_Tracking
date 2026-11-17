import React, { useState } from 'react';
import {
  ArrowRight,
  Code2,
  Database,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import type { User } from '../types';
import { getInitials, getRoleBadgeClass } from '../utils/formatters';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const activeUsers = users.filter((u) => u.active);
  const managers = activeUsers.filter((u) => u.role === 'Menaxher');
  const developers = activeUsers.filter((u) => u.role === 'Programer');
  const staff = activeUsers.filter((u) => u.role === 'Staf');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = activeUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!found) {
      setError(
        'Ky email nuk u gjet në listën e anëtarëve aktivë. Zgjidhni një llogari nga e djathta ose kontaktoni Menaxherin.'
      );
      return;
    }
    setError('');
    onLogin(found);
  };

  const renderGroup = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    groupUsers: User[]
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {icon}
          <span>{title}</span>
        </div>
        <span className="text-[11px] text-slate-400">{subtitle}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {groupUsers.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onLogin(u)}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-blue-400 hover:shadow-sm active:scale-[0.99]"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: u.avatar_color }}
            >
              {getInitials(u.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                  {u.name}
                </p>
              </div>
              <p className="truncate text-xs text-slate-500">{u.department}</p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeClass(
                u.role
              )}`}
            >
              {u.role}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Panel: Brand & Email Login */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-slate-900 p-8 text-white shadow-xl">
            <div>
              <div className="flex items-center gap-3 mb-6">
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

              <h2 className="text-2xl font-bold leading-snug mb-3">
                Mirë se vini në qendrën e migrimit të ERP-së
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-8">
                Raportoni gabimet teknike, gjurmoni bllokimet e migrimeve CSV dhe
                konfirmoni testimet (UAT) me izolim të plotë sipas rolit.
              </p>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Hyni me adresën tuaj të email-it
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="emri.mbiemri@kompania.al"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-3 py-2 text-xs text-rose-200">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.99]"
                >
                  <span>Hyr në Sistem</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-400" />
                <span>
                  {isSupabaseConfigured
                    ? 'Lidhur me Supabase (Realtime)'
                    : 'Modaliteti Demo (Të dhëna lokale)'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                <span>RBAC Aktiv</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Quick Role Login Cards */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Hyrje e Shpejtë sipas Rolit (Demo & Testim)
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Klikoni mbi një përdorues për të testuar menjëherë pamjen dhe
                  kufizimet e aksesit (RBAC) për atë rol.
                </p>
              </div>

              <div className="space-y-5">
                {renderGroup(
                  'Menaxher i Projektit',
                  'Akses i plotë (God-Mode)',
                  <UserCheck className="h-3.5 w-3.5 text-slate-700" />,
                  managers
                )}
                {renderGroup(
                  'Programerë / Zhvillues',
                  'Detyrat teknike & bllokimet',
                  <Code2 className="h-3.5 w-3.5 text-blue-700" />,
                  developers
                )}
                {renderGroup(
                  'Punonjës / Staf',
                  'Vetëm tiketat personale',
                  <Users className="h-3.5 w-3.5 text-teal-700" />,
                  staff
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600">
              <strong className="text-slate-800">Shënim për testimin:</strong>{' '}
              Pasi të hyni, mund të ndërroni përdoruesin në çdo moment nga
              menuja e shpejtë në krye të faqes (Header) për të verifikuar që
              Stafi sheh vetëm raportimet e veta.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
