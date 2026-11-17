import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, X } from 'lucide-react';
import type { Ticket } from '../types';

interface ResolveTicketModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onConfirm: (ticket: Ticket, resolutionNote: string) => Promise<void>;
}

export const ResolveTicketModal: React.FC<ResolveTicketModalProps> = ({
  ticket,
  onClose,
  onConfirm,
}) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await onConfirm(ticket, note);
      setNote('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Konfirmo Kryerjen ({ticket.code})
              </h3>
              <p className="text-xs text-slate-500">
                Tiketa do të kalojë në statusin "Gati për Testim (UAT)"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-800">{ticket.title}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Shënimi i Zgjidhjes (Çfarë u rregullua, Commit/PR, ose udhëzime testimi) *
            </label>
            <textarea
              required
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="p.sh. U rregullua formula e rrumbullakimit të TVSH-së (PR #52). Testojeni me një faturë me zbritje 15%."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Anulo
            </button>
            <button
              type="submit"
              disabled={saving || !note.trim()}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Duke ruajtur...' : 'Konfirmo Kryerjen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BlockTicketModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onConfirm: (ticket: Ticket, reason: string) => Promise<void>;
}

export const BlockTicketModal: React.FC<BlockTicketModalProps> = ({
  ticket,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await onConfirm(ticket, reason);
      setReason('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Shëno si Bllokuar ({ticket.code})
              </h3>
              <p className="text-xs text-slate-500">
                Specifikoni se çfarë po prisni që të zhbllokohet puna
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Arsyeja e Bllokimit / Çfarë po prisni? *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="p.sh. Duke pritur nga Financa shembullin e CSV-së ose sqarimin për formulën e TVSH-së..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Anulo
            </button>
            <button
              type="submit"
              disabled={saving || !reason.trim()}
              className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {saving ? 'Duke ruajtur...' : 'Shëno si Bllokuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RejectUatModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onConfirm: (ticket: Ticket, comment: string) => Promise<void>;
}

export const RejectUatModal: React.FC<RejectUatModalProps> = ({
  ticket,
  onClose,
  onConfirm,
}) => {
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await onConfirm(ticket, comment);
      setComment('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Kthe përsëri — Nuk punon ({ticket.code})
              </h3>
              <p className="text-xs text-slate-500">
                Shpjegoni çfarë nuk funksionoi gjatë testimit tuaj (UAT)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Komenti i Testimit *
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="p.sh. E testova me faturën e degës Durrës por NIPT-i del ende bosh në PDF..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Anulo
            </button>
            <button
              type="submit"
              disabled={saving || !comment.trim()}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? 'Duke dërguar...' : 'Kthe te Programeri'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
