import type { ActiveTab } from '../components/TopBar';
import type { TicketFilters } from '../components/WorkBoard';
import type { Ticket, User } from '../types';

export interface ParsedUrlState {
  tab: ActiveTab;
  teamModalOpen: boolean;
  ticketRef: string | null;
  filters: TicketFilters;
}

export const EMPTY_TICKET_FILTERS: TicketFilters = {
  search: '',
  module: '',
  status: '',
  type: '',
  priority: '',
  reporterId: '',
  developerId: '',
};

export function parseUrlState(
  pathname: string,
  search: string
): ParsedUrlState {
  const path = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search);

  let tab: ActiveTab = 'pm_overview';
  let teamModalOpen = false;

  if (path === '/tabela') {
    tab = 'work_board';
  } else if (path === '/perdoruesit-modulet') {
    tab = 'pm_overview';
    teamModalOpen = true;
  } else if (path === '/menaxher') {
    tab = 'pm_overview';
  }

  return {
    tab,
    teamModalOpen,
    ticketRef: params.get('tiketa'),
    filters: {
      search: params.get('kerko') || '',
      module: params.get('moduli') || '',
      status: params.get('statusi') || '',
      type: params.get('lloji') || '',
      priority: params.get('prioriteti') || '',
      reporterId: params.get('raportuesi') || '',
      developerId: params.get('programeri') || '',
    },
  };
}

export function buildUrlFromState(options: {
  currentUser: User | null;
  activeTab: ActiveTab;
  isTeamModalOpen: boolean;
  filters: TicketFilters;
  selectedTicket: Ticket | null;
}): string {
  const { currentUser, activeTab, isTeamModalOpen, filters, selectedTicket } =
    options;

  if (!currentUser) {
    return '/hyrja';
  }

  const isPm = currentUser.role === 'Menaxher';
  let path = '/tabela';

  if (isPm && isTeamModalOpen) {
    path = '/perdoruesit-modulet';
  } else if (isPm && activeTab === 'pm_overview') {
    path = '/menaxher';
  } else {
    path = '/tabela';
  }

  const params = new URLSearchParams();
  if (path === '/tabela') {
    if (filters.module) params.set('moduli', filters.module);
    if (filters.status) params.set('statusi', filters.status);
    if (filters.type) params.set('lloji', filters.type);
    if (filters.priority) params.set('prioriteti', filters.priority);
    if (filters.search) params.set('kerko', filters.search);
    if (isPm && filters.reporterId) params.set('raportuesi', filters.reporterId);
    if (isPm && filters.developerId) params.set('programeri', filters.developerId);
  }

  if (selectedTicket) {
    params.set('tiketa', selectedTicket.code);
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
