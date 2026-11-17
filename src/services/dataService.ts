import { supabase } from '../lib/supabase';
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

export interface AppDataset {
  users: User[];
  modules: ErpModule[];
  phases: RolloutPhase[];
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

  const [usersRes, modRes, phaseRes, ticketRes, eventRes] = await Promise.all([
    client.from('users').select('*').order('created_at', { ascending: true }),
    client.from('erp_modules').select('*').order('rollout_phase', { ascending: true }),
    client.from('rollout_phases').select('*').order('id', { ascending: true }),
    client.from('tickets').select('*').order('created_at', { ascending: false }),
    client.from('ticket_events').select('*').order('created_at', { ascending: false }),
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

export function subscribeRealtime(onChange: () => void): () => void {
  if (!supabase) {
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
}

export async function createTicket(
  input: CreateTicketInput,
  actor: User,
  existingTickets: Ticket[]
): Promise<{ ticket: Ticket; event: TicketEvent }> {
  const client = requireSupabase();
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
    message: `Tiketa u hap nga ${actor.name} (${actor.department}).`,
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
  const client = requireSupabase();
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

export async function upsertErpModule(
  modInput: Omit<ErpModule, 'id' | 'created_at' | 'is_default'> & {
    id?: string;
    is_default?: boolean;
  }
): Promise<ErpModule> {
  const client = requireSupabase();
  const nowIso = new Date().toISOString();
  const mod: ErpModule = {
    id: modInput.id ?? generateId(),
    name: modInput.name.trim(),
    description: modInput.description?.trim() || '',
    rollout_phase: modInput.rollout_phase,
    is_default: modInput.is_default ?? false,
    created_at: nowIso,
  };

  const { data, error } = await client
    .from('erp_modules')
    .upsert(mod)
    .select()
    .single();
  if (error) throw error;
  return data as ErpModule;
}

export async function updateRolloutPhase(
  phaseId: number,
  status: PhaseStatus,
  progress: number
): Promise<RolloutPhase> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('rollout_phases')
    .update({ status, progress })
    .eq('id', phaseId)
    .select()
    .single();
  if (error) throw error;
  return data as RolloutPhase;
}
