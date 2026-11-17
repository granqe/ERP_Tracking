import {
  SEED_EVENTS,
  SEED_MODULES,
  SEED_PHASES,
  SEED_TICKETS,
  SEED_USERS,
} from '../data/seedData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  ErpModule,
  EventType,
  PhaseStatus,
  RolloutPhase,
  Ticket,
  TicketEvent,
  TicketPriority,
  TicketStatus,
  TicketType,
  User,
} from '../types';

const STORAGE_KEYS = {
  users: 'erp_tracker_users_v1',
  modules: 'erp_tracker_modules_v1',
  phases: 'erp_tracker_phases_v1',
  tickets: 'erp_tracker_tickets_v1',
  events: 'erp_tracker_events_v1',
};

export interface AppDataset {
  users: User[];
  modules: ErpModule[];
  phases: RolloutPhase[];
  tickets: Ticket[];
  events: TicketEvent[];
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
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
  if (isSupabaseConfigured && supabase) {
    const [usersRes, modRes, phaseRes, ticketRes, eventRes] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: true }),
      supabase.from('erp_modules').select('*').order('rollout_phase', { ascending: true }),
      supabase.from('rollout_phases').select('*').order('id', { ascending: true }),
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('ticket_events').select('*').order('created_at', { ascending: false }),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (modRes.error) throw modRes.error;
    if (phaseRes.error) throw phaseRes.error;
    if (ticketRes.error) throw ticketRes.error;
    if (eventRes.error) throw eventRes.error;

    return {
      users: (usersRes.data as User[]) ?? [],
      modules: (modRes.data as ErpModule[]) ?? [],
      phases: (phaseRes.data as RolloutPhase[]) ?? [],
      tickets: (ticketRes.data as Ticket[]) ?? [],
      events: (eventRes.data as TicketEvent[]) ?? [],
    };
  }

  return {
    users: readLocal(STORAGE_KEYS.users, SEED_USERS),
    modules: readLocal(STORAGE_KEYS.modules, SEED_MODULES),
    phases: readLocal(STORAGE_KEYS.phases, SEED_PHASES),
    tickets: readLocal(STORAGE_KEYS.tickets, SEED_TICKETS),
    events: readLocal(STORAGE_KEYS.events, SEED_EVENTS),
  };
}

export function subscribeRealtime(onChange: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('erp-tracker-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_events' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_modules' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rollout_phases' }, onChange)
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

export function resetLocalDemoData(): AppDataset {
  writeLocal(STORAGE_KEYS.users, SEED_USERS);
  writeLocal(STORAGE_KEYS.modules, SEED_MODULES);
  writeLocal(STORAGE_KEYS.phases, SEED_PHASES);
  writeLocal(STORAGE_KEYS.tickets, SEED_TICKETS);
  writeLocal(STORAGE_KEYS.events, SEED_EVENTS);
  return {
    users: SEED_USERS,
    modules: SEED_MODULES,
    phases: SEED_PHASES,
    tickets: SEED_TICKETS,
    events: SEED_EVENTS,
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
  const newEvent: TicketEvent = {
    ...event,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('ticket_events')
      .insert(newEvent)
      .select()
      .single();
    if (error) throw error;
    return data as TicketEvent;
  }

  const events = readLocal<TicketEvent[]>(STORAGE_KEYS.events, SEED_EVENTS);
  const updated = [newEvent, ...events];
  writeLocal(STORAGE_KEYS.events, updated);
  return newEvent;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  type: TicketType;
  module: string;
  priority: TicketPriority;
}

export async function createTicket(
  input: CreateTicketInput,
  actor: User,
  existingTickets: Ticket[]
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const nowIso = new Date().toISOString();
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
    assigned_to: null,
    deadline: null,
    blocker_reason: null,
    resolution_note: null,
    resolved_at: null,
    uat_confirmed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('tickets')
      .insert(newTicket)
      .select()
      .single();
    if (error) throw error;
    const ev = await appendEvent({
      ticket_id: (data as Ticket).id,
      actor_id: actor.id,
      event_type: 'created',
      message: `Tiketa u hap nga ${actor.name} (${actor.department}).`,
    });
    return { ticket: data as Ticket, event: ev };
  }

  const tickets = readLocal<Ticket[]>(STORAGE_KEYS.tickets, SEED_TICKETS);
  writeLocal(STORAGE_KEYS.tickets, [newTicket, ...tickets]);
  const ev = await appendEvent({
    ticket_id: newTicket.id,
    actor_id: actor.id,
    event_type: 'created',
    message: `Tiketa u hap nga ${actor.name} (${actor.department}).`,
  });
  return { ticket: newTicket, event: ev };
}

export async function updateTicketFields(
  ticketId: string,
  patch: Partial<Ticket>,
  actor: User,
  eventType: EventType,
  eventMessage: string
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const nowIso = new Date().toISOString();
  const fullPatch = { ...patch, updated_at: nowIso };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
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

  const tickets = readLocal<Ticket[]>(STORAGE_KEYS.tickets, SEED_TICKETS);
  let updatedTicket: Ticket | null = null;
  const nextTickets = tickets.map((t) => {
    if (t.id === ticketId) {
      updatedTicket = { ...t, ...fullPatch };
      return updatedTicket;
    }
    return t;
  });
  if (!updatedTicket) throw new Error('Tiketa nuk u gjet.');
  writeLocal(STORAGE_KEYS.tickets, nextTickets);
  const ev = await appendEvent({
    ticket_id: ticketId,
    actor_id: actor.id,
    event_type: eventType,
    message: eventMessage,
  });
  return { ticket: updatedTicket, event: ev };
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
  userInput: Omit<User, 'id' | 'created_at'> & { id?: string }
): Promise<User> {
  const nowIso = new Date().toISOString();
  const user: User = {
    id: userInput.id ?? generateId(),
    name: userInput.name.trim(),
    email: userInput.email.trim().toLowerCase(),
    role: userInput.role,
    department: userInput.department,
    specialty: userInput.specialty?.trim() || '',
    avatar_color: userInput.avatar_color || '#1d4ed8',
    active: userInput.active,
    created_at: nowIso,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('users')
      .upsert(user)
      .select()
      .single();
    if (error) throw error;
    return data as User;
  }

  const users = readLocal<User[]>(STORAGE_KEYS.users, SEED_USERS);
  const exists = users.some((u) => u.id === user.id);
  const next = exists
    ? users.map((u) => (u.id === user.id ? { ...u, ...user } : u))
    : [...users, user];
  writeLocal(STORAGE_KEYS.users, next);
  return user;
}

export async function upsertErpModule(
  modInput: Omit<ErpModule, 'id' | 'created_at' | 'is_default'> & {
    id?: string;
    is_default?: boolean;
  }
): Promise<ErpModule> {
  const nowIso = new Date().toISOString();
  const mod: ErpModule = {
    id: modInput.id ?? generateId(),
    name: modInput.name.trim(),
    description: modInput.description?.trim() || '',
    rollout_phase: modInput.rollout_phase,
    is_default: modInput.is_default ?? false,
    created_at: nowIso,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('erp_modules')
      .upsert(mod)
      .select()
      .single();
    if (error) throw error;
    return data as ErpModule;
  }

  const mods = readLocal<ErpModule[]>(STORAGE_KEYS.modules, SEED_MODULES);
  const exists = mods.some((m) => m.id === mod.id);
  const next = exists
    ? mods.map((m) => (m.id === mod.id ? { ...m, ...mod } : m))
    : [...mods, mod];
  writeLocal(STORAGE_KEYS.modules, next);
  return mod;
}

export async function updateRolloutPhase(
  phaseId: number,
  status: PhaseStatus,
  progress: number
): Promise<RolloutPhase> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('rollout_phases')
      .update({ status, progress })
      .eq('id', phaseId)
      .select()
      .single();
    if (error) throw error;
    return data as RolloutPhase;
  }

  const phases = readLocal<RolloutPhase[]>(STORAGE_KEYS.phases, SEED_PHASES);
  let updated: RolloutPhase | null = null;
  const next = phases.map((p) => {
    if (p.id === phaseId) {
      updated = { ...p, status, progress };
      return updated;
    }
    return p;
  });
  if (!updated) throw new Error('Faza nuk u gjet.');
  writeLocal(STORAGE_KEYS.phases, next);
  return updated;
}
