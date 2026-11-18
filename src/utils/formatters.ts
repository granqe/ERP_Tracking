import type { Ticket, TicketPriority, TicketStatus, TicketType, User } from '../types';

const ALBANIAN_MONTHS = [
  'Janar',
  'Shkurt',
  'Mars',
  'Prill',
  'Maj',
  'Qershor',
  'Korrik',
  'Gusht',
  'Shtator',
  'Tetor',
  'Nëntor',
  'Dhjetor',
];

export function formatAlbanianDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Pa afat';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const day = d.getDate();
  const month = ALBANIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatAlbanianDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatAlbanianDate(isoString)}, ${hh}:${mm}`;
}

export function daysBetween(isoString: string): number {
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function formatRelativeAlbanian(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'tani';
  if (mins < 60) return `para ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `para ${hours} ${hours === 1 ? 'ore' : 'orësh'}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'dje';
  return `para ${days} ditësh`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  'Kritik (Bllokues)': 4,
  'I Lartë': 3,
  Mesatar: 2,
  'I Ulët': 1,
};

export function getPriorityBadgeClass(priority: TicketPriority): string {
  switch (priority) {
    case 'Kritik (Bllokues)':
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    case 'I Lartë':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'Mesatar':
      return 'bg-sky-100 text-sky-800 border border-sky-200';
    case 'I Ulët':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

export function getStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case 'Në Pritje (Backlog)':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'Në Punë (In Progress)':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'Bllokuar (Blocked)':
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    case 'Kryer nga Programeri (Gati për Testim)':
      return 'bg-amber-100 text-amber-900 border border-amber-300';
    case 'Mbyllur (Konfirmuar)':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  }
}

export function getTypeBadgeClass(type: TicketType): string {
  switch (type) {
    case 'Bllokim Procesi (Blocker)':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'Bug / Gabim Teknik':
      return 'bg-orange-50 text-orange-700 border border-orange-200';
    case 'Migrim të Dhënash':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    case 'Kërkesë Shtesë (Feature)':
      return 'bg-teal-50 text-teal-700 border border-teal-200';
  }
}

export function getRoleBadgeClass(role: User['role']): string {
  switch (role) {
    case 'Menaxher':
      return 'bg-slate-900 text-white';
    case 'Programer':
      return 'bg-blue-700 text-white';
    case 'Staf':
      return 'bg-teal-700 text-white';
  }
}

/**
 * RBAC strict visibility filter:
 * - Staf: ONLY tickets where created_by === currentUser.id
 * - Programer: tickets assigned to them OR unassigned tickets, sorted by blocker & priority
 * - Menaxher: ALL tickets
 */
export function getVisibleTicketsForUser(
  tickets: Ticket[],
  user: User,
  allUsers: User[] = []
): Ticket[] {
  if (user.role === 'Staf') {
    // Stafi sheh tiketat e veta, tiketat e caktuara për departamentin e tij,
    // ose (kur tiketa s'ka departament të caktuar) tiketat e kolegëve të të njëjtit departament
    const dept = (user.department || '').trim().toLowerCase();
    const sameDeptIds = new Set(
      allUsers
        .filter((u) => dept !== '' && (u.department || '').trim().toLowerCase() === dept)
        .map((u) => u.id)
    );
    return tickets
      .filter((t) => {
        if (t.created_by === user.id) return true;
        const ticketDept = (t.department || '').trim().toLowerCase();
        if (ticketDept !== '') {
          return dept !== '' && ticketDept === dept;
        }
        return sameDeptIds.has(t.created_by);
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  if (user.role === 'Programer') {
    return tickets
      .filter((t) => t.assigned_to === user.id || t.assigned_to === null)
      .sort((a, b) => {
        const aBlocked = a.status === 'Bllokuar (Blocked)' || a.type === 'Bllokim Procesi (Blocker)' ? 1 : 0;
        const bBlocked = b.status === 'Bllokuar (Blocked)' || b.type === 'Bllokim Procesi (Blocker)' ? 1 : 0;
        if (aBlocked !== bBlocked) return bBlocked - aBlocked;
        const pDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (pDiff !== 0) return pDiff;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }

  // Menaxher sees everything
  return [...tickets].sort((a, b) => {
    const pDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}
