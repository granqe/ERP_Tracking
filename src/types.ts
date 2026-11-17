export type UserRole = 'Staf' | 'Programer' | 'Menaxher';

export type TicketType =
  | 'Bug / Gabim Teknik'
  | 'Kërkesë Shtesë (Feature)'
  | 'Bllokim Procesi (Blocker)'
  | 'Migrim të Dhënash';

export type TicketPriority =
  | 'I Ulët'
  | 'Mesatar'
  | 'I Lartë'
  | 'Kritik (Bllokues)';

export type TicketStatus =
  | 'Në Pritje (Backlog)'
  | 'Në Punë (In Progress)'
  | 'Bllokuar (Blocked)'
  | 'Kryer nga Programeri (Gati për Testim)'
  | 'Mbyllur (Konfirmuar)';

export type PhaseStatus = 'Përfunduar' | 'Aktiv' | 'Bllokuar' | 'Në Pritje';

export type EventType =
  | 'created'
  | 'status_change'
  | 'assigned'
  | 'priority_change'
  | 'deadline_change'
  | 'comment'
  | 'blocked'
  | 'resolved'
  | 'uat_approved'
  | 'uat_rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  specialty?: string;
  avatar_color: string;
  active: boolean;
  created_at: string;
}

export interface ErpModule {
  id: string;
  name: string;
  description?: string;
  rollout_phase: number;
  is_default: boolean;
  created_at: string;
}

export interface RolloutPhase {
  id: number;
  title: string;
  description: string;
  status: PhaseStatus;
  progress: number;
}

export interface Ticket {
  id: string;
  code: string;
  title: string;
  description: string;
  type: TicketType;
  module: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_by: string;
  assigned_to: string | null;
  deadline: string | null;
  blocker_reason: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  uat_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  event_type: EventType;
  message: string;
  metadata?: Record<string, string>;
  created_at: string;
}

export interface TicketFilters {
  search: string;
  module: string;
  status: string;
  type: string;
  priority: string;
  reporterId: string;
  developerId: string;
}

export const TICKET_TYPES: TicketType[] = [
  'Bug / Gabim Teknik',
  'Kërkesë Shtesë (Feature)',
  'Bllokim Procesi (Blocker)',
  'Migrim të Dhënash',
];

export const TICKET_PRIORITIES: TicketPriority[] = [
  'I Ulët',
  'Mesatar',
  'I Lartë',
  'Kritik (Bllokues)',
];

export const TICKET_STATUSES: TicketStatus[] = [
  'Në Pritje (Backlog)',
  'Në Punë (In Progress)',
  'Bllokuar (Blocked)',
  'Kryer nga Programeri (Gati për Testim)',
  'Mbyllur (Konfirmuar)',
];

export const DEPARTMENTS: string[] = [
  'Menaxhim Projekti',
  'Financë',
  'Support / Mirëmbajtje',
  'Shitje',
  'Teknologji (IT)',
];
