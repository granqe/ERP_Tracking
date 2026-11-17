import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Database,
  Kanban,
  LayoutDashboard,
  LogOut,
  Plus,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import type { User } from '../types';
import { getInitials, getRoleBadgeClass } from '../utils/formatters';

export type ActiveTab = 'pm_overview' | 'work_board';

interface TopBarProps {
  currentUser: User;
  allUsers: User[];
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onSwitchUser: (user: User) => void;
  onOpenNewTicket: () => void;
  onOpenTeamModal: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  allUsers,
  activeTab,
  onTabChange,
  onSwitchUser,
  onOpenNewTicket,
  onOpenTeamModal,
  onResetDemo,
  onLogout,
}) => {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeUsers = allUsers.filter((u) => u.active);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand + Nav */}
          <div className="flex items-center gap-6 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
              </div>
              <div className="hidden sm:block">
                <span className="block text-sm font-bold text-slate-900 leading-none">
                  ERP Migrim & Gjurmues
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Database className="h-3 w-3 text-blue-600" />
                  {isSupabaseConfigured ? 'Supabase Live' : 'Modaliteti Demo'}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1">
              {currentUser.role === 'Menaxher' && (
                <button
                  type="button"
                  onClick={() => onTabChange('pm_overview')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === 'pm_overview'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden md:inline">Pamja e Menaxherit</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onTabChange('work_board')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === 'work_board'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Kanban className="h-4 w-4" />
                <span>
                  {currentUser.role === 'Staf'
                    ? 'Kërkesat e Mia'
                    : currentUser.role === 'Programer'
                    ? 'Detyrat e Mia'
                    : 'Tabela e Punës'}
                </span>
              </button>

              {currentUser.role === 'Menaxher' && (
                <button
                  type="button"
                  onClick={onOpenTeamModal}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline">Ekipi & Modulet</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Actions: New Ticket + Quick Role Switcher + Logout */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenNewTicket}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Raporto Problem / Kërkesë</span>
              <span className="sm:hidden">Raporto</span>
            </button>

            {/* Quick Role / User Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setSwitcherOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left transition hover:border-slate-300 hover:bg-white"
                title="Ndërro Rolet / Përdoruesin (Testim i Shpejtë)"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                  style={{ backgroundColor: currentUser.avatar_color }}
                >
                  {getInitials(currentUser.name)}
                </div>
                <div className="hidden md:block leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900">
                      {currentUser.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${getRoleBadgeClass(
                        currentUser.role
                      )}`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                  <span className="block text-[11px] text-slate-500">
                    {currentUser.department}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {switcherOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Ndërro Përdoruesin (Testim RBAC)
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-0.5">
                    {activeUsers.map((u) => {
                      const isSelected = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            onSwitchUser(u);
                            setSwitcherOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                            style={{ backgroundColor: u.avatar_color }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">
                              {u.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {u.department}
                            </p>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${getRoleBadgeClass(
                              u.role
                            )}`}
                          >
                            {u.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 px-1">
                    {!isSupabaseConfigured && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetDemo();
                          setSwitcherOpen(false);
                        }}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                        title="Rikthe të dhënat fillestare demo"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Rikthe Demo</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        onLogout();
                      }}
                      className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Dil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
