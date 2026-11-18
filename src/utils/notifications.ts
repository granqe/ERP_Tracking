import type { Ticket, TicketEvent, User } from '../types';

export interface AppNotification {
  id: string;
  ticket: Ticket;
  event: TicketEvent;
  actor: User | null;
  title: string;
  description: string;
  createdAt: string;
}

const READ_STORAGE_PREFIX = 'erp_notifications_read_';

export function getReadNotificationIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${READ_STORAGE_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(userId: string, ids: Set<string>): void {
  try {
    // Ruaj maksimumi 300 ID-të e fundit që localStorage të mos mbushet
    const arr = Array.from(ids).slice(-300);
    localStorage.setItem(`${READ_STORAGE_PREFIX}${userId}`, JSON.stringify(arr));
  } catch {
    // Injoro gabimet e storage
  }
}

export function buildNotificationsForUser(
  currentUser: User,
  events: TicketEvent[],
  visibleTickets: Ticket[],
  allUsers: User[]
): AppNotification[] {
  const ticketMap = new Map(visibleTickets.map((t) => [t.id, t]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const items: AppNotification[] = [];

  for (const ev of events) {
    // Mos njofto përdoruesin për veprimet e veta
    if (ev.actor_id === currentUser.id) continue;

    const ticket = ticketMap.get(ev.ticket_id);
    if (!ticket) continue;

    const actor = ev.actor_id ? userMap.get(ev.actor_id) || null : null;
    let shouldNotify = false;
    let title = ticket.title;

    if (currentUser.role === 'Programer') {
      // Programeri merr njoftim për kërkesat e reja, caktimet tek ai, komentet ose kthimet nga UAT
      if (
        ev.event_type === 'created' ||
        (ev.event_type === 'assigned' && ticket.assigned_to === currentUser.id) ||
        ev.event_type === 'uat_rejected' ||
        ev.event_type === 'comment'
      ) {
        shouldNotify = true;
        if (ev.event_type === 'created') {
          title = `Kërkesë e re: ${ticket.title}`;
        } else if (ev.event_type === 'assigned') {
          title = `Ju është caktuar: ${ticket.title}`;
        } else if (ev.event_type === 'uat_rejected') {
          title = `Kthyer për rregullim: ${ticket.title}`;
        }
      }
    } else if (currentUser.role === 'Staf') {
      // Stafi merr njoftime për ndryshimet në kërkesat e veta (nga programeri/menaxheri)
      if (
        ticket.created_by === currentUser.id &&
        (ev.event_type === 'status_change' ||
          ev.event_type === 'assigned' ||
          ev.event_type === 'blocked' ||
          ev.event_type === 'resolved' ||
          ev.event_type === 'comment' ||
          ev.event_type === 'priority_change' ||
          ev.event_type === 'deadline_change')
      ) {
        shouldNotify = true;
        if (ev.event_type === 'resolved') {
          title = `Gati për testim: ${ticket.title}`;
        } else if (ev.event_type === 'blocked') {
          title = `E bllokuar: ${ticket.title}`;
        }
      }
    } else if (currentUser.role === 'Menaxher') {
      // Menaxheri merr njoftime për kërkesa të reja, bllokime, zgjidhje, UAT dhe komente
      if (
        ev.event_type === 'created' ||
        ev.event_type === 'blocked' ||
        ev.event_type === 'resolved' ||
        ev.event_type === 'uat_rejected' ||
        ev.event_type === 'uat_approved' ||
        ev.event_type === 'comment' ||
        (ticket.created_by === currentUser.id && ev.event_type === 'status_change')
      ) {
        shouldNotify = true;
      }
    }

    if (!shouldNotify) continue;

    items.push({
      id: ev.id,
      ticket,
      event: ev,
      actor,
      title,
      description: ev.message,
      createdAt: ev.created_at,
    });
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 30);
}
