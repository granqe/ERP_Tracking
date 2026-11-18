import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { CreateTicketModal } from './components/CreateTicketModal';
import {
  BlockTicketModal,
  RejectUatModal,
  ResolveTicketModal,
} from './components/DevActionModals';
import { LoginScreen } from './components/LoginScreen';
import { PmDashboard } from './components/PmDashboard';
import { TeamAndModulesModal } from './components/TeamAndModulesModal';
import { TicketDetailDrawer } from './components/TicketDetailDrawer';
import { TopBar } from './components/TopBar';
import type { ActiveTab } from './components/TopBar';
import { WorkBoard } from './components/WorkBoard';
import { checkDatabaseConnection } from './lib/supabase';
import type { DbHealthStatus } from './lib/supabase';
import {
  addComment,
  assignTicket,
  createTicket,
  deleteUser,
  loadAllData,
  overridePriority,
  setTicketDeadline,
  subscribeRealtime,
  transitionTicketStatus,
  updateRolloutPhase,
  upsertErpModule,
  upsertUser,
} from './services/dataService';
import type {
  ErpModule,
  PhaseStatus,
  RolloutPhase,
  Ticket,
  TicketEvent,
  TicketFilters,
  TicketPriority,
  TicketStatus,
  TicketType,
  User,
} from './types';
import { getVisibleTicketsForUser } from './utils/formatters';
import {
  buildUrlFromState,
  EMPTY_TICKET_FILTERS,
  parseUrlState,
} from './utils/urlSync';

const SESSION_USER_KEY = 'erp_tracker_session_user_id';
const EMPTY_FILTERS = EMPTY_TICKET_FILTERS;

export function App() {
  const initialUrlState = useMemo(
    () => parseUrlState(window.location.pathname, window.location.search),
    []
  );

  const [loading, setLoading] = useState(true);
  const [dbHealth, setDbHealth] = useState<DbHealthStatus>({
    configured: false,
    connected: false,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<ErpModule[]>([]);
  const [phases, setPhases] = useState<RolloutPhase[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    localStorage.getItem(SESSION_USER_KEY)
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialUrlState.tab);
  const [filters, setFilters] = useState<TicketFilters>(
    initialUrlState.filters
  );

  // Modals & Drawers
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(
    initialUrlState.teamModalOpen
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [pendingTicketRef, setPendingTicketRef] = useState<string | null>(
    initialUrlState.ticketRef
  );
  const isPoppingHistoryRef = useRef(false);
  const [resolveModalTicket, setResolveModalTicket] = useState<Ticket | null>(
    null
  );
  const [blockModalTicket, setBlockModalTicket] = useState<Ticket | null>(null);
  const [rejectUatTicket, setRejectUatTicket] = useState<Ticket | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const health = await checkDatabaseConnection();
      setDbHealth(health);
      if (!health.connected) {
        return;
      }
      const data = await loadAllData();
      setUsers(data.users);
      setModules(data.modules);
      setPhases(data.phases);
      setTickets(data.tickets);
      setEvents(data.events);
    } catch (err) {
      console.error('Gabim gjatë ngarkimit të të dhënave:', err);
      setDbHealth({
        configured: true,
        connected: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gabim gjatë leximit nga databaza.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const unsub = subscribeRealtime(() => {
      refreshData();
    });
    return unsub;
  }, [refreshData]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId && u.active) || null,
    [users, currentUserId]
  );

  // Ensure activeTab matches user role
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'Menaxher' && activeTab === 'pm_overview') {
      setActiveTab('work_board');
    }
  }, [currentUser, activeTab]);

  const handleLoginOrSwitch = (user: User) => {
    localStorage.setItem(SESSION_USER_KEY, user.id);
    setCurrentUserId(user.id);
    setSelectedTicketId(null);
    setFilters(EMPTY_FILTERS);
    setActiveTab(user.role === 'Menaxher' ? 'pm_overview' : 'work_board');
    showToast(`Hytë si ${user.name} (${user.role})`);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_USER_KEY);
    setCurrentUserId(null);
    setSelectedTicketId(null);
  };

  const handleBootstrapAdmin = async (
    name: string,
    username: string,
    password: string
  ) => {
    const created = await upsertUser({
      name,
      username,
      password,
      role: 'Menaxher',
      department: 'Menaxhim Projekti',
      specialty: 'Superadmin',
      avatar_color: '#0f172a',
      active: true,
    });
    setUsers([created]);
    handleLoginOrSwitch(created);
  };

  // RBAC Visible Tickets
  const visibleTickets = useMemo(() => {
    if (!currentUser) return [];
    return getVisibleTicketsForUser(tickets, currentUser, users);
  }, [tickets, currentUser, users]);

  const selectedTicket = useMemo(
    () => visibleTickets.find((t) => t.id === selectedTicketId) || null,
    [visibleTickets, selectedTicketId]
  );

  // Resolve pending ticket from URL once tickets are loaded
  useEffect(() => {
    if (!pendingTicketRef || visibleTickets.length === 0) return;
    const match = visibleTickets.find(
      (t) => t.code === pendingTicketRef || t.id === pendingTicketRef
    );
    if (match) {
      setSelectedTicketId(match.id);
    }
    setPendingTicketRef(null);
  }, [pendingTicketRef, visibleTickets]);

  // Listen to browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      isPoppingHistoryRef.current = true;
      const parsed = parseUrlState(
        window.location.pathname,
        window.location.search
      );
      setActiveTab(parsed.tab);
      setIsTeamModalOpen(parsed.teamModalOpen);
      setFilters(parsed.filters);
      if (parsed.ticketRef) {
        const match = visibleTickets.find(
          (t) => t.code === parsed.ticketRef || t.id === parsed.ticketRef
        );
        setSelectedTicketId(match ? match.id : null);
      } else {
        setSelectedTicketId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [visibleTickets]);

  // Keep browser URL in sync with active module/tab/filters/ticket
  useEffect(() => {
    if (loading || pendingTicketRef) return;

    const targetUrl = buildUrlFromState({
      currentUser,
      activeTab,
      isTeamModalOpen,
      filters,
      selectedTicket,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (isPoppingHistoryRef.current) {
      isPoppingHistoryRef.current = false;
      if (currentUrl !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
      return;
    }

    if (currentUrl !== targetUrl) {
      const samePath =
        window.location.pathname === targetUrl.split('?')[0];
      const onlySearchChanged =
        samePath && Boolean(filters.search);
      if (onlySearchChanged || currentUrl === '/') {
        window.history.replaceState(null, '', targetUrl);
      } else {
        window.history.pushState(null, '', targetUrl);
      }
    }
  }, [
    loading,
    pendingTicketRef,
    currentUser,
    activeTab,
    isTeamModalOpen,
    filters,
    selectedTicket,
  ]);

  // Actions
  const handleCreateTicket = async (input: {
    title: string;
    description: string;
    type: TicketType;
    module: string;
    priority: TicketPriority;
  }) => {
    if (!currentUser) return;
    const { ticket, event } = await createTicket(
      input,
      currentUser,
      tickets,
      users
    );
    setTickets((prev) => [ticket, ...prev]);
    setEvents((prev) => [event, ...prev]);
    const assignedDev = users.find((u) => u.id === ticket.assigned_to);
    showToast(
      assignedDev
        ? `Tiketa ${ticket.code} u hap dhe iu delegua automatikisht ${assignedDev.name}!`
        : `Tiketa ${ticket.code} u raportua me sukses!`
    );
  };

  const handleStatusChange = async (
    ticket: Ticket,
    newStatus: TicketStatus
  ) => {
    if (!currentUser) return;
    const { ticket: updated, event } = await transitionTicketStatus(
      ticket,
      newStatus,
      currentUser
    );
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEvents((prev) => [event, ...prev]);
    showToast(
      newStatus === 'Mbyllur (Konfirmuar)'
        ? `Tiketa ${ticket.code} u konfirmua dhe u mbyll!`
        : `Statusi i ${ticket.code} u ndryshua në "${newStatus}".`
    );
  };

  const handleConfirmResolve = async (
    ticket: Ticket,
    resolutionNote: string
  ) => {
    if (!currentUser) return;
    const { ticket: updated, event } = await transitionTicketStatus(
      ticket,
      'Kryer nga Programeri (Gati për Testim)',
      currentUser,
      { resolutionNote }
    );
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEvents((prev) => [event, ...prev]);
    showToast(
      `Tiketa ${ticket.code} u dërgua për testim (UAT) te raportuesi.`
    );
  };

  const handleConfirmBlock = async (ticket: Ticket, blockerReason: string) => {
    if (!currentUser) return;
    const { ticket: updated, event } = await transitionTicketStatus(
      ticket,
      'Bllokuar (Blocked)',
      currentUser,
      { blockerReason }
    );
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEvents((prev) => [event, ...prev]);
    showToast(`Tiketa ${ticket.code} u shënua si Bllokuar.`);
  };

  const handleRejectUat = async (ticket: Ticket, reopenComment: string) => {
    if (!currentUser) return;
    const { ticket: updated, event } = await transitionTicketStatus(
      ticket,
      'Në Pritje (Backlog)',
      currentUser,
      { reopenComment }
    );
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEvents((prev) => [event, ...prev]);
    showToast(`Tiketa ${ticket.code} u kthye te programeri për rishikim.`);
  };

  const handleAssignDeveloper = async (
    ticketId: string,
    developerId: string | null
  ) => {
    if (!currentUser) return;
    const dev = users.find((u) => u.id === developerId) || null;
    const { ticket: updated, event } = await assignTicket(
      ticketId,
      dev,
      currentUser
    );
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEvents((prev) => [event, ...prev]);
    showToast(
      dev
        ? `Detyra iu caktua programerit ${dev.name}.`
        : 'Caktimi i programerit u hoq.'
    );
  };

  const handleOverridePriority = async (
    ticketId: string,
    priority: TicketPriority
  ) => {
    if (!currentUser) return;
    const { ticket: updated, event } = await overridePriority(
      ticketId,
      priority,
      currentUser
    );
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEvents((prev) => [event, ...prev]);
    showToast(`Prioriteti u përditësua në "${priority}".`);
  };

  const handleSetDeadline = async (
    ticketId: string,
    deadline: string | null
  ) => {
    if (!currentUser) return;
    const { ticket: updated, event } = await setTicketDeadline(
      ticketId,
      deadline,
      currentUser
    );
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEvents((prev) => [event, ...prev]);
    showToast('Afati u përditësua.');
  };

  const handleAddComment = async (ticketId: string, message: string) => {
    if (!currentUser) return;
    const ev = await addComment(ticketId, message, currentUser);
    setEvents((prev) => [ev, ...prev]);
  };

  const handleSaveUser = async (
    userInput: Omit<User, 'id' | 'created_at' | 'password_hash'> & {
      id?: string;
      password?: string;
      password_hash?: string;
    }
  ) => {
    const saved = await upsertUser(userInput);
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === saved.id);
      return exists
        ? prev.map((u) => (u.id === saved.id ? saved : u))
        : [...prev, saved];
    });
    showToast(`Përdoruesi ${saved.name} u ruajt me sukses.`);
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast('Përdoruesi u fshi nga sistemi.');
  };

  const handleSaveModule = async (
    modInput: Omit<ErpModule, 'id' | 'created_at' | 'is_default'> & {
      id?: string;
      is_default?: boolean;
    }
  ) => {
    const saved = await upsertErpModule(modInput);
    setModules((prev) => {
      const exists = prev.some((m) => m.id === saved.id);
      return exists
        ? prev.map((m) => (m.id === saved.id ? saved : m))
        : [...prev, saved];
    });
    showToast(`Moduli "${saved.name}" u ruajt me sukses.`);
  };

  const handleUpdatePhase = async (
    phaseId: number,
    status: PhaseStatus,
    progress: number
  ) => {
    const updated = await updateRolloutPhase(phaseId, status, progress);
    setPhases((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    showToast(
      status === 'Përfunduar'
        ? `Faza ${phaseId} u mbyll zyrtarisht.`
        : `Faza ${phaseId} u rihap.`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">
          Duke ngarkuar ERP Migration & Bug Tracker...
        </p>
      </div>
    );
  }

  if (!currentUser || !dbHealth.connected) {
    return (
      <LoginScreen
        users={users}
        dbHealth={dbHealth}
        onRetryConnection={() => {
          setLoading(true);
          refreshData();
        }}
        onLogin={handleLoginOrSwitch}
        onBootstrapAdmin={handleBootstrapAdmin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-10 xl:px-14 py-4 sm:py-6">
        {currentUser.role === 'Menaxher' && activeTab === 'pm_overview' ? (
          <PmDashboard
            tickets={tickets}
            users={users}
            modules={modules}
            phases={phases}
            onOpenTicket={(t) => setSelectedTicketId(t.id)}
            onFilterByModule={(moduleName) => {
              setFilters({ ...EMPTY_FILTERS, module: moduleName });
              setActiveTab('work_board');
            }}
            onUpdatePhase={handleUpdatePhase}
          />
        ) : (
          <WorkBoard
            currentUser={currentUser}
            visibleTickets={visibleTickets}
            users={users}
            modules={modules}
            filters={filters}
            onFiltersChange={setFilters}
            onOpenTicket={(t) => setSelectedTicketId(t.id)}
            onStatusChange={handleStatusChange}
            onOpenResolveModal={(t) => setResolveModalTicket(t)}
            onOpenBlockModal={(t) => setBlockModalTicket(t)}
            onOpenRejectUatModal={(t) => setRejectUatTicket(t)}
            onAssignDeveloper={handleAssignDeveloper}
            onOverridePriority={handleOverridePriority}
            onSetDeadline={handleSetDeadline}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <CreateTicketModal
        isOpen={isNewTicketOpen}
        modules={modules}
        onClose={() => setIsNewTicketOpen(false)}
        onSubmit={handleCreateTicket}
      />

      <TicketDetailDrawer
        ticket={selectedTicket}
        currentUser={currentUser}
        users={users}
        events={events}
        onClose={() => setSelectedTicketId(null)}
        onStatusChange={handleStatusChange}
        onOpenResolveModal={(t) => setResolveModalTicket(t)}
        onOpenBlockModal={(t) => setBlockModalTicket(t)}
        onOpenRejectUatModal={(t) => setRejectUatTicket(t)}
        onAssignDeveloper={handleAssignDeveloper}
        onOverridePriority={handleOverridePriority}
        onSetDeadline={handleSetDeadline}
        onAddComment={handleAddComment}
      />

      <ResolveTicketModal
        ticket={resolveModalTicket}
        onClose={() => setResolveModalTicket(null)}
        onConfirm={handleConfirmResolve}
      />

      <BlockTicketModal
        ticket={blockModalTicket}
        onClose={() => setBlockModalTicket(null)}
        onConfirm={handleConfirmBlock}
      />

      <RejectUatModal
        ticket={rejectUatTicket}
        onClose={() => setRejectUatTicket(null)}
        onConfirm={handleRejectUat}
      />

      {currentUser.role === 'Menaxher' && (
        <TeamAndModulesModal
          isOpen={isTeamModalOpen}
          currentUserId={currentUser.id}
          users={users}
          modules={modules}
          phases={phases}
          onClose={() => setIsTeamModalOpen(false)}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
          onSaveModule={handleSaveModule}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
