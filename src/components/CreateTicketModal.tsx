import React, { useState } from 'react';
import { AlertCircle, PlusCircle, X } from 'lucide-react';
import { TICKET_PRIORITIES, TICKET_TYPES } from '../types';
import type {
  Department,
  ErpModule,
  TicketPriority,
  TicketType,
} from '../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  modules: ErpModule[];
  departments?: Department[];
  allowDepartmentSelect?: boolean;
  defaultDepartment?: string;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    type: TicketType;
    module: string;
    priority: TicketPriority;
    department?: string;
  }) => Promise<void>;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  modules,
  departments = [],
  allowDepartmentSelect = false,
  defaultDepartment = '',
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>('Bug / Gabim Teknik');
  const [moduleName, setModuleName] = useState(
    modules[0]?.name || 'Financa & TVSH'
  );
  const [department, setDepartment] = useState(
    defaultDepartment || departments[0]?.name || ''
  );
  const [priority, setPriority] = useState<TicketPriority>('Mesatar');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Ju lutem plotësoni titullin dhe përshkrimin e detajuar.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        title,
        description,
        type,
        module: moduleName,
        priority,
        department: allowDepartmentSelect
          ? department || defaultDepartment || undefined
          : undefined,
      });
      setTitle('');
      setDescription('');
      setType('Bug / Gabim Teknik');
      setPriority('Mesatar');
      setDepartment(defaultDepartment || departments[0]?.name || '');
      onClose();
    } catch {
      setError('Ndodhi një gabim gjatë ruajtjes së tiketës. Provoni përsëri.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Raporto Problem / Kërkesë të Re
              </h2>
              <p className="text-xs text-slate-500">
                Plotësoni të dhënat për ekipin teknik dhe menaxhimin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Titulli i Kërkesës / Problemit *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p.sh. Gabim në llogaritjen e TVSH-së gjatë eksportit nga QuickBooks"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lloji i Kërkesës *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {TICKET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Moduli i ERP-së *
              </label>
              <select
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {allowDepartmentSelect && departments.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Departamenti Përgjegjës
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {Array.from(
                  new Set([
                    ...departments.map((d) => d.name),
                    ...(department ? [department] : []),
                  ])
                ).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Prioriteti *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TICKET_PRIORITIES.map((p) => {
                const selected = priority === p;
                const isCritical = p === 'Kritik (Bllokues)';
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      selected
                        ? isCritical
                          ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                          : 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Përshkrimi i detajuar *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shkruani hapat për të riprodhuar gabimin, rezultatin e pritur ose skedarin CSV përkatës..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Anulo
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Duke dërguar...' : 'Dërgo Raportimin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
