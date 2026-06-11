-- ════════════════════════════════════════════════════════════════════
-- BACKBONE — Fase 4 (Etapa 2): Cobranzas + Tracking diario de setters
-- ════════════════════════════════════════════════════════════════════
-- Ejecutar DESPUÉS de 04_crm.sql.
-- ════════════════════════════════════════════════════════════════════

do $$ begin
  create type tipo_cuota as enum
    ('PIF (Total)', 'Reserva', 'Semanal', 'Bisemanal', 'Mensual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_pago as enum
    ('Por Cobrar', 'Cobrado', 'En Atraso', 'No Paga');
exception when duplicate_object then null; end $$;

-- ── Cobranzas (cuotas / cobros) ──────────────────────────────────────
create table if not exists cobranzas (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  lead_id          uuid references leads(id) on delete set null,
  lead_nombre      text not null,
  programa         text,
  closer_id        uuid references profiles(id) on delete set null,
  fecha_cobro      date,
  tipo_cuota       tipo_cuota,
  monto_por_cobrar numeric(12,2) not null default 0,
  monto_cobrado    numeric(12,2) not null default 0,
  estado           estado_pago not null default 'Por Cobrar',
  created_at       timestamptz not null default now()
);

create index if not exists cobranzas_org_idx    on cobranzas (organization_id);
create index if not exists cobranzas_closer_idx on cobranzas (closer_id);

-- ── Tracking diario de setters ───────────────────────────────────────
create table if not exists setter_activity (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  setter_id           uuid not null references profiles(id) on delete cascade,
  fecha               date not null default current_date,
  conversaciones      integer not null default 0,
  follow_ups          integer not null default 0,
  pitch_call          integer not null default 0,
  calendarios_enviados integer not null default 0,
  calls_agendadas     integer not null default 0,
  created_at          timestamptz not null default now(),
  unique (organization_id, setter_id, fecha)
);

create index if not exists setter_activity_idx
  on setter_activity (organization_id, fecha);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table cobranzas       enable row level security;
alter table setter_activity enable row level security;

-- Cobranzas: ven todos los del cliente; cargan/editan los miembros; borra admin.
drop policy if exists cobranzas_select on cobranzas;
create policy cobranzas_select on cobranzas for select
  using (organization_id = auth_org_id());
drop policy if exists cobranzas_insert on cobranzas;
create policy cobranzas_insert on cobranzas for insert
  with check (organization_id = auth_org_id());
drop policy if exists cobranzas_update on cobranzas;
create policy cobranzas_update on cobranzas for update
  using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
drop policy if exists cobranzas_delete on cobranzas;
create policy cobranzas_delete on cobranzas for delete
  using (organization_id = auth_org_id() and auth_role() = 'admin');

-- Actividad: ven todos los del cliente; cada uno carga/edita; borra admin.
drop policy if exists setter_activity_select on setter_activity;
create policy setter_activity_select on setter_activity for select
  using (organization_id = auth_org_id());
drop policy if exists setter_activity_insert on setter_activity;
create policy setter_activity_insert on setter_activity for insert
  with check (organization_id = auth_org_id());
drop policy if exists setter_activity_update on setter_activity;
create policy setter_activity_update on setter_activity for update
  using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
drop policy if exists setter_activity_delete on setter_activity;
create policy setter_activity_delete on setter_activity for delete
  using (organization_id = auth_org_id() and auth_role() = 'admin');
