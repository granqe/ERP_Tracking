import { supabase } from '../lib/supabase';
import { hashPassword } from '../utils/auth';
import { DEPARTMENTS } from '../types';
import type {
  Department,
  EmailSettings,
  ErpModule,
  EventType,
  Ticket,
  TicketEvent,
  TicketPriority,
  TicketStatus,
  TicketType,
  User,
} from '../types';

export interface AppDataset {
  users: User[];
  departments: Department[];
  modules: ErpModule[];
  tickets: Ticket[];
  events: TicketEvent[];
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Baza e të dhënave Supabase nuk është e konfiguruar. Vendosni VITE_SUPABASE_URL dhe VITE_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function loadAllData(): Promise<AppDataset> {
  const client = requireSupabase();

  const [usersRes, deptRes, modRes, ticketRes, eventRes] = await Promise.all([
    client.from('users').select('*').order('created_at', { ascending: true }),
    client.from('departments').select('*').order('name', { ascending: true }),
    client.from('erp_modules').select('*').order('name', { ascending: true }),
    client
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false }),
    client
      .from('ticket_events')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (modRes.error) throw modRes.error;
  if (ticketRes.error) throw ticketRes.error;
  if (eventRes.error) throw eventRes.error;

  const loadedUsers = (usersRes.data as User[]) ?? [];
  let loadedDepartments: Department[] = [];

  if (deptRes.error) {
    // Fallback nëse tabela departments nuk është krijuar ende në databazë
    const uniqueNames = Array.from(
      new Set([
        ...DEPARTMENTS,
        ...loadedUsers.map((u) => u.department).filter(Boolean),
      ])
    );
    loadedDepartments = uniqueNames.map((name, idx) => ({
      id: `fallback-${idx}`,
      name,
      created_at: new Date().toISOString(),
    }));
  } else {
    loadedDepartments = (deptRes.data as Department[]) ?? [];
  }

  return {
    users: loadedUsers,
    departments: loadedDepartments,
    modules: (modRes.data as ErpModule[]) ?? [],
    tickets: (ticketRes.data as Ticket[]) ?? [],
    events: (eventRes.data as TicketEvent[]) ?? [],
  };
}

export function subscribeRealtime(onChange: () => void): () => void {
  if (!supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('erp-tracker-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_events' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_modules' }, onChange)
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

function nextTicketCode(tickets: Ticket[]): string {
  const maxNum = tickets.reduce((max, t) => {
    const match = t.code.match(/ERP-(\d+)/);
    const num = match ? parseInt(match[1], 10) : 100;
    return Math.max(max, num);
  }, 100);
  return `ERP-${maxNum + 1}`;
}

async function appendEvent(
  event: Omit<TicketEvent, 'id' | 'created_at'>
): Promise<TicketEvent> {
  const client = requireSupabase();
  const newEvent: TicketEvent = {
    ...event,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('ticket_events')
    .insert(newEvent)
    .select()
    .single();
  if (error) throw error;
  return data as TicketEvent;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  type: TicketType;
  module: string;
  priority: TicketPriority;
  department?: string | null;
}

export async function createTicket(
  input: CreateTicketInput,
  actor: User,
  existingTickets: Ticket[],
  allUsers: User[] = []
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const client = requireSupabase();
  const nowIso = new Date().toISOString();
  const activeDevelopers = allUsers.filter(
    (u) => u.role === 'Programer' && u.active
  );
  const autoAssignee =
    activeDevelopers.length === 1 ? activeDevelopers[0] : null;

  const newTicket: Ticket = {
    id: generateId(),
    code: nextTicketCode(existingTickets),
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    module: input.module,
    priority: input.priority,
    status: 'Në Pritje (Backlog)',
    created_by: actor.id,
    assigned_to: autoAssignee ? autoAssignee.id : null,
    department: (input.department ?? actor.department) || null,
    deadline: null,
    blocker_reason: null,
    resolution_note: null,
    resolved_at: null,
    uat_confirmed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await client
    .from('tickets')
    .insert(newTicket)
    .select()
    .single();
  if (error) throw error;

  const ev = await appendEvent({
    ticket_id: (data as Ticket).id,
    actor_id: actor.id,
    event_type: 'created',
    message: autoAssignee
      ? `Tiketa u hap nga ${actor.name} (${actor.department}) dhe iu delegua automatikisht programerit ${autoAssignee.name}.`
      : `Tiketa u hap nga ${actor.name} (${actor.department}).`,
  });
  return { ticket: data as Ticket, event: ev };
}

export async function updateTicketFields(
  ticketId: string,
  patch: Partial<Ticket>,
  actor: User,
  eventType: EventType,
  eventMessage: string
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const client = requireSupabase();
  const nowIso = new Date().toISOString();
  const fullPatch = { ...patch, updated_at: nowIso };

  const { data, error } = await client
    .from('tickets')
    .update(fullPatch)
    .eq('id', ticketId)
    .select()
    .single();
  if (error) throw error;

  const ev = await appendEvent({
    ticket_id: ticketId,
    actor_id: actor.id,
    event_type: eventType,
    message: eventMessage,
  });
  return { ticket: data as Ticket, event: ev };
}

export async function transitionTicketStatus(
  ticket: Ticket,
  newStatus: TicketStatus,
  actor: User,
  options?: {
    blockerReason?: string;
    resolutionNote?: string;
    reopenComment?: string;
  }
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const nowIso = new Date().toISOString();
  const patch: Partial<Ticket> = { status: newStatus };
  let eventType: EventType = 'status_change';
  let message = `${actor.name} ndryshoi statusin në "${newStatus}".`;

  if (newStatus === 'Bllokuar (Blocked)') {
    const reason = options?.blockerReason?.trim() || 'Pa arsye të specifikuar';
    patch.blocker_reason = reason;
    eventType = 'blocked';
    message = `${actor.name} e shënoi si Bllokuar: ${reason}`;
  } else if (newStatus === 'Kryer nga Programeri (Gati për Testim)') {
    const note = options?.resolutionNote?.trim() || 'U zgjidh nga programeri.';
    patch.resolution_note = note;
    patch.resolved_at = nowIso;
    patch.blocker_reason = null;
    eventType = 'resolved';
    message = `${actor.name} e shënoi si Kryer (Gati për Testim): ${note}`;
  } else if (newStatus === 'Mbyllur (Konfirmuar)') {
    patch.uat_confirmed_at = nowIso;
    eventType = 'uat_approved';
    message = `${actor.name} konfirmoi testimin (UAT) dhe e mbylli tiketën.`;
  } else if (
    ticket.status === 'Kryer nga Programeri (Gati për Testim)' &&
    newStatus === 'Në Pritje (Backlog)' &&
    options?.reopenComment
  ) {
    eventType = 'uat_rejected';
    message = `${actor.name} e ktheu përsëri (Nuk punon): ${options.reopenComment.trim()}`;
  } else if (newStatus === 'Në Punë (In Progress)') {
    patch.blocker_reason = null;
  }

  return updateTicketFields(ticket.id, patch, actor, eventType, message);
}

export async function assignTicket(
  ticketId: string,
  developer: User | null,
  actor: User
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const msg = developer
    ? `${actor.name} ia caktoi detyrën programerit ${developer.name}.`
    : `${actor.name} e hoqi caktimin e programerit.`;
  return updateTicketFields(
    ticketId,
    { assigned_to: developer ? developer.id : null },
    actor,
    'assigned',
    msg
  );
}

export async function overridePriority(
  ticketId: string,
  priority: TicketPriority,
  actor: User
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  return updateTicketFields(
    ticketId,
    { priority },
    actor,
    'priority_change',
    `${actor.name} ndryshoi prioritetin në "${priority}".`
  );
}

export async function setTicketDeadline(
  ticketId: string,
  deadline: string | null,
  actor: User
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const msg = deadline
    ? `${actor.name} vendosi afatin: ${deadline}.`
    : `${actor.name} hoqi afatin e tiketës.`;
  return updateTicketFields(
    ticketId,
    { deadline },
    actor,
    'deadline_change',
    msg
  );
}

export async function setTicketDepartment(
  ticketId: string,
  department: string | null,
  actor: User
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const cleanDept = department?.trim() || null;
  const msg = cleanDept
    ? `${actor.name} caktoi departamentin përgjegjës: ${cleanDept}.`
    : `${actor.name} riktheu departamentin sipas raportuesit.`;
  return updateTicketFields(
    ticketId,
    { department: cleanDept },
    actor,
    'assigned',
    msg
  );
}

export async function setTicketModule(
  ticketId: string,
  moduleName: string,
  actor: User
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const cleanMod = moduleName.trim();
  const msg = `${actor.name} ndryshoi modulin e ERP-së në "${cleanMod}".`;
  return updateTicketFields(
    ticketId,
    { module: cleanMod },
    actor,
    'status_change',
    msg
  );
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('tickets').delete().eq('id', ticketId);
  if (error) throw error;
}

export async function addComment(
  ticketId: string,
  text: string,
  actor: User
): Promise<TicketEvent> {
  return appendEvent({
    ticket_id: ticketId,
    actor_id: actor.id,
    event_type: 'comment',
    message: text.trim(),
  });
}

export async function upsertUser(
  userInput: Omit<User, 'id' | 'created_at' | 'password_hash'> & {
    id?: string;
    password?: string;
    password_hash?: string;
  }
): Promise<User> {
  const client = requireSupabase();
  const nowIso = new Date().toISOString();

  let passwordHash = userInput.password_hash;
  if (userInput.password && userInput.password.trim()) {
    passwordHash = await hashPassword(userInput.password);
  }
  if (!passwordHash) {
    throw new Error('Fjalëkalimi është i detyrueshëm për përdoruesin e ri.');
  }

  const user = {
    id: userInput.id ?? generateId(),
    name: userInput.name.trim(),
    username: userInput.username.trim().toLowerCase(),
    password_hash: passwordHash,
    role: userInput.role,
    department: userInput.department,
    specialty: userInput.specialty?.trim() || '',
    email: userInput.email?.trim() || null,
    avatar_color: userInput.avatar_color || '#1d4ed8',
    active: userInput.active,
    created_at: nowIso,
  };

  const { data, error } = await client
    .from('users')
    .upsert(user)
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

export async function deleteUser(userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('users').delete().eq('id', userId);
  if (error) throw error;
}

export async function upsertErpModule(modInput: {
  id?: string;
  name: string;
  description?: string;
  previousName?: string;
  is_default?: boolean;
}): Promise<ErpModule> {
  const client = requireSupabase();
  const cleanName = modInput.name.trim();
  const cleanDesc = modInput.description?.trim() || '';

  if (modInput.id) {
    const { data, error } = await client
      .from('erp_modules')
      .update({ name: cleanName, description: cleanDesc })
      .eq('id', modInput.id)
      .select()
      .single();
    if (error) throw error;

    if (modInput.previousName && modInput.previousName !== cleanName) {
      await client
        .from('tickets')
        .update({ module: cleanName })
        .eq('module', modInput.previousName);
    }
    return data as ErpModule;
  }

  const nowIso = new Date().toISOString();
  const mod = {
    id: generateId(),
    name: cleanName,
    description: cleanDesc,
    rollout_phase: 1,
    is_default: modInput.is_default ?? false,
    created_at: nowIso,
  };

  const { data, error } = await client
    .from('erp_modules')
    .insert(mod)
    .select()
    .single();
  if (error) throw error;
  return data as ErpModule;
}

export async function deleteErpModule(modId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('erp_modules').delete().eq('id', modId);
  if (error) throw error;
}

export async function upsertDepartment(deptInput: {
  id?: string;
  name: string;
  previousName?: string;
}): Promise<Department> {
  const client = requireSupabase();
  const cleanName = deptInput.name.trim();
  const isRealId = Boolean(deptInput.id && !deptInput.id.startsWith('fallback-'));

  if (isRealId && deptInput.id) {
    const { data, error } = await client
      .from('departments')
      .update({ name: cleanName })
      .eq('id', deptInput.id)
      .select()
      .single();
    if (error) throw error;

    if (deptInput.previousName && deptInput.previousName !== cleanName) {
      await client
        .from('users')
        .update({ department: cleanName })
        .eq('department', deptInput.previousName);
    }
    return data as Department;
  }

  const dept: Department = {
    id: generateId(),
    name: cleanName,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('departments')
    .insert(dept)
    .select()
    .single();
  if (error) throw error;
  return data as Department;
}

export async function deleteDepartment(deptId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('departments').delete().eq('id', deptId);
  if (error) throw error;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  id: 'default',
  enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  imap_host: '',
  imap_port: 993,
  email_user: '',
  email_pass: '',
  from_name: 'ERP Migrim & Gjurmues',
};

export async function loadEmailSettings(): Promise<EmailSettings> {
  if (!supabase) return DEFAULT_EMAIL_SETTINGS;
  const { data, error } = await supabase
    .from('email_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) return DEFAULT_EMAIL_SETTINGS;
  return data as EmailSettings;
}

export async function saveEmailSettings(
  settings: Omit<EmailSettings, 'id' | 'updated_at'>
): Promise<EmailSettings> {
  const client = requireSupabase();
  const payload: EmailSettings = {
    id: 'default',
    enabled: settings.enabled,
    smtp_host: settings.smtp_host.trim(),
    smtp_port: Number(settings.smtp_port) || 587,
    smtp_secure: settings.smtp_secure,
    imap_host: settings.imap_host.trim(),
    imap_port: Number(settings.imap_port) || 993,
    email_user: settings.email_user.trim(),
    email_pass: settings.email_pass,
    from_name: settings.from_name.trim() || 'ERP Migrim & Gjurmues',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('email_settings')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as EmailSettings;
}

export async function sendEmailNotification(payload: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  testConfig?: EmailSettings;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        error: json.error || `Gabim HTTP ${res.status}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gabim në rrjet.',
    };
  }
}
