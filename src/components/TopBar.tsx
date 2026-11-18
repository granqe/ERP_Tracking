import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Eye,
  EyeOff,
  Kanban,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { Ticket, User } from '../types';
import {
  formatRelativeAlbanian,
  getInitials,
  getRoleBadgeClass,
} from '../utils/formatters';
import type { AppNotification } from '../utils/notifications';

export type ActiveTab = 'pm_overview' | 'work_board';

interface TopBarProps {
  currentUser: User;
  activeTab: ActiveTab;
  notifications: AppNotification[];
  readNotificationIds: Set<string>;
  onTabChange: (tab: ActiveTab) => void;
  onOpenNewTicket: () => void;
  onOpenTeamModal: () => void;
  onOpenNotificationTicket: (ticket: Ticket, notificationId: string) => void;
  onMarkAllNotificationsRead: () => void;
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeTab,
  notifications,
  readNotificationIds,
  onTabChange,
  onOpenNewTicket,
  onOpenTeamModal,
  onOpenNotificationTicket,
  onMarkAllNotificationsRead,
  onChangePassword,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(
    (n) => !readNotificationIds.has(n.id)
  ).length;

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

          {/* Right Actions: New Ticket + Notifications + User Profile */}
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

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setMenuOpen(false);
                }}
                aria-label="Njoftimet"
                title="Njoftimet"
                className={`${baseBtn} relative w-9 px-0 border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900`}
              >
                <Bell className={iconCls} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Njoftimet
                      </span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                          {unreadCount} të reja
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Shëno të lexuara</span>
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <Bell className="mx-auto h-6 w-6 text-slate-300 mb-2" />
                      <p className="text-xs font-medium text-slate-500">
                        Nuk keni njoftime të reja.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1 max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                      {notifications.map((n) => {
                        const isUnread = !readNotificationIds.has(n.id);
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              onOpenNotificationTicket(n.ticket, n.id);
                            }}
                            className={`w-full text-left px-2.5 py-2.5 rounded-xl transition flex items-start gap-2.5 ${
                              isUnread
                                ? 'bg-blue-50/70 hover:bg-blue-50'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                isUnread ? 'bg-blue-600' : 'bg-transparent'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {n.ticket.code}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {formatRelativeAlbanian(n.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-slate-900 line-clamp-1">
                                {n.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">
                                {n.actor ? `${n.actor.name}: ` : ''}
                                {n.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((v) => !v);
                  setNotifOpen(false);
                }}
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

                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setCurrentPw('');
                        setNewPw('');
                        setConfirmPw('');
                        setShowNewPw(false);
                        setPwError(null);
                        setPwModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                      <span>Ndrysho Fjalëkalimin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
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

      {pwModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Ndrysho Fjalëkalimin
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPwModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPwError(null);
                if (newPw.trim().length < 6) {
                  setPwError(
                    'Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.'
                  );
                  return;
                }
                if (newPw !== confirmPw) {
                  setPwError('Fjalëkalimet e reja nuk përputhen.');
                  return;
                }
                setSavingPw(true);
                try {
                  await onChangePassword(currentPw, newPw);
                  setPwModalOpen(false);
                } catch (err) {
                  setPwError(
                    err instanceof Error
                      ? err.message
                      : 'Gabim gjatë ndryshimit të fjalëkalimit.'
                  );
                } finally {
                  setSavingPw(false);
                }
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fjalëkalimi aktual *
                </label>
                <input
                  required
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Shkruani fjalëkalimin aktual"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fjalëkalimi i ri *
                </label>
                <div className="relative">
                  <input
                    required
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Minimum 6 karaktere"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Konfirmo fjalëkalimin e ri *
                </label>
                <input
                  required
                  type={showNewPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Përsëritni fjalëkalimin e ri"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {pwError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {pwError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPwModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Anulo
                </button>
                <button
                  type="submit"
                  disabled={savingPw}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingPw ? 'Duke ruajtur...' : 'Ruaj Fjalëkalimin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
