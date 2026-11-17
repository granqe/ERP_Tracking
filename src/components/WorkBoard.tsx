import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Kanban,
  LayoutList,
  Lock,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
} from '../types';
import type {
  ErpModule,
  Ticket,
  TicketFilters,
  TicketPriority,
  TicketStatus,
  User,
} from '../types';
import {
  formatAlbanianDate,
  getInitials,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  getTypeBadgeClass,
} from '../utils/formatters';

interface WorkBoardProps {
  currentUser: User;
  visibleTickets: Ticket[];
  users: User[];
  modules: ErpModule[];
  filters: TicketFilters;
  onFiltersChange: (next: TicketFilters) => void;
  onOpenTicket: (ticket: Ticket) => void;
  onStatusChange: (ticket: Ticket, newStatus: TicketStatus) => void;
  onOpenResolveModal: (ticket: Ticket) => void;
  onOpenBlockModal: (ticket: Ticket) => void;
  onOpenRejectUatModal: (ticket: Ticket) => void;
  onAssignDeveloper: (ticketId: string, developerId: string | null) => void;
  onOverridePriority: (ticketId: string, priority: TicketPriority) => void;
  onSetDeadline: (ticketId: string, deadline: string | null) => void;
}

export const WorkBoard: React.FC<WorkBoardProps> = ({
  currentUser,
  visibleTickets,
  users,
  modules,
  filters,
  onFiltersChange,
  onOpenTicket,
  onStatusChange,
  onOpenResolveModal,
  onOpenBlockModal,
  onOpenRejectUatModal,
  onAssignDeveloper,
  onOverridePriority,
  onSetDeadline,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const developers = users.filter((u) => u.role === 'Programer' && u.active);
  const isPm = currentUser.role === 'Menaxher';
  const isDev = currentUser.role === 'Programer';
  const isStaff = currentUser.role === 'Staf';

  const filteredTickets = visibleTickets.filter((t) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.module && t.module !== filters.module) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.reporterId && t.created_by !== filters.reporterId) return false;
    if (filters.developerId) {
      if (filters.developerId === 'UNASSIGNED' && t.assigned_to !== null)
        return false;
      if (
        filters.developerId !== 'UNASSIGNED' &&
        t.assigned_to !== filters.developerId
      )
        return false;
    }
    return true;
  });

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.module ||
      filters.status ||
      filters.type ||
      filters.priority ||
      filters.reporterId ||
      filters.developerId
  );

  const clearFilters = () =>
    onFiltersChange({
      search: '',
      module: '',
      status: '',
      type: '',
      priority: '',
      reporterId: '',
      developerId: '',
    });

  const renderStaffUatBanner = (ticket: Ticket) => {
    if (
      !isStaff ||
      ticket.created_by !== currentUser.id ||
      ticket.status !== 'Kryer nga Programeri (Gati për Testim)'
    ) {
      return null;
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5"
      >
        <span className="text-[11px] font-semibold text-amber-900">
          Gati për testimin tuaj:
        </span>
        <button
          type="button"
          onClick={() => onStatusChange(ticket, 'Mbyllur (Konfirmuar)')}
          className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Konfirmo & Mbyll</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenRejectUatModal(ticket)}
          className="flex items-center gap-1 rounded-md border border-amber-400 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Kthe përsëri (Nuk punon)</span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Role Isolation / Workspace Banner */}
      <div
        className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
          isStaff
            ? 'border-teal-200 bg-teal-50/70 text-teal-900'
            : isDev
            ? 'border-blue-200 bg-blue-50/70 text-blue-900'
            : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs sm:text-sm">
          <Lock className="h-4 w-4 shrink-0 opacity-75" />
          <span>
            {isStaff && (
              <>
                <strong>Izolimi i Stafit Aktiv:</strong> Po shihni vetëm
                tiketat e raportuara nga ju (
                <span className="font-semibold">{currentUser.name}</span>).
                Raportimet e kolegëve të tjerë janë të fshehura.
              </>
            )}
            {isDev && (
              <>
                <strong>Hapësira e Programerit:</strong> Detyrat e caktuara për
                ju dhe detyrat e pacaktuara, të renditura sipas bllokimeve dhe
                prioritetit.
              </>
            )}
            {isPm && (
              <>
                <strong>Pamja e Menaxherit (Akses i Plotë):</strong> Mund të
                caktoni programerë, të ndryshoni prioritete dhe të vendosni
                afate.
              </>
            )}
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
              viewMode === 'list'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
              viewMode === 'kanban'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              placeholder="Kërko sipas titullit ose kodit (p.sh. ERP-101)..."
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={filters.module}
            onChange={(e) =>
              onFiltersChange({ ...filters, module: e.target.value })
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Të gjitha Modulet</option>
            {modules.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              onFiltersChange({ ...filters, status: e.target.value })
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Të gjitha Statuset</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) =>
              onFiltersChange({ ...filters, type: e.target.value })
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Të gjitha Llojet</option>
            {TICKET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) =>
              onFiltersChange({ ...filters, priority: e.target.value })
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Të gjitha Prioritetet</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {isPm && (
            <>
              <select
                value={filters.reporterId}
                onChange={(e) =>
                  onFiltersChange({ ...filters, reporterId: e.target.value })
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Të gjithë Raportuesit</option>
                {users
                  .filter((u) => u.role === 'Staf' || u.role === 'Menaxher')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>

              <select
                value={filters.developerId}
                onChange={(e) =>
                  onFiltersChange({ ...filters, developerId: e.target.value })
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Të gjithë Programerët</option>
                <option value="UNASSIGNED">Pa caktuar</option>
                {developers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              <span>Pastro</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>
              Po shfaqen <strong>{filteredTickets.length}</strong> nga{' '}
              <strong>{visibleTickets.length}</strong> tiketa të dukshme për ju
            </span>
          </div>
        </div>
      </div>

      {/* Content View: LIST or KANBAN */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Nuk u gjet asnjë tiketë me këto filtra.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Provoni të pastroni filtrat ose hapni një raportim të ri.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Tiketa</th>
                  <th className="py-3 px-3">Raportuesi</th>
                  <th className="py-3 px-3">Moduli & Lloji</th>
                  <th className="py-3 px-3">Prioriteti</th>
                  <th className="py-3 px-3">Statusi</th>
                  <th className="py-3 px-3">Programeri</th>
                  <th className="py-3 px-3">Afati</th>
                  <th className="py-3 px-4 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTickets.map((t) => {
                  const reporter = users.find((u) => u.id === t.created_by);
                  const dev = users.find((u) => u.id === t.assigned_to);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onOpenTicket(t)}
                      className="cursor-pointer transition hover:bg-slate-50/80"
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold text-white">
                            {t.code}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900 leading-snug">
                          {t.title}
                        </p>
                        {t.blocker_reason && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-rose-700 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t.blocker_reason}</span>
                          </p>
                        )}
                        {renderStaffUatBanner(t)}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {reporter ? (
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-xs"
                              style={{ backgroundColor: reporter.avatar_color }}
                            >
                              {getInitials(reporter.name)}
                            </span>
                            <div className="leading-tight">
                              <p className="text-xs font-semibold text-slate-900">
                                {reporter.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {reporter.department}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            I panjohur
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-800">
                          {t.module}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${getTypeBadgeClass(
                            t.type
                          )}`}
                        >
                          {t.type}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-3 whitespace-nowrap"
                        onClick={(e) => isPm && e.stopPropagation()}
                      >
                        {isPm ? (
                          <select
                            value={t.priority}
                            onChange={(e) =>
                              onOverridePriority(
                                t.id,
                                e.target.value as TicketPriority
                              )
                            }
                            className={`rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none ${getPriorityBadgeClass(
                              t.priority
                            )}`}
                          >
                            {TICKET_PRIORITIES.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-block rounded-lg px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(
                              t.priority
                            )}`}
                          >
                            {t.priority}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            t.status
                          )}`}
                        >
                          {t.status}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-3 whitespace-nowrap"
                        onClick={(e) => isPm && e.stopPropagation()}
                      >
                        {isPm ? (
                          <select
                            value={t.assigned_to || ''}
                            onChange={(e) =>
                              onAssignDeveloper(t.id, e.target.value || null)
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">Pa caktuar</option>
                            {developers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        ) : dev ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                              style={{ backgroundColor: dev.avatar_color }}
                            >
                              {getInitials(dev.name)}
                            </span>
                            <span className="text-xs font-medium text-slate-700">
                              {dev.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Pa caktuar
                          </span>
                        )}
                      </td>

                      <td
                        className="py-3.5 px-3 whitespace-nowrap"
                        onClick={(e) => isPm && e.stopPropagation()}
                      >
                        {isPm ? (
                          <input
                            type="date"
                            value={t.deadline || ''}
                            onChange={(e) =>
                              onSetDeadline(t.id, e.target.value || null)
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs text-slate-600">
                            {formatAlbanianDate(t.deadline)}
                          </span>
                        )}
                      </td>

                      <td
                        className="py-3.5 px-4 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(isDev || isPm) &&
                        t.status !== 'Mbyllur (Konfirmuar)' &&
                        t.status !==
                          'Kryer nga Programeri (Gati për Testim)' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === 'Në Pritje (Backlog)' && (
                              <button
                                type="button"
                                onClick={() =>
                                  onStatusChange(t, 'Në Punë (In Progress)')
                                }
                                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                              >
                                Fillo
                              </button>
                            )}
                            {t.status !== 'Bllokuar (Blocked)' && (
                              <button
                                type="button"
                                onClick={() => onOpenBlockModal(t)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Bllokuar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenResolveModal(t)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                            >
                              Konfirmo Kryerjen
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenTicket(t)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Detajet
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {TICKET_STATUSES.map((statusCol) => {
            const colTickets = filteredTickets.filter(
              (t) => t.status === statusCol
            );
            return (
              <div
                key={statusCol}
                className="w-80 shrink-0 rounded-2xl border border-slate-200 bg-slate-100/80 p-3 flex flex-col max-h-[75vh]"
              >
                <div className="flex items-center justify-between gap-2 px-1 pb-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(
                      statusCol
                    )}`}
                  >
                    {statusCol}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">
                    {colTickets.length}
                  </span>
                </div>

                <div className="space-y-2.5 overflow-y-auto custom-scrollbar pr-1">
                  {colTickets.map((t) => {
                    const dev = users.find((u) => u.id === t.assigned_to);
                    return (
                      <div
                        key={t.id}
                        onClick={() => onOpenTicket(t)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-blue-400 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {t.code}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${getPriorityBadgeClass(
                              t.priority
                            )}`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug mb-2">
                          {t.title}
                        </h4>

                        <p className="text-[11px] font-medium text-slate-500 mb-2">
                          {t.module}
                        </p>

                        {t.blocker_reason && (
                          <div className="mb-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-800">
                            <strong>Bllokuar:</strong> {t.blocker_reason}
                          </div>
                        )}

                        {renderStaffUatBanner(t)}

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          {dev ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white"
                                style={{ backgroundColor: dev.avatar_color }}
                              >
                                {getInitials(dev.name)}
                              </span>
                              <span className="text-[11px] text-slate-600">
                                {dev.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Pa caktuar
                            </span>
                          )}

                          {(isDev || isPm) &&
                            t.status !== 'Mbyllur (Konfirmuar)' &&
                            t.status !==
                              'Kryer nga Programeri (Gati për Testim)' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenResolveModal(t);
                                }}
                                className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                              >
                                Konfirmo Kryerjen
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
