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
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenNewTicket: () => void;
  onOpenTeamModal: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onOpenNewTicket,
  onOpenTeamModal,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-10 xl:px-14">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-3">
          {/* Brand + Nav */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-5">
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

          {/* Right Actions: New Ticket + User Profile + Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onOpenNewTicket}
              className={`${baseBtn} bg-blue-600 px-2.5 sm:px-3 font-semibold text-white shadow-xs hover:bg-blue-700`}
            >
              <Plus className={iconCls} />
              <span className="hidden sm:inline">Raporto Problem</span>
              <span className="sm:hidden">Raporto</span>
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={`${baseBtn} gap-1.5 sm:gap-2 border border-slate-200 bg-white pl-1 pr-2 text-left hover:border-slate-300 hover:bg-slate-50`}
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

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: currentUser.avatar_color }}
                    >
                      {getInitials(currentUser.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {currentUser.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        @{currentUser.username}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${getRoleBadgeClass(
                            currentUser.role
                          )}`}
                        >
                          {currentUser.role}
                        </span>
                        {currentUser.department && (
                          <span className="truncate text-[11px] text-slate-500">
                            {currentUser.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Dil nga llogaria</span>
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
