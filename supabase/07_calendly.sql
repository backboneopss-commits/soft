-- ════════════════════════════════════════════════════════════════════
-- BACKBONE — Fase 5: Integración con Calendly (agendas automáticas)
-- ════════════════════════════════════════════════════════════════════
-- Ejecutar DESPUÉS de 06_metas.sql.
-- Cada closer tiene su propio link de Calendly → el lead entra ya asignado.
-- El setter (único) se toma de default_setter_id.
-- ════════════════════════════════════════════════════════════════════

-- ── Config de Calendly por cliente ───────────────────────────────────
create table if not exists calendly_settings (
  organization_id   uuid primary key references organizations(id) on delete cascade,
  webhook_token     text not null unique,        -- identifica al cliente en la URL del webhook
  signing_key       text,                         -- para verificar la firma de Calendly
  access_token      text,                         -- Personal Access Token (secreto)
  organization_uri  text,                         -- URI de la org en Calendly
  subscription_uri  text,                         -- webhook creado en Calendly
  default_setter_id uuid references profiles(id) on delete set null,
  default_fuente    text not null default 'Calendly',
  connected         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Ruteo a closers: el email de Calendly de cada closer ─────────────
alter table profiles add column if not exists calendly_email text;

-- ── Idempotencia + cancelaciones: guardamos la URI del evento ────────
alter table leads add column if not exists calendly_event_uri text;
create unique index if not exists leads_calendly_uri_idx
  on leads (organization_id, calendly_event_uri)
  where calendly_event_uri is not null;

-- ── RLS ──────────────────────────────────────────────────────────────
alter table calendly_settings enable row level security;

-- Solo el admin del cliente ve/edita la config (contiene secretos).
-- El webhook entra por service-role (omite RLS), así que no necesita policy.
drop policy if exists calendly_settings_select on calendly_settings;
create policy calendly_settings_select on calendly_settings for select
  using (organization_id = auth_org_id() and auth_role() = 'admin');
drop policy if exists calendly_settings_write on calendly_settings;
create policy calendly_settings_write on calendly_settings for all
  using (organization_id = auth_org_id() and auth_role() = 'admin')
  with check (organization_id = auth_org_id() and auth_role() = 'admin');
