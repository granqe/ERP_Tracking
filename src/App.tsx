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
  DEFAULT_EMAIL_SETTINGS,
  deleteDepartment,
  deleteUser,
  loadAllData,
  loadEmailSettings,
  overridePriority,
  saveEmailSettings,
  sendEmailNotification,
  setTicketDeadline,
  subscribeRealtime,
  transitionTicketStatus,
  upsertDepartment,
  upsertErpModule,
  upsertUser,
} from './services/dataService';
import type {
  Department,
  EmailSettings,
  ErpModule,
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
import {
  buildNotificationsForUser,
  getReadNotificationIds,
  saveReadNotificationIds,
} from './utils/notifications';

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [modules, setModules] = useState<ErpModule[]>([]);
  const [phases, setPhases] = useState<RolloutPhase[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(
    DEFAULT_EMAIL_SETTINGS
  );

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
      const [data, loadedEmail] = await Promise.all([
        loadAllData(),
        loadEmailSettings(),
      ]);
      setUsers(data.users);
      setDepartments(data.departments);
      setModules(data.modules);
      setPhases(data.phases);
      setTickets(data.tickets);
      setEvents(data.events);
      setEmailSettings(loadedEmail);
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

  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    () => (currentUserId ? getReadNotificationIds(currentUserId) : new Set())
  );

  useEffect(() => {
    if (currentUserId) {
      setReadNotificationIds(getReadNotificationIds(currentUserId));
    } else {
      setReadNotificationIds(new Set());
    }
  }, [currentUserId]);

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    return buildNotificationsForUser(currentUser, events, visibleTickets, users);
  }, [currentUser, events, visibleTickets, users]);

  const handleOpenNotificationTicket = (
    ticket: Ticket,
    notificationId: string
  ) => {
    if (currentUser) {
      setReadNotificationIds((prev) => {
        const next = new Set(prev);
        next.add(notificationId);
        saveReadNotificationIds(currentUser.id, next);
        return next;
      });
    }
    setActiveTab('work_board');
    setIsTeamModalOpen(false);
    setSelectedTicketId(ticket.id);
  };

  const handleMarkAllNotificationsRead = () => {
    if (!currentUser) return;
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) {
        next.add(n.id);
      }
      saveReadNotificationIds(currentUser.id, next);
      return next;
    });
  };

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

  const sendTicketEmail = useCallback(
    (recipients: string[], ticket: Ticket, subject: string, bodyText: string) => {
      if (!emailSettings.enabled) return;
      const valid = Array.from(
        new Set(recipients.map((r) => r.trim()).filter((r) => r.includes('@')))
      );
      if (valid.length === 0) return;

      const ticketUrl = `${window.location.origin}/tabela?tiketa=${encodeURIComponent(
        ticket.code
      )}`;
      const text = `${bodyText}\n\nTiketa: ${ticket.code} - ${ticket.title}\nModuli: ${ticket.module}\nStatusi: ${ticket.status}\nShiko në sistem: ${ticketUrl}`;
      const html = `<div style="font-family:sans-serif;line-height:1.5;color:#0f172a">
        <p>${bodyText.replace(/\n/g, '<br/>')}</p>
        <p style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px">
          <strong>${ticket.code}</strong> — ${ticket.title}<br/>
          <span style="color:#475569;font-size:13px">Moduli: ${ticket.module} • Statusi: ${ticket.status}</span>
        </p>
        <p><a href="${ticketUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:600">Hap Tiketën</a></p>
      </div>`;

      void sendEmailNotification({ to: valid, subject, text, html });
    },
    [emailSettings.enabled]
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

    const devEmails = assignedDev?.email
      ? [assignedDev.email]
      : users
          .filter((u) => u.role === 'Programer' && u.active && u.email)
          .map((u) => u.email as string);

    sendTicketEmail(
      devEmails,
      ticket,
      `[${ticket.code}] Kërkesë e re: ${ticket.title}`,
      `${currentUser.name} (${currentUser.department}) hapi një kërkesë të re me prioritet "${ticket.priority}".\n\nPërshkrimi: ${ticket.description}`
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

    const reporter = users.find((u) => u.id === ticket.created_by);
    if (reporter?.email && reporter.id !== currentUser.id) {
      sendTicketEmail(
        [reporter.email],
        updated,
        `[${ticket.code}] Ndryshim statusi: ${newStatus}`,
        `${currentUser.name} ndryshoi statusin e kërkesës suaj në "${newStatus}".`
      );
    }
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

    const reporter = users.find((u) => u.id === ticket.created_by);
    if (reporter?.email && reporter.id !== currentUser.id) {
      sendTicketEmail(
        [reporter.email],
        updated,
        `[${ticket.code}] Gati për testim: ${ticket.title}`,
        `${currentUser.name} e përfundoi kërkesën tuaj.\n\nShënimi i zgjidhjes: ${resolutionNote}`
      );
    }
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

    const reporter = users.find((u) => u.id === ticket.created_by);
    if (reporter?.email && reporter.id !== currentUser.id) {
      sendTicketEmail(
        [reporter.email],
        updated,
        `[${ticket.code}] Kërkesa u shënua si Bllokuar`,
        `${currentUser.name} e shënoi kërkesën si të bllokuar.\n\nArsyeja: ${blockerReason}`
      );
    }
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

    const dev = users.find((u) => u.id === updated.assigned_to);
    if (dev?.email && dev.id !== currentUser.id) {
      sendTicketEmail(
        [dev.email],
        updated,
        `[${ticket.code}] Kthyer për rregullim nga testimi`,
        `${currentUser.name} e ktheu tiketën për rishikim.\n\nKomenti: ${reopenComment}`
      );
    }
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

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (currentUser.role === 'Staf') {
      const dev = users.find((u) => u.id === ticket.assigned_to);
      if (dev?.email && dev.id !== currentUser.id) {
        sendTicketEmail(
          [dev.email],
          ticket,
          `[${ticket.code}] Koment i ri nga ${currentUser.name}`,
          `${currentUser.name} shtoi një koment:\n\n"${message}"`
        );
      }
    } else {
      const reporter = users.find((u) => u.id === ticket.created_by);
      if (reporter?.email && reporter.id !== currentUser.id) {
        sendTicketEmail(
          [reporter.email],
          ticket,
          `[${ticket.code}] Koment i ri nga ${currentUser.name}`,
          `${currentUser.name} shtoi një koment në kërkesën tuaj:\n\n"${message}"`
        );
      }
    }
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

  const handleSaveDepartment = async (deptInput: {
    id?: string;
    name: string;
    previousName?: string;
  }) => {
    const saved = await upsertDepartment(deptInput);
    setDepartments((prev) => {
      const exists = prev.some((d) => d.id === saved.id);
      const next = exists
        ? prev.map((d) => (d.id === saved.id ? saved : d))
        : [...prev.filter((d) => !d.id.startsWith('fallback-')), saved];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    if (deptInput.previousName && deptInput.previousName !== saved.name) {
      setUsers((prev) =>
        prev.map((u) =>
          u.department === deptInput.previousName
            ? { ...u, department: saved.name }
            : u
        )
      );
    }
    showToast(`Departamenti "${saved.name}" u ruajt me sukses.`);
  };

  const handleDeleteDepartment = async (deptId: string) => {
    await deleteDepartment(deptId);
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
    showToast('Departamenti u fshi nga sistemi.');
  };

  const handleSaveEmailSettings = async (
    settings: Omit<EmailSettings, 'id' | 'updated_at'>
  ) => {
    const saved = await saveEmailSettings(settings);
    setEmailSettings(saved);
    showToast('Konfigurimi i email-it u ruajt me sukses.');
  };

  const handleSendTestEmail = async (
    toEmail: string,
    config: EmailSettings
  ) => {
    return sendEmailNotification({
      to: toEmail,
      subject: 'Test i Konfigurimit të Email-it — ERP Migrim & Gjurmues',
      text: 'Ky është një email testues nga sistemi ERP Migrim & Gjurmues. Konfigurimi juaj po punon me sukses!',
      testConfig: config,
    });
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
        notifications={notifications}
        readNotificationIds={readNotificationIds}
        onTabChange={setActiveTab}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onOpenNotificationTicket={handleOpenNotificationTicket}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onLogout={handleLogout}
      />

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-10 xl:px-14 py-4 sm:py-6">
        {currentUser.role === 'Menaxher' && activeTab === 'pm_overview' ? (
          <PmDashboard
            tickets={tickets}
            users={users}
            modules={modules}
            onOpenTicket={(t) => setSelectedTicketId(t.id)}
            onFilterByModule={(moduleName) => {
              setFilters({ ...EMPTY_FILTERS, module: moduleName });
              setActiveTab('work_board');
            }}
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
          departments={departments}
          modules={modules}
          phases={phases}
          emailSettings={emailSettings}
          onClose={() => setIsTeamModalOpen(false)}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
          onSaveModule={handleSaveModule}
          onSaveDepartment={handleSaveDepartment}
          onDeleteDepartment={handleDeleteDepartment}
          onSaveEmailSettings={handleSaveEmailSettings}
          onSendTestEmail={handleSendTestEmail}
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
