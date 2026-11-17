import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  addComment,
  assignTicket,
  createTicket,
  loadAllData,
  overridePriority,
  resetLocalDemoData,
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

const SESSION_USER_KEY = 'erp_tracker_session_user_id';

const EMPTY_FILTERS: TicketFilters = {
  search: '',
  module: '',
  status: '',
  type: '',
  priority: '',
  reporterId: '',
  developerId: '',
};

export function App() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<ErpModule[]>([]);
  const [phases, setPhases] = useState<RolloutPhase[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    localStorage.getItem(SESSION_USER_KEY)
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('pm_overview');
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);

  // Modals & Drawers
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
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
      const data = await loadAllData();
      setUsers(data.users);
      setModules(data.modules);
      setPhases(data.phases);
      setTickets(data.tickets);
      setEvents(data.events);
    } catch (err) {
      console.error('Gabim gjatë ngarkimit të të dhënave:', err);
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

  const handleResetDemo = () => {
    const data = resetLocalDemoData();
    setUsers(data.users);
    setModules(data.modules);
    setPhases(data.phases);
    setTickets(data.tickets);
    setEvents(data.events);
    setSelectedTicketId(null);
    showToast('Të dhënat demo u rikthyen në gjendjen fillestare.');
  };

  // RBAC Visible Tickets
  const visibleTickets = useMemo(() => {
    if (!currentUser) return [];
    return getVisibleTicketsForUser(tickets, currentUser);
  }, [tickets, currentUser]);

  const selectedTicket = useMemo(
    () => visibleTickets.find((t) => t.id === selectedTicketId) || null,
    [visibleTickets, selectedTicketId]
  );

  // Actions
  const handleCreateTicket = async (input: {
    title: string;
    description: string;
    type: TicketType;
    module: string;
    priority: TicketPriority;
  }) => {
    if (!currentUser) return;
    const { ticket, event } = await createTicket(input, currentUser, tickets);
    setTickets((prev) => [ticket, ...prev]);
    setEvents((prev) => [event, ...prev]);
    showToast(`Tiketa ${ticket.code} u raportua me sukses!`);
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
    userInput: Omit<User, 'id' | 'created_at'> & { id?: string }
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
    showToast(`Faza ${phaseId} u përditësua në "${status}".`);
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

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLoginOrSwitch} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar
        currentUser={currentUser}
        allUsers={users}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSwitchUser={handleLoginOrSwitch}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onResetDemo={handleResetDemo}
        onLogout={handleLogout}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
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
          users={users}
          modules={modules}
          phases={phases}
          onClose={() => setIsTeamModalOpen(false)}
          onSaveUser={handleSaveUser}
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
