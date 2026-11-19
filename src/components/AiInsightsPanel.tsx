import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Sparkles,
  Wrench,
  Activity,
  FileSearch,
} from 'lucide-react';
import type { ErpModule, Ticket, User } from '../types';

type AnalysisMode = 'overview' | 'technical' | 'blockers' | 'single_ticket';

const LOCAL_GEMINI_KEY_STORAGE = 'erp_tracker_gemini_api_key';

interface AiInsightsPanelProps {
  currentUser: User;
  tickets: Ticket[];
  users: User[];
  modules: ErpModule[];
  onOpenTicket: (ticket: Ticket) => void;
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderFormattedAnalysis(markdown: string) {
  const lines = markdown.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={`${keyPrefix}-list`}
        className="space-y-1.5 pl-4 list-disc text-sm text-slate-700 leading-relaxed"
      >
        {listItems.map((item, i) => (
          <li key={i}>{renderInlineFormatting(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`empty-${idx}`);
      return;
    }

    if (line.startsWith('### ')) {
      flushList(`h3-${idx}`);
      blocks.push(
        <h4
          key={`h3-${idx}`}
          className="pt-2 text-sm font-bold text-slate-900"
        >
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      return;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushList(`h2-${idx}`);
      const title = line.startsWith('## ') ? line.slice(3) : line.slice(2);
      blocks.push(
        <h3
          key={`h2-${idx}`}
          className="pt-3 first:pt-0 text-base font-bold text-slate-900 border-b border-slate-100 pb-1"
        >
          {renderInlineFormatting(title)}
        </h3>
      );
      return;
    }

    if (/^[-*•]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*•]\s+/, ''));
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      listItems.push(line.replace(/^\d+\.\s+/, ''));
      return;
    }

    flushList(`p-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="text-sm text-slate-700 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  flushList('end');
  return blocks;
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({
  currentUser,
  tickets,
  users,
  modules,
  onOpenTicket,
}) => {
  const [mode, setMode] = useState<AnalysisMode>(
    currentUser.role === 'Programer' ? 'technical' : 'overview'
  );
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(
    tickets[0]?.id || ''
  );
  const [customQuestion, setCustomQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [savedApiKey, setSavedApiKey] = useState<string>(
    () => localStorage.getItem(LOCAL_GEMINI_KEY_STORAGE) || ''
  );
  const [keyDraft, setKeyDraft] = useState(savedApiKey);

  const scopedTickets = useMemo(() => {
    if (mode === 'single_ticket') {
      const found = tickets.find((t) => t.id === selectedTicketId);
      return found ? [found] : [];
    }
    let list = tickets;
    if (selectedModule) {
      list = list.filter((t) => t.module === selectedModule);
    }
    if (mode === 'blockers') {
      list = list.filter(
        (t) =>
          t.status === 'Bllokuar (Blocked)' ||
          t.priority === 'Kritik (Bllokues)' ||
          t.type === 'Bllokim Procesi (Blocker)'
      );
    }
    return list;
  }, [tickets, mode, selectedModule, selectedTicketId]);

  const stats = useMemo(() => {
    const base = selectedModule
      ? tickets.filter((t) => t.module === selectedModule)
      : tickets;
    return {
      total: base.length,
      open: base.filter((t) => t.status !== 'Mbyllur (Konfirmuar)').length,
      blocked: base.filter((t) => t.status === 'Bllokuar (Blocked)').length,
      critical: base.filter(
        (t) =>
          t.priority === 'Kritik (Bllokues)' &&
          t.status !== 'Mbyllur (Konfirmuar)'
      ).length,
      readyForUat: base.filter(
        (t) => t.status === 'Kryer nga Programeri (Gati për Testim)'
      ).length,
      closed: base.filter((t) => t.status === 'Mbyllur (Konfirmuar)').length,
    };
  }, [tickets, selectedModule]);

  const handleSaveKey = () => {
    const trimmed = keyDraft.trim();
    if (trimmed) {
      localStorage.setItem(LOCAL_GEMINI_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(LOCAL_GEMINI_KEY_STORAGE);
    }
    setSavedApiKey(trimmed);
    setShowKeyConfig(false);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const payloadTickets = scopedTickets.map((t) => {
        const reporter = users.find((u) => u.id === t.created_by);
        const assignee = users.find((u) => u.id === t.assigned_to);
        return {
          code: t.code,
          title: t.title,
          description: t.description,
          module: t.module,
          type: t.type,
          priority: t.priority,
          status: t.status,
          department: t.department || reporter?.department || '',
          assignee: assignee?.name || '',
          deadline: t.deadline,
          blocker_reason: t.blocker_reason,
          resolution_note: t.resolution_note,
          created_at: t.created_at,
          updated_at: t.updated_at,
        };
      });

      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          userRole: currentUser.role,
          customQuestion: customQuestion.trim() || undefined,
          apiKey: savedApiKey || undefined,
          stats,
          tickets: payloadTickets,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        analysis?: string;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.analysis) {
        throw new Error(
          json.error || `Gabim gjatë analizës me AI (HTTP ${res.status}).`
        );
      }

      setAnalysis(json.analysis);
      setGeneratedAt(
        new Date().toLocaleTimeString('sq-AL', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ndodhi një gabim gjatë lidhjes me Gemini AI.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedTicketObj =
    mode === 'single_ticket'
      ? tickets.find((t) => t.id === selectedTicketId) || null
      : null;

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Analiza & Rekomandime me Gemini AI
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Analizoni ecurinë e migrimit, identifikoni rreziqet dhe merrni
                hapa të thjeshtë e praktikë për zgjidhjen e problemeve.
              </p>
            </div>
          </div>

          {currentUser.role === 'Menaxher' && (
            <button
              type="button"
              onClick={() => {
                setKeyDraft(savedApiKey);
                setShowKeyConfig((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              <span>Konfiguro API Key</span>
            </button>
          )}
        </div>

        {showKeyConfig && currentUser.role === 'Menaxher' && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2.5">
            <p className="text-xs text-slate-700">
              Për siguri maksimale (dhe qasje për të gjithë menaxherët dhe
              programerët), rekomandohet të vendosni{' '}
              <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-slate-900">
                GEMINI_API_KEY
              </code>{' '}
              te <strong>Vercel → Settings → Environment Variables</strong>.
              Për testim të menjëhershëm mund ta ruani çelësin edhe lokalisht
              këtu:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="Vendosni Gemini API Key..."
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Ruaj Lokalisht
              </button>
            </div>
          </div>
        )}

        {/* Mini KPI Row */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">Gjithsej</p>
            <p className="text-lg font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-blue-700">Aktive</p>
            <p className="text-lg font-bold text-blue-900">{stats.open}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-rose-700">Bllokuar</p>
            <p className="text-lg font-bold text-rose-900">{stats.blocked}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-amber-800">Kritike</p>
            <p className="text-lg font-bold text-amber-950">{stats.critical}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-indigo-700">
              Për Testim
            </p>
            <p className="text-lg font-bold text-indigo-950">
              {stats.readyForUat}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-emerald-700">
              Të Mbyllura
            </p>
            <p className="text-lg font-bold text-emerald-900">{stats.closed}</p>
          </div>
        </div>
      </div>

      {/* Controls & Prompt Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Zgjidhni llojin e analizës
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                id: 'overview' as const,
                label: 'Ecuria & Përmbledhja',
                desc: 'Pasqyrë e plotë dhe prioritete',
                icon: Activity,
              },
              {
                id: 'technical' as const,
                label: 'Zgjidhje Teknike',
                desc: 'Hapa konkretë për programerin',
                icon: Wrench,
              },
              {
                id: 'blockers' as const,
                label: 'Bllokimet & Kritiket',
                desc: 'Plan urgjent për zhbllokim',
                icon: AlertTriangle,
              },
              {
                id: 'single_ticket' as const,
                label: 'Tiketë Specifike',
                desc: 'Analizë e thellë për 1 tiketë',
                icon: FileSearch,
              },
            ].map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      active ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        active ? 'text-blue-900' : 'text-slate-800'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {mode === 'single_ticket' ? (
            <div className="lg:col-span-5">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Zgjidhni Tiketën
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.title} ({t.module})
                    </option>
                  ))}
                </select>
                {selectedTicketObj && (
                  <button
                    type="button"
                    onClick={() => onOpenTicket(selectedTicketObj)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
                  >
                    Hap
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Filtro sipas Modulit (opsional)
              </label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Të gjitha Modulet ({tickets.length})</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            className={
              mode === 'single_ticket' ? 'lg:col-span-7' : 'lg:col-span-8'
            }
          >
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pyetje ose udhëzim shtesë për AI (opsional)
            </label>
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="p.sh. Cilat 3 probleme duhen zgjidhur të parat këtë javë?"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500">
            Do të analizohen{' '}
            <strong className="text-slate-800">{scopedTickets.length}</strong>{' '}
            tiketa me Gemini AI.
          </p>
          <button
            type="button"
            disabled={loading || scopedTickets.length === 0}
            onClick={handleAnalyze}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Duke analizuar me Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Gjenero Analizën me AI</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Raporti i Analizës AI
              </h2>
              {generatedAt && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  Gjeneruar në {generatedAt}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>U kopjua</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Kopjo</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2.5">{renderFormattedAnalysis(analysis)}</div>
        </div>
      )}
    </div>
  );
};
