-- ════════════════════════════════════════════════════════════════════
-- BACKBONE — Fase 4: CRM de Ventas (Base de Leads real)
-- ════════════════════════════════════════════════════════════════════
-- Ejecutar DESPUÉS de schema.sql. Modela el flujo real de setters/closers:
-- agenda → call → calificación → show up → estado → cash collected.
-- ════════════════════════════════════════════════════════════════════

-- ── Enums del pipeline (valores exactos del CRM) ─────────────────────
do $$ begin
  create type lead_calificacion as enum ('CALIFICADO', 'NO CALIFICADO', 'PENDIENTE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_show_up as enum ('SI', 'NO', 'REAGENDÓ');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_estado as enum
    ('COMPRÓ', 'SEÑÓ', 'SEGUIMIENTO', 'NO COMPRÓ', 'NO SHOW', 'NO CALIFICA');
exception when duplicate_object then null; end $$;

-- ── Catálogo de programas (producto + precio) ────────────────────────
create table if not exists programs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  price           numeric(12,2) not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ── Base de Leads (la tabla madre del CRM) ───────────────────────────
create table if not exists leads (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  -- Agenda / call
  fecha_agenda     date,
  fecha_llamada    date,
  -- Responsables
  setter_id        uuid references profiles(id) on delete set null,
  closer_id        uuid references profiles(id) on delete set null,
  -- Datos del lead
  nombre           text not null,
  contacto         text,                       -- link de ManyChat/IG o teléfono
  audio            text,                       -- 'ENVIADO' | 'NO ENVIADO'
  fuente           text,                       -- Instagram DM, Ads, Referido...
  -- Pipeline
  calificacion     lead_calificacion not null default 'PENDIENTE',
  show_up          lead_show_up,
  estado           lead_estado,
  programa         text,
  -- Plata
  precio_pactado   numeric(12,2) not null default 0,
  cash_collected   numeric(12,2) not null default 0,  -- día 1 (seña o total)
  monto_restante   numeric(12,2) generated always as (precio_pactado - cash_collected) stored,
  -- Notas / grabación
  nota_setter      text,
  nota_closer      text,
  grabacion        text,
  created_at       timestamptz not null default now()
);

create index if not exists leads_org_idx     on leads (organization_id);
create index if not exists leads_setter_idx  on leads (setter_id);
create index if not exists leads_closer_idx  on leads (closer_id);
create index if not exists leads_agenda_idx  on leads (fecha_agenda);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table programs enable row level security;
alter table leads    enable row level security;

-- Programas: ven todos los del cliente, gestiona el admin.
drop policy if exists programs_select on programs;
create policy programs_select on programs for select
  using (organization_id = auth_org_id());
drop policy if exists programs_write on programs;
create policy programs_write on programs for all
  using (organization_id = auth_org_id() and auth_role() = 'admin')
  with check (organization_id = auth_org_id() and auth_role() = 'admin');

-- Leads: todos los del cliente pueden ver y cargar/editar; borra el admin.
-- (Setters y closers trabajan sobre la misma base, como en el Sheet.)
drop policy if exists leads_select on leads;
create policy leads_select on leads for select
  using (organization_id = auth_org_id());
drop policy if exists leads_insert on leads;
create policy leads_insert on leads for insert
  with check (organization_id = auth_org_id());
drop policy if exists leads_update on leads;
create policy leads_update on leads for update
  using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
drop policy if exists leads_delete on leads;
create policy leads_delete on leads for delete
  using (organization_id = auth_org_id() and auth_role() = 'admin');
