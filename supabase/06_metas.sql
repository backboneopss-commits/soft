-- ════════════════════════════════════════════════════════════════════
-- BACKBONE — Fase 4 (Etapa 3): Metas mensuales (para el dashboard)
-- ════════════════════════════════════════════════════════════════════
-- Ejecutar DESPUÉS de 05_cobranzas.sql. Una fila de metas por cliente.
-- ════════════════════════════════════════════════════════════════════

create table if not exists org_goals (
  organization_id        uuid primary key references organizations(id) on delete cascade,
  meta_cash_collected    numeric(12,2) not null default 30000,
  meta_unidades          integer not null default 25,
  meta_tasa_cierre       numeric(5,2) not null default 30.0,
  meta_agendas_calif     integer not null default 60,
  meta_show_up_rate      numeric(5,2) not null default 70.0,
  meta_agenda_calendario numeric(5,2) not null default 65.0,
  updated_at             timestamptz not null default now()
);

alter table org_goals enable row level security;

drop policy if exists org_goals_select on org_goals;
create policy org_goals_select on org_goals for select
  using (organization_id = auth_org_id());
drop policy if exists org_goals_write on org_goals;
create policy org_goals_write on org_goals for all
  using (organization_id = auth_org_id() and auth_role() = 'admin')
  with check (organization_id = auth_org_id() and auth_role() = 'admin');
