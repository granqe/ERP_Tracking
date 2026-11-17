import React from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type {
  ErpModule,
  PhaseStatus,
  RolloutPhase,
  Ticket,
  User,
} from '../types';
import { daysBetween, getPriorityBadgeClass } from '../utils/formatters';

interface PmDashboardProps {
  tickets: Ticket[];
  users: User[];
  modules: ErpModule[];
  phases: RolloutPhase[];
  onOpenTicket: (ticket: Ticket) => void;
  onFilterByModule: (moduleName: string) => void;
  onUpdatePhase: (phaseId: number, status: PhaseStatus, progress: number) => void;
}

export const PmDashboard: React.FC<PmDashboardProps> = ({
  tickets,
  users,
  modules,
  phases,
  onOpenTicket,
  onFilterByModule,
  onUpdatePhase,
}) => {
  const openTickets = tickets.filter(
    (t) => t.status !== 'Mbyllur (Konfirmuar)'
  );
  const criticalBlockers = openTickets.filter(
    (t) =>
      t.priority === 'Kritik (Bllokues)' ||
      t.status === 'Bllokuar (Blocked)' ||
      t.type === 'Bllokim Procesi (Blocker)'
  );
  const waitingForDev = openTickets.filter(
    (t) =>
      t.status === 'Në Pritje (Backlog)' || t.status === 'Në Punë (In Progress)'
  );
  const readyForUat = openTickets.filter(
    (t) => t.status === 'Kryer nga Programeri (Gati për Testim)'
  );

  // Bottleneck 1: Module with most unresolved blockers
  const moduleStats = modules.map((mod) => {
    const modTickets = tickets.filter((t) => t.module === mod.name);
    const closed = modTickets.filter(
      (t) => t.status === 'Mbyllur (Konfirmuar)'
    ).length;
    const blockedOrCritical = modTickets.filter(
      (t) =>
        t.status !== 'Mbyllur (Konfirmuar)' &&
        (t.status === 'Bllokuar (Blocked)' ||
          t.priority === 'Kritik (Bllokues)')
    ).length;
    const open = modTickets.length - closed;
    const healthPct =
      modTickets.length === 0
        ? 100
        : Math.round((closed / modTickets.length) * 100);
    return {
      module: mod,
      total: modTickets.length,
      closed,
      open,
      blockedOrCritical,
      healthPct,
    };
  });

  const mostBlockedModule = [...moduleStats].sort(
    (a, b) => b.blockedOrCritical - a.blockedOrCritical || b.open - a.open
  )[0];

  // Bottleneck 2: Developer workload
  const developers = users.filter((u) => u.role === 'Programer' && u.active);
  const devWorkload = developers.map((dev) => {
    const activeCount = openTickets.filter(
      (t) =>
        t.assigned_to === dev.id &&
        t.status !== 'Kryer nga Programeri (Gati për Testim)'
    ).length;
    return { dev, activeCount };
  });
  const overloadedDev = [...devWorkload].sort(
    (a, b) => b.activeCount - a.activeCount
  )[0];

  // Bottleneck 3: Stalled / Critical untouched tasks
  const stalledTasks = [...openTickets]
    .filter(
      (t) =>
        daysBetween(t.updated_at) >= 2 ||
        t.priority === 'Kritik (Bllokues)' ||
        t.status === 'Bllokuar (Blocked)'
    )
    .sort(
      (a, b) => daysBetween(b.updated_at) - daysBetween(a.updated_at)
    );

  const oldestStalled = stalledTasks[0];

  const phaseBadgeStyle = (status: PhaseStatus) => {
    switch (status) {
      case 'Përfunduar':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Aktiv':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Bllokuar':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Në Pritje':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tiketa të Hapura
            </span>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {openTickets.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Nga {tickets.length} gjithsej në sistem
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Bllokime Kritike
            </span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-rose-700">
            {criticalBlockers.length}
          </p>
          <p className="mt-1 text-xs text-rose-600">
            Kërkojnë vëmendje të menjëhershme
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Në Pritje të Programerit
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {waitingForDev.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Në pritje ose aktualisht në punë
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Gati për Konfirmim (UAT)
            </span>
            <div className="rounded-xl bg-amber-100 p-2 text-amber-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-900">
            {readyForUat.length}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Duke pritur testimin nga Stafi
          </p>
        </div>
      </div>

      {/* Executive Rollout Pipeline Stepper */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Rrugëtimi i Migrimit të ERP-së (Pipeline)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klikoni statusin e çdo faze për ta përditësuar drejtpërdrejt nga
              pamja e menaxherit
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {phases.map((phase) => (
            <div
              key={phase.id}
              className={`rounded-xl border p-3.5 flex flex-col justify-between transition ${
                phase.status === 'Bllokuar'
                  ? 'border-rose-300 bg-rose-50/40'
                  : phase.status === 'Përfunduar'
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : phase.status === 'Aktiv'
                  ? 'border-blue-300 bg-blue-50/30'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <select
                    value={phase.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as PhaseStatus;
                      const nextProgress =
                        nextStatus === 'Përfunduar'
                          ? 100
                          : nextStatus === 'Në Pritje'
                          ? 15
                          : phase.progress;
                      onUpdatePhase(phase.id, nextStatus, nextProgress);
                    }}
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold focus:outline-none ${phaseBadgeStyle(
                      phase.status
                    )}`}
                  >
                    <option value="Përfunduar">Përfunduar</option>
                    <option value="Aktiv">Aktiv</option>
                    <option value="Bllokuar">Bllokuar</option>
                    <option value="Në Pritje">Në Pritje</option>
                  </select>
                  <span className="text-xs font-bold text-slate-700">
                    {phase.progress}%
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 leading-snug">
                  {phase.title}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  {phase.description}
                </p>
              </div>

              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    phase.status === 'Bllokuar'
                      ? 'bg-rose-500'
                      : phase.status === 'Përfunduar'
                      ? 'bg-emerald-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottleneck Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-700">
            <ShieldAlert className="h-4 w-4" />
            <span>Moduli më i Bllokuar</span>
          </div>
          <p className="mt-2 text-base font-bold text-slate-900">
            {mostBlockedModule?.module.name || 'Asnjë'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {mostBlockedModule
              ? `${mostBlockedModule.blockedOrCritical} bllokime/kritike • ${mostBlockedModule.open} të hapura`
              : 'Të gjitha modulet janë të pastra'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <UserCheck className="h-4 w-4" />
            <span>Programeri më i Ngarkuar</span>
          </div>
          <p className="mt-2 text-base font-bold text-slate-900">
            {overloadedDev ? overloadedDev.dev.name : 'Pa caktuar'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {overloadedDev
              ? `${overloadedDev.activeCount} detyra aktive në radhë`
              : 'Nuk ka programerë aktivë'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <Flame className="h-4 w-4 text-orange-600" />
            <span>Çështja më e Vjetër pa Lëvizje</span>
          </div>
          <p className="mt-2 truncate text-base font-bold text-slate-900">
            {oldestStalled
              ? `${oldestStalled.code} — ${daysBetween(
                  oldestStalled.updated_at
                )} ditë`
              : 'Asnjë vonesë'}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {oldestStalled ? oldestStalled.title : 'Të gjitha punët po ecin'}
          </p>
        </div>
      </div>

      {/* Bottom Grid: Module Health + Stalled Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module Health */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Shëndeti sipas Modulit të ERP-së
          </h3>
          <div className="space-y-4">
            {moduleStats.map((stat) => (
              <button
                key={stat.module.id}
                type="button"
                onClick={() => onFilterByModule(stat.module.name)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                    {stat.module.name}
                  </span>
                  <span className="text-slate-500">
                    {stat.closed}/{stat.total} mbyllur
                    {stat.blockedOrCritical > 0 && (
                      <span className="ml-1.5 font-semibold text-rose-600">
                        ({stat.blockedOrCritical} bllokime)
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stat.blockedOrCritical > 0
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${stat.healthPct}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stalled Tasks Alert List */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>Detyrat e Ngecura & Bllokimet Kritike</span>
            </h3>
            <span className="text-xs text-slate-500">
              {stalledTasks.length} raste
            </span>
          </div>

          <div className="space-y-2.5">
            {stalledTasks.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                Nuk ka asnjë detyrë të ngecur aktualisht.
              </p>
            ) : (
              stalledTasks.slice(0, 6).map((t) => {
                const dev = users.find((u) => u.id === t.assigned_to);
                const untouchedDays = daysBetween(t.updated_at);
                return (
                  <div
                    key={t.id}
                    onClick={() => onOpenTicket(t)}
                    className="cursor-pointer rounded-xl border border-slate-200 p-3.5 transition hover:border-blue-300 hover:bg-slate-50/70 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-slate-900">
                          {t.code}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${getPriorityBadgeClass(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                        <span className="text-[11px] font-medium text-rose-700">
                          • {untouchedDays} ditë pa lëvizje
                        </span>
                      </div>
                      <p className="truncate text-sm font-medium text-slate-800">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t.module} •{' '}
                        {dev ? `Programer: ${dev.name}` : 'Pa caktuar'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
