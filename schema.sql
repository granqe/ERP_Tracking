-- ============================================================================
-- ERP Migration & Bug Tracker — Skema e Bazës së të Dhënave (Supabase / PostgreSQL)
-- Ngjiteni këtë skedar direkt në Supabase SQL Editor dhe ekzekutojeni.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela e Përdoruesve (Staf, Programerë, Menaxher)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Staf', 'Programer', 'Menaxher')),
  department TEXT NOT NULL,
  specialty TEXT,
  avatar_color TEXT DEFAULT '#1d4ed8',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela e Moduleve të ERP-së
CREATE TABLE IF NOT EXISTS public.erp_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  rollout_phase INTEGER NOT NULL DEFAULT 1 CHECK (rollout_phase BETWEEN 1 AND 5),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela e Fazave të Migrimit (Rollout Pipeline)
CREATE TABLE IF NOT EXISTS public.rollout_phases (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Në Pritje' CHECK (status IN ('Përfunduar', 'Aktiv', 'Bllokuar', 'Në Pritje')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100)
);

-- 4. Tabela Kryesore e Tiketave (Bugs, Features, Blockers, Data Migration)
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'Bug / Gabim Teknik',
    'Kërkesë Shtesë (Feature)',
    'Bllokim Procesi (Blocker)',
    'Migrim të Dhënash'
  )),
  module TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN (
    'I Ulët',
    'Mesatar',
    'I Lartë',
    'Kritik (Bllokues)'
  )),
  status TEXT NOT NULL DEFAULT 'Në Pritje (Backlog)' CHECK (status IN (
    'Në Pritje (Backlog)',
    'Në Punë (In Progress)',
    'Bllokuar (Blocked)',
    'Kryer nga Programeri (Gati për Testim)',
    'Mbyllur (Konfirmuar)'
  )),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deadline DATE,
  blocker_reason TEXT,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  uat_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Historiku i Veprimeve dhe Komentet (Audit Trail)
CREATE TABLE IF NOT EXISTS public.ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'status_change',
    'assigned',
    'priority_change',
    'deadline_change',
    'comment',
    'blocked',
    'resolved',
    'uat_approved',
    'uat_rejected'
  )),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indekse për performancë
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_module ON public.tickets(module);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_id ON public.ticket_events(ticket_id);

-- Trigger për përditësimin automatik të updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Aktivizimi i Realtime për përditësime të menjëhershme
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_modules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rollout_phases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_events;

-- Politika RLS (Për testim të shpejtë pa Supabase Auth; përshtateni për prodhim me auth.uid())
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rollout_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses i hapur demo - users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses i hapur demo - erp_modules" ON public.erp_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses i hapur demo - rollout_phases" ON public.rollout_phases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses i hapur demo - tickets" ON public.tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses i hapur demo - ticket_events" ON public.ticket_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- KONFIGURIMI FILLESTAR I MODULEVE & FAZAVE (PA TË DHËNA DEMO)
-- Përdoruesi i parë Menaxher regjistrohet direkt nga ekrani i hyrjes në aplikacion.
-- ============================================================================

INSERT INTO public.erp_modules (name, description, rollout_phase, is_default) VALUES
  ('Financa & TVSH', 'Llogaritja e TVSH-së, bilancet dhe mbyllja mujore', 3, true),
  ('Mirëmbajtja / Support', 'Menaxhimi i kontratave dhe tiketave të mirëmbajtjes', 2, true),
  ('Migrimi nga QuickBooks (CSV)', 'Importimi dhe pastrimi i të dhënave historike nga QuickBooks', 3, true),
  ('Faturimi & PDF', 'Gjenerimi i faturave tatimore dhe eksportimi PDF/Excel', 4, true),
  ('Pagesat Online (API)', 'Integrimi me bankat dhe webhook-et e pagesave online', 5, true),
  ('Inventari & Shitjet', 'Gjendja e magazinës, hyrje-daljet dhe porositë', 1, true),
  ('Siguria & Rolet', 'Lejet e aksesit, auditimi dhe rolet e përdoruesve', 1, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.rollout_phases (id, title, description, status, progress) VALUES
  (1, '1. Auditimi i Moduleve', 'Verifikimi i strukturës së inventarit, roleve dhe lejeve', 'Përfunduar', 100),
  (2, '2. Migrimi i Klientëve (Support)', 'Kalimi i kontratave aktive dhe historikut të mirëmbajtjes', 'Aktiv', 72),
  (3, '3. Kalimi i Financave (QuickBooks -> ERP)', 'Importimi i faturave, TVSH-së dhe gjendjeve kontabël', 'Bllokuar', 45),
  (4, '4. Testimi Paralel', 'Krahasimi i raporteve dhe faturave PDF mes dy sistemeve', 'Në Pritje', 20),
  (5, '5. Pagesat Online', 'Aktivizimi i API-së dhe webhook-eve të pagesave në prodhim', 'Në Pritje', 10)
ON CONFLICT (id) DO NOTHING;
