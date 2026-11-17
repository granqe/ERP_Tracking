import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Kanban,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
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

  // Stil i unifikuar për të gjithë butonat e shiritit
  const btnCore =
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';
  const baseBtn = `${btnCore} h-9`;
  const tabBtn = (active: boolean) =>
    `${btnCore} h-7 ${
      active
        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
        : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
    }`;
  const iconCls = 'h-4 w-4 shrink-0';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand + Nav */}
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
              </div>
              <span className="hidden whitespace-nowrap text-sm font-bold leading-none text-slate-900 lg:inline">
                ERP Migrim & Gjurmues
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {currentUser.role === 'Menaxher' && (
                <button
                  type="button"
                  onClick={() => onTabChange('pm_overview')}
                  className={`${tabBtn(activeTab === 'pm_overview')}`}
                  title="Pamja e Menaxherit"
                >
                  <LayoutDashboard className={iconCls} />
                  <span className="hidden md:inline">Pamja e Menaxherit</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onTabChange('work_board')}
                className={`${tabBtn(activeTab === 'work_board')}`}
              >
                <Kanban className={iconCls} />
                <span className="hidden sm:inline">
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
                  className={`${tabBtn(false)}`}
                  title="Përdoruesit & Modulet"
                >
                  <Users className={iconCls} />
                  <span className="hidden md:inline">Përdoruesit & Modulet</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Actions: New Ticket + User Switcher + Logout */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenNewTicket}
              className={`${baseBtn} bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700`}
            >
              <Plus className={iconCls} />
              <span className="hidden sm:inline">Raporto Problem</span>
              <span className="sm:hidden">Raporto</span>
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setSwitcherOpen((v) => !v)}
                className={`${baseBtn} gap-2 border border-slate-200 bg-white pl-1 pr-2 text-left hover:border-slate-300 hover:bg-slate-50`}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                  style={{ backgroundColor: currentUser.avatar_color }}
                >
                  {getInitials(currentUser.name)}
                </span>
                <span className="hidden text-sm font-semibold text-slate-900 md:inline">
                  {currentUser.name}
                </span>
                <span
                  className={`hidden rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none md:inline ${getRoleBadgeClass(
                    currentUser.role
                  )}`}
                >
                  {currentUser.role}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </button>

              {switcherOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Ndërro Llogarinë
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

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        onLogout();
                      }}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
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
