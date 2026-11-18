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
  Lock,
  RotateCcw,
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

  // Statusi i fazave llogaritet automatikisht nga tiketat e moduleve të secilës fazë.
  // Vetëm "Përfunduar" ruhet në databazë si miratim zyrtar nga Menaxheri.
  type PhaseDisplayStatus = PhaseStatus | 'Gati për Mbyllje';

  const isBlocking = (t: Ticket) =>
    t.status === 'Bllokuar (Blocked)' ||
    t.priority === 'Kritik (Bllokues)' ||
    t.type === 'Bllokim Procesi (Blocker)';

  const phaseStats = phases.map((phase) => {
    const phaseModules = new Set(
      modules.filter((m) => m.rollout_phase === phase.id).map((m) => m.name)
    );
    const phaseTickets = tickets.filter((t) => phaseModules.has(t.module));
    const total = phaseTickets.length;
    const closed = phaseTickets.filter(
      (t) => t.status === 'Mbyllur (Konfirmuar)'
    ).length;
    const openList = phaseTickets.filter(
      (t) => t.status !== 'Mbyllur (Konfirmuar)'
    );
    const blocked = openList.filter(isBlocking).length;
    const started = phaseTickets.some(
      (t) => t.status !== 'Në Pritje (Backlog)'
    );
    const signedOff = phase.status === 'Përfunduar' && openList.length === 0;
    const reopened = phase.status === 'Përfunduar' && openList.length > 0;

    let status: PhaseDisplayStatus;
    if (signedOff) status = 'Përfunduar';
    else if (total === 0) status = 'Në Pritje';
    else if (blocked > 0) status = 'Bllokuar';
    else if (openList.length === 0) status = 'Gati për Mbyllje';
    else if (started) status = 'Aktiv';
    else status = 'Në Pritje';

    const progress = signedOff
      ? 100
      : total === 0
      ? 0
      : Math.round((closed / total) * 100);

    return {
      phase,
      total,
      closed,
      open: openList.length,
      blocked,
      status,
      progress,
      reopened,
      canClose: total > 0 && openList.length === 0 && !signedOff,
    };
  });

  const phaseBadgeStyle = (status: PhaseDisplayStatus) => {
    switch (status) {
      case 'Përfunduar':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Gati për Mbyllje':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Aktiv':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Bllokuar':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Në Pritje':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const phaseCardStyle = (status: PhaseDisplayStatus) => {
    switch (status) {
      case 'Përfunduar':
        return 'border-emerald-200 bg-emerald-50/30';
      case 'Gati për Mbyllje':
        return 'border-amber-300 bg-amber-50/40';
      case 'Aktiv':
        return 'border-blue-300 bg-blue-50/30';
      case 'Bllokuar':
        return 'border-rose-300 bg-rose-50/40';
      case 'Në Pritje':
        return 'border-slate-200 bg-slate-50/60';
    }
  };

  const phaseBarStyle = (status: PhaseDisplayStatus) =>
    status === 'Bllokuar'
      ? 'bg-rose-500'
      : status === 'Përfunduar'
      ? 'bg-emerald-500'
      : status === 'Gati për Mbyllje'
      ? 'bg-amber-500'
      : 'bg-blue-600';

  const handleClosePhase = (phase: RolloutPhase) => {
    if (
      window.confirm(
        `Konfirmoni mbylljen zyrtare të fazës "${phase.title}"?`
      )
    ) {
      onUpdatePhase(phase.id, 'Përfunduar', 100);
    }
  };

  const handleReopenPhase = (phase: RolloutPhase, progress: number) => {
    if (window.confirm(`Rihapni fazën "${phase.title}"?`)) {
      onUpdatePhase(phase.id, 'Aktiv', progress);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tiketa të Hapura
            </span>
            <div className="rounded-xl bg-slate-100 p-1.5 sm:p-2 text-slate-700 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {openTickets.length}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
            Nga {tickets.length} gjithsej në sistem
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700">
              Bllokime Kritike
            </span>
            <div className="rounded-xl bg-rose-100 p-1.5 sm:p-2 text-rose-700 shrink-0">
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-rose-700">
            {criticalBlockers.length}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-rose-600">
            Kërkojnë vëmendje të menjëhershme
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Në Pritje të Programerit
            </span>
            <div className="rounded-xl bg-blue-50 p-1.5 sm:p-2 text-blue-700 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {waitingForDev.length}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
            Në pritje ose aktualisht në punë
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-800">
              Gati për Konfirmim (UAT)
            </span>
            <div className="rounded-xl bg-amber-100 p-1.5 sm:p-2 text-amber-800 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-amber-900">
            {readyForUat.length}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-amber-700">
            Duke pritur testimin nga Stafi
          </p>
        </div>
      </div>

      {/* Executive Rollout Pipeline Stepper */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Rrugëtimi i Migrimit të ERP-së (Pipeline)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Statusi dhe përparimi llogariten automatikisht nga tiketat e
              moduleve të secilës fazë
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {phaseStats.map((ps) => {
            const { phase } = ps;
            const closeStatus: PhaseDisplayStatus = ps.status;
            return (
              <div
                key={phase.id}
                className={`rounded-xl border p-3.5 flex flex-col justify-between transition ${phaseCardStyle(
                  closeStatus
                )}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold leading-none ${phaseBadgeStyle(
                        closeStatus
                      )}`}
                    >
                      {closeStatus}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {ps.progress}%
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {phase.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    {phase.description}
                  </p>
                </div>

                <div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${phaseBarStyle(
                        closeStatus
                      )}`}
                      style={{ width: `${ps.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1 text-[10px] text-slate-500">
                    <span>
                      {ps.total === 0
                        ? 'Pa tiketa'
                        : `${ps.closed}/${ps.total} të mbyllura`}
                    </span>
                    {ps.blocked > 0 && (
                      <span className="font-semibold text-rose-600">
                        {ps.blocked} bllokime
                      </span>
                    )}
                  </div>
                  {ps.reopened && (
                    <p className="mt-1 text-[10px] font-semibold text-amber-700">
                      U rihap: ka tiketa të reja të hapura
                    </p>
                  )}

                  {closeStatus === 'Përfunduar' ? (
                    <button
                      type="button"
                      onClick={() => handleReopenPhase(phase, ps.progress)}
                      className="mt-2.5 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Rihap Fazën</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!ps.canClose}
                      onClick={() => handleClosePhase(phase)}
                      title={
                        ps.canClose
                          ? 'Mbyll zyrtarisht fazën'
                          : 'Lejohet kur të gjitha tiketat e fazës janë mbyllur'
                      }
                      className="mt-2.5 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Mbyll Fazën</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
