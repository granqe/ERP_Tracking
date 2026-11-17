import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  RotateCcw,
  Send,
  User as UserIcon,
  X,
} from 'lucide-react';
import { TICKET_PRIORITIES } from '../types';
import type {
  Ticket,
  TicketEvent,
  TicketPriority,
  TicketStatus,
  User,
} from '../types';
import {
  daysBetween,
  formatAlbanianDate,
  formatAlbanianDateTime,
  formatRelativeAlbanian,
  getInitials,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  getTypeBadgeClass,
} from '../utils/formatters';

interface TicketDetailDrawerProps {
  ticket: Ticket | null;
  currentUser: User;
  users: User[];
  events: TicketEvent[];
  onClose: () => void;
  onStatusChange: (ticket: Ticket, newStatus: TicketStatus) => void;
  onOpenResolveModal: (ticket: Ticket) => void;
  onOpenBlockModal: (ticket: Ticket) => void;
  onOpenRejectUatModal: (ticket: Ticket) => void;
  onAssignDeveloper: (ticketId: string, developerId: string | null) => void;
  onOverridePriority: (ticketId: string, priority: TicketPriority) => void;
  onSetDeadline: (ticketId: string, deadline: string | null) => void;
  onAddComment: (ticketId: string, message: string) => Promise<void>;
}

export const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({
  ticket,
  currentUser,
  users,
  events,
  onClose,
  onStatusChange,
  onOpenResolveModal,
  onOpenBlockModal,
  onOpenRejectUatModal,
  onAssignDeveloper,
  onOverridePriority,
  onSetDeadline,
  onAddComment,
}) => {
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  if (!ticket) return null;

  const developers = users.filter((u) => u.role === 'Programer' && u.active);
  const reporter = users.find((u) => u.id === ticket.created_by);
  const assignee = users.find((u) => u.id === ticket.assigned_to);
  const ticketEvents = events
    .filter((e) => e.ticket_id === ticket.id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const isStaffOwner =
    currentUser.role === 'Staf' && ticket.created_by === currentUser.id;
  const isReadyForUat =
    ticket.status === 'Kryer nga Programeri (Gati për Testim)';
  const canDevAct =
    currentUser.role === 'Programer' || currentUser.role === 'Menaxher';
  const isPm = currentUser.role === 'Menaxher';

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await onAddComment(ticket.id, commentText);
      setCommentText('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                {ticket.code}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                  ticket.status
                )}`}
              >
                {ticket.status}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${getPriorityBadgeClass(
                  ticket.priority
                )}`}
              >
                {ticket.priority}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {ticket.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Staff UAT Prompt */}
          {isStaffOwner && isReadyForUat && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    Gati për Testim nga Ju (UAT)
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Programeri e ka shënuar këtë kërkesë si të kryer. Ju lutem
                    testojeni në sistem dhe konfirmoni rezultatin:
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onStatusChange(ticket, 'Mbyllur (Konfirmuar)')
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Konfirmo & Mbyll</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenRejectUatModal(ticket)}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Kthe përsëri (Nuk punon)</span>
                </button>
              </div>
            </div>
          )}

          {/* Blocker Callout */}
          {ticket.blocker_reason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Arsyeja e Bllokimit
                </p>
                <p className="mt-1 text-sm text-rose-900">
                  {ticket.blocker_reason}
                </p>
              </div>
            </div>
          )}

          {/* Developer Resolution Note */}
          {ticket.resolution_note && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Shënimi i Zgjidhjes nga Programeri
                  </p>
                  {ticket.resolved_at && (
                    <span className="text-[11px] text-emerald-700">
                      • {formatAlbanianDateTime(ticket.resolved_at)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-emerald-950">
                  {ticket.resolution_note}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Përshkrimi i Detajuar
            </h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 bg-white">
            <div>
              <span className="block text-[11px] font-medium text-slate-400">
                Moduli i ERP-së
              </span>
              <span className="mt-0.5 inline-block text-sm font-semibold text-slate-900">
                {ticket.module}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400">
                Lloji i Kërkesës
              </span>
              <span
                className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${getTypeBadgeClass(
                  ticket.type
                )}`}
              >
                {ticket.type}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400">
                Raportuesi (Staf)
              </span>
              <div className="mt-1 flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm font-medium text-slate-800">
                  {reporter ? `${reporter.name} (${reporter.department})` : 'I panjohur'}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400">
                Programeri Përgjegjës
              </span>
              {isPm ? (
                <select
                  value={ticket.assigned_to || ''}
                  onChange={(e) =>
                    onAssignDeveloper(ticket.id, e.target.value || null)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Pa caktuar</option>
                  {developers.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} ({dev.specialty || 'Programer'})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="mt-1 inline-block text-sm font-medium text-slate-800">
                  {assignee ? assignee.name : 'Ende pa caktuar'}
                </span>
              )}
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400">
                Afati (Deadline)
              </span>
              {isPm ? (
                <input
                  type="date"
                  value={ticket.deadline || ''}
                  onChange={(e) =>
                    onSetDeadline(ticket.id, e.target.value || null)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{formatAlbanianDate(ticket.deadline)}</span>
                </div>
              )}
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400">
                Krijuar / Përditësuar
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {formatAlbanianDate(ticket.created_at)} (
                  {daysBetween(ticket.updated_at)} ditë pa ndryshim)
                </span>
              </div>
            </div>

            {isPm && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Ndrysho Prioritetin (Vetëm Menaxheri)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TICKET_PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onOverridePriority(ticket.id, p)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                        ticket.priority === p
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Developer / PM Status Workflow Controls */}
          {canDevAct && ticket.status !== 'Mbyllur (Konfirmuar)' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Veprime të Zhvillimit
              </p>
              <div className="flex flex-wrap gap-2">
                {ticket.status !== 'Në Pritje (Backlog)' && (
                  <button
                    type="button"
                    onClick={() =>
                      onStatusChange(ticket, 'Në Pritje (Backlog)')
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Kalo në Pritje
                  </button>
                )}
                {ticket.status !== 'Në Punë (In Progress)' && (
                  <button
                    type="button"
                    onClick={() =>
                      onStatusChange(ticket, 'Në Punë (In Progress)')
                    }
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Fillo Punën
                  </button>
                )}
                {ticket.status !== 'Bllokuar (Blocked)' && (
                  <button
                    type="button"
                    onClick={() => onOpenBlockModal(ticket)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Shëno si Bllokuar
                  </button>
                )}
                {ticket.status !==
                  'Kryer nga Programeri (Gati për Testim)' && (
                  <button
                    type="button"
                    onClick={() => onOpenResolveModal(ticket)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Konfirmo Kryerjen
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Audit Trail & Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-slate-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Historiku i Veprimeve & Komentet ({ticketEvents.length})
              </h3>
            </div>

            <form onSubmit={handlePostComment} className="mb-4 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Shkruani një koment ose sqarim..."
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={posting || !commentText.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Dërgo</span>
              </button>
            </form>

            <div className="space-y-3">
              {ticketEvents.map((ev) => {
                const actor = users.find((u) => u.id === ev.actor_id);
                const isComment = ev.event_type === 'comment';
                return (
                  <div
                    key={ev.id}
                    className={`flex gap-3 rounded-xl p-3 text-xs ${
                      isComment
                        ? 'bg-blue-50/70 border border-blue-100'
                        : 'bg-slate-50 border border-slate-100'
                    }`}
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                      style={{
                        backgroundColor: actor?.avatar_color || '#64748b',
                      }}
                    >
                      {actor ? getInitials(actor.name) : '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          {actor ? actor.name : 'Sistemi'}
                          {isComment && (
                            <span className="ml-1.5 font-normal text-blue-700">
                              komentoi:
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatRelativeAlbanian(ev.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-700 leading-relaxed">
                        {ev.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
