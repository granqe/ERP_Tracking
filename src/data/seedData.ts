import type { ErpModule, RolloutPhase, Ticket, TicketEvent, User } from '../types';

const now = Date.now();
const daysAgo = (days: number, hours = 0) =>
  new Date(now - days * 86400000 - hours * 3600000).toISOString();
const daysFromNow = (days: number) =>
  new Date(now + days * 86400000).toISOString().split('T')[0];

export const SEED_USERS: User[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Arben Krasniqi',
    email: 'arben.krasniqi@kompania.al',
    role: 'Menaxher',
    department: 'Menaxhim Projekti',
    specialty: 'Drejtues i Migrimit ERP',
    avatar_color: '#0f172a',
    active: true,
    created_at: daysAgo(30),
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Elira Hoxha',
    email: 'elira.hoxha@kompania.al',
    role: 'Staf',
    department: 'Financë',
    specialty: 'Kontabilitet & TVSH',
    avatar_color: '#0369a1',
    active: true,
    created_at: daysAgo(28),
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Dritan Leka',
    email: 'dritan.leka@kompania.al',
    role: 'Staf',
    department: 'Financë',
    specialty: 'Faturim & Arkëtime',
    avatar_color: '#0d9488',
    active: true,
    created_at: daysAgo(28),
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: 'Besart Dervishi',
    email: 'besart.dervishi@kompania.al',
    role: 'Staf',
    department: 'Support / Mirëmbajtje',
    specialty: 'Kontratat e Klientëve',
    avatar_color: '#b45309',
    active: true,
    created_at: daysAgo(25),
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    name: 'Klaudia Prifti',
    email: 'klaudia.prifti@kompania.al',
    role: 'Staf',
    department: 'Support / Mirëmbajtje',
    specialty: 'Asistencë Teknike',
    avatar_color: '#be123c',
    active: true,
    created_at: daysAgo(24),
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    name: 'Andi Gashi',
    email: 'andi.gashi@kompania.al',
    role: 'Programer',
    department: 'Teknologji (IT)',
    specialty: 'Backend & Integrime API',
    avatar_color: '#1d4ed8',
    active: true,
    created_at: daysAgo(29),
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    name: 'Jonida Basha',
    email: 'jonida.basha@kompania.al',
    role: 'Programer',
    department: 'Teknologji (IT)',
    specialty: 'Frontend & Raporte PDF',
    avatar_color: '#4338ca',
    active: true,
    created_at: daysAgo(29),
  },
];

export const SEED_MODULES: ErpModule[] = [
  {
    id: 'mod-1',
    name: 'Financa & TVSH',
    description: 'Llogaritja e TVSH-së 20%, bilancet dhe mbyllja mujore',
    rollout_phase: 3,
    is_default: true,
    created_at: daysAgo(30),
  },
  {
    id: 'mod-2',
    name: 'Mirëmbajtja / Support',
    description: 'Menaxhimi i kontratave dhe tiketave të mirëmbajtjes',
    rollout_phase: 2,
    is_default: true,
    created_at: daysAgo(30),
  },
  {
    id: 'mod-3',
    name: 'Migrimi nga QuickBooks (CSV)',
    description: 'Importimi dhe pastrimi i të dhënave historike nga QuickBooks',
    rollout_phase: 3,
    is_default: true,
    created_at: daysAgo(30),
  },
  {
    id: 'mod-4',
    name: 'Faturimi & PDF',
    description: 'Gjenerimi i faturave tatimore dhe eksportimi PDF/Excel',
    rollout_phase: 4,
    is_default: true,
    created_at: daysAgo(30),
  },
  {
    id: 'mod-5',
    name: 'Pagesat Online (API)',
    description: 'Integrimi me bankat dhe webhook-et e pagesave online',
    rollout_phase: 5,
    is_default: true,
    created_at: daysAgo(30),
  },
  {
    id: 'mod-6',
    name: 'Inventari & Shitjet',
    description: 'Gjendja e magazinës, hyrje-daljet dhe porositë',
    rollout_phase: 1,
    is_default: true,
    created_at: daysAgo(30),
  },
  {
    id: 'mod-7',
    name: 'Siguria & Rolet',
    description: 'Lejet e aksesit, auditimi dhe rolet e përdoruesve',
    rollout_phase: 1,
    is_default: true,
    created_at: daysAgo(30),
  },
];

export const SEED_PHASES: RolloutPhase[] = [
  {
    id: 1,
    title: '1. Auditimi i Moduleve',
    description: 'Verifikimi i strukturës së inventarit, roleve dhe lejeve',
    status: 'Përfunduar',
    progress: 100,
  },
  {
    id: 2,
    title: '2. Migrimi i Klientëve (Support)',
    description: 'Kalimi i kontratave aktive dhe historikut të mirëmbajtjes',
    status: 'Aktiv',
    progress: 72,
  },
  {
    id: 3,
    title: '3. Kalimi i Financave (QuickBooks -> ERP)',
    description: 'Importimi i faturave, TVSH-së dhe gjendjeve kontabël',
    status: 'Bllokuar',
    progress: 45,
  },
  {
    id: 4,
    title: '4. Testimi Paralel',
    description: 'Krahasimi i raporteve dhe faturave PDF mes dy sistemeve',
    status: 'Në Pritje',
    progress: 20,
  },
  {
    id: 5,
    title: '5. Pagesat Online',
    description: 'Aktivizimi i API-së dhe webhook-eve të pagesave në prodhim',
    status: 'Në Pritje',
    progress: 10,
  },
];

export const SEED_TICKETS: Ticket[] = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    code: 'ERP-101',
    title: 'Mospërputhje në rrumbullakimin e TVSH-së 20% tek faturat me zbritje',
    description:
      'Gjatë testimit paralel me QuickBooks, faturat që kanë zbritje në përqindje dalin me diferencë prej 0.01 - 0.03 ALL në totalin e TVSH-së. Kjo bllokon mbylljen e librit të shitjeve.',
    type: 'Bllokim Procesi (Blocker)',
    module: 'Financa & TVSH',
    priority: 'Kritik (Bllokues)',
    status: 'Në Pritje (Backlog)',
    created_by: '11111111-1111-4111-8111-111111111102', // Elira Hoxha
    assigned_to: '11111111-1111-4111-8111-111111111106', // Andi Gashi
    deadline: daysFromNow(1),
    blocker_reason: null,
    resolution_note: null,
    resolved_at: null,
    uat_confirmed_at: null,
    created_at: daysAgo(7),
    updated_at: daysAgo(6),
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    code: 'ERP-102',
    title: 'Importimi i kontratave aktive të mirëmbajtjes nga CSV dështon tek fushat e datës',
    description:
      'Skedari CSV i eksportuar nga sistemi i vjetër i Support-it ka formatin DD/MM/YYYY, ndërsa ERP-ja pret YYYY-MM-DD. Gjithashtu mungon kolona e frekuencës së faturimit mujor/vjetor.',
    type: 'Migrim të Dhënash',
    module: 'Mirëmbajtja / Support',
    priority: 'Kritik (Bllokues)',
    status: 'Bllokuar (Blocked)',
    created_by: '11111111-1111-4111-8111-111111111104', // Besart Dervishi
    assigned_to: '11111111-1111-4111-8111-111111111106', // Andi Gashi
    deadline: daysFromNow(2),
    blocker_reason:
      'Duke pritur nga ekipi i Support-it (Besarti) shembullin final të CSV-së me kolonën e kodit të kontratës dhe sqarimin për kontratat e pezulluara.',
    resolution_note: null,
    resolved_at: null,
    uat_confirmed_at: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(2),
  },
  {
    id: '22222222-2222-4222-8222-222222222203',
    code: 'ERP-103',
    title: 'Eksportimi PDF i faturës tatimore nuk shfaq NIPT-in e degës dytësore',
    description:
      'Kur gjenerohet fatura PDF për klientët me disa pika shitjeje, në krye të dokumentit shfaqet gjithmonë adresa qendrore në vend të adresës së pikës ku u krye furnizimi.',
    type: 'Bug / Gabim Teknik',
    module: 'Faturimi & PDF',
    priority: 'I Lartë',
    status: 'Kryer nga Programeri (Gati për Testim)',
    created_by: '11111111-1111-4111-8111-111111111102', // Elira Hoxha
    assigned_to: '11111111-1111-4111-8111-111111111107', // Jonida Basha
    deadline: daysFromNow(3),
    blocker_reason: null,
    resolution_note:
      'U përditësua shablloni PDF (PR #48) duke lexuar fushën `branch_nipt` dhe `branch_address` nga objekti i pikës së shitjes. Testojeni me një faturë të degës Durrës.',
    resolved_at: daysAgo(0, 5),
    uat_confirmed_at: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(0, 5),
  },
  {
    id: '22222222-2222-4222-8222-222222222204',
    code: 'ERP-104',
    title: 'Përgatitja e webhook-ut për konfirmimin automatik të pagesave me kartë (BKT/Paysera)',
    description:
      'Duhet të implementohet endpoint-i i sigurt `/api/webhooks/payments` me verifikim HMAC-SHA256 që të shënojë faturën si "E Paguar" menjëherë pas transaksionit online.',
    type: 'Kërkesë Shtesë (Feature)',
    module: 'Pagesat Online (API)',
    priority: 'I Lartë',
    status: 'Në Punë (In Progress)',
    created_by: '11111111-1111-4111-8111-111111111103', // Dritan Leka
    assigned_to: '11111111-1111-4111-8111-111111111106', // Andi Gashi
    deadline: daysFromNow(5),
    blocker_reason: null,
    resolution_note: null,
    resolved_at: null,
    uat_confirmed_at: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(1),
  },
  {
    id: '22222222-2222-4222-8222-222222222205',
    code: 'ERP-105',
    title: 'Klientët e dubluar gjatë migrimit të bilanceve nga QuickBooks (CSV)',
    description:
      'Disa klientë në QuickBooks kanë dy regjistrime (një me NIPT dhe një pa NIPT). Skripti i migrimit duhet t’i bashkojë bilancet hapëse nën një kartelë të vetme.',
    type: 'Migrim të Dhënash',
    module: 'Migrimi nga QuickBooks (CSV)',
    priority: 'Kritik (Bllokues)',
    status: 'Në Punë (In Progress)',
    created_by: '11111111-1111-4111-8111-111111111103', // Dritan Leka
    assigned_to: '11111111-1111-4111-8111-111111111106', // Andi Gashi
    deadline: daysFromNow(1),
    blocker_reason: null,
    resolution_note: null,
    resolved_at: null,
    uat_confirmed_at: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(5),
  },
  {
    id: '22222222-2222-4222-8222-222222222206',
    code: 'ERP-106',
    title: 'Njoftim automatik me email 7 ditë para skadimit të kontratës së mirëmbajtjes',
    description:
      'Ekipi i Support-it ka nevojë për një njoftim automatik dhe një tabelë filtrimi për kontratat që skadojnë brenda 7 ditëve të ardhshme.',
    type: 'Kërkesë Shtesë (Feature)',
    module: 'Mirëmbajtja / Support',
    priority: 'Mesatar',
    status: 'Në Pritje (Backlog)',
    created_by: '11111111-1111-4111-8111-111111111105', // Klaudia Prifti
    assigned_to: null,
    deadline: daysFromNow(10),
    blocker_reason: null,
    resolution_note: null,
    resolved_at: null,
    uat_confirmed_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: '22222222-2222-4222-8222-222222222207',
    code: 'ERP-107',
    title: 'Butoni "Eksporto në Excel" te lista e faturave nuk përfshin kolonën e statusit të fiskalizimit',
    description:
      'Kur eksportojmë regjistrin mujor të shitjeve në Excel, mungon kolona NSLF/NIVF për verifikim me tatimet.',
    type: 'Bug / Gabim Teknik',
    module: 'Faturimi & PDF',
    priority: 'Mesatar',
    status: 'Kryer nga Programeri (Gati për Testim)',
    created_by: '11111111-1111-4111-8111-111111111103', // Dritan Leka
    assigned_to: '11111111-1111-4111-8111-111111111107', // Jonida Basha
    deadline: daysFromNow(4),
    blocker_reason: null,
    resolution_note:
      'U shtuan kolonat `NIVF` dhe `Statusi i Fiskalizimit` në eksportuesin XLSX (commit 9f2c1a). Ju lutem kontrolloni eksportin për muajin aktual.',
    resolved_at: daysAgo(1),
    uat_confirmed_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
  },
  {
    id: '22222222-2222-4222-8222-222222222208',
    code: 'ERP-108',
    title: 'Sinkronizimi i gjendjes fillestare të magazinës dhe artikujve me barkod',
    description:
      'Importimi i 1,450 artikujve nga inventari i vjetër me njësitë matëse dhe çmimet e shitjes.',
    type: 'Migrim të Dhënash',
    module: 'Inventari & Shitjet',
    priority: 'I Lartë',
    status: 'Mbyllur (Konfirmuar)',
    created_by: '11111111-1111-4111-8111-111111111104', // Besart Dervishi
    assigned_to: '11111111-1111-4111-8111-111111111107', // Jonida Basha
    deadline: daysAgo(2).split('T')[0],
    blocker_reason: null,
    resolution_note:
      'Të gjithë 1,450 artikujt u importuan dhe u verifikuan me gjendjen fizike të magazinës qendrore.',
    resolved_at: daysAgo(3),
    uat_confirmed_at: daysAgo(2),
    created_at: daysAgo(12),
    updated_at: daysAgo(2),
  },
];

export const SEED_EVENTS: TicketEvent[] = [
  {
    id: 'ev-101-1',
    ticket_id: '22222222-2222-4222-8222-222222222201',
    actor_id: '11111111-1111-4111-8111-111111111102',
    event_type: 'created',
    message: 'Tiketa u hap nga Elira Hoxha (Financë).',
    created_at: daysAgo(7),
  },
  {
    id: 'ev-101-2',
    ticket_id: '22222222-2222-4222-8222-222222222201',
    actor_id: '11111111-1111-4111-8111-111111111101',
    event_type: 'assigned',
    message: 'Arben Krasniqi ia caktoi detyrën programerit Andi Gashi.',
    created_at: daysAgo(6),
  },
  {
    id: 'ev-102-1',
    ticket_id: '22222222-2222-4222-8222-222222222202',
    actor_id: '11111111-1111-4111-8111-111111111104',
    event_type: 'created',
    message: 'Tiketa u hap nga Besart Dervishi (Support / Mirëmbajtje).',
    created_at: daysAgo(5),
  },
  {
    id: 'ev-102-2',
    ticket_id: '22222222-2222-4222-8222-222222222202',
    actor_id: '11111111-1111-4111-8111-111111111106',
    event_type: 'blocked',
    message:
      'Andi Gashi e shënoi si Bllokuar: Duke pritur nga ekipi i Support-it (Besarti) shembullin final të CSV-së me kolonën e kodit të kontratës.',
    created_at: daysAgo(2),
  },
  {
    id: 'ev-103-1',
    ticket_id: '22222222-2222-4222-8222-222222222203',
    actor_id: '11111111-1111-4111-8111-111111111102',
    event_type: 'created',
    message: 'Tiketa u hap nga Elira Hoxha (Financë).',
    created_at: daysAgo(4),
  },
  {
    id: 'ev-103-2',
    ticket_id: '22222222-2222-4222-8222-222222222203',
    actor_id: '11111111-1111-4111-8111-111111111107',
    event_type: 'resolved',
    message:
      'Jonida Basha e shënoi si Kryer nga Programeri (Gati për Testim): U përditësua shablloni PDF (PR #48) duke lexuar fushën branch_nipt.',
    created_at: daysAgo(0, 5),
  },
  {
    id: 'ev-108-1',
    ticket_id: '22222222-2222-4222-8222-222222222208',
    actor_id: '11111111-1111-4111-8111-111111111104',
    event_type: 'uat_approved',
    message: 'Besart Dervishi konfirmoi testimin (UAT) dhe e mbylli tiketën.',
    created_at: daysAgo(2),
  },
];
