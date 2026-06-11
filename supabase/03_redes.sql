-- ════════════════════════════════════════════════════════════════════
-- BACKBONE — Fase 3: Redes & Métricas (Instagram / TikTok / Facebook)
-- ════════════════════════════════════════════════════════════════════
-- Ejecutar DESPUÉS de schema.sql, en Supabase → SQL Editor.
-- Guarda cuentas de redes conectadas y sus métricas/posts, por cliente.
-- ════════════════════════════════════════════════════════════════════

do $$ begin
  create type social_platform as enum ('instagram', 'tiktok', 'facebook');
exception when duplicate_object then null; end $$;

-- ── Cuentas de redes conectadas ──────────────────────────────────────
create table if not exists social_accounts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  platform        social_platform not null,
  handle          text not null,                 -- @usuario
  external_id     text,                          -- IG user id / page id
  access_token    text,                          -- token de la API (secreto)
  connected_by    uuid references profiles(id),
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Snapshots diarios de métricas de la cuenta ───────────────────────
create table if not exists social_metrics (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references social_accounts(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  snapshot_date   date not null default current_date,
  followers       integer default 0,
  reach           integer default 0,
  impressions     integer default 0,
  profile_views   integer default 0,
  engagement      integer default 0,             -- likes + comentarios del período
  unique (account_id, snapshot_date)
);

create index if not exists social_metrics_acct_idx
  on social_metrics (account_id, snapshot_date);

-- ── Posts / contenido (top performers) ───────────────────────────────
create table if not exists social_posts (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references social_accounts(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  external_id     text not null,
  caption         text,
  permalink       text,
  media_type      text,
  likes           integer default 0,
  comments        integer default 0,
  reach           integer default 0,
  posted_at       timestamptz,
  unique (account_id, external_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table social_accounts enable row level security;
alter table social_metrics  enable row level security;
alter table social_posts    enable row level security;

-- Ver: todos los del cliente. Gestionar: solo admin.
drop policy if exists social_accounts_select on social_accounts;
create policy social_accounts_select on social_accounts for select
  using (organization_id = auth_org_id());
drop policy if exists social_accounts_write on social_accounts;
create policy social_accounts_write on social_accounts for all
  using (organization_id = auth_org_id() and auth_role() = 'admin')
  with check (organization_id = auth_org_id() and auth_role() = 'admin');

drop policy if exists social_metrics_select on social_metrics;
create policy social_metrics_select on social_metrics for select
  using (organization_id = auth_org_id());
drop policy if exists social_metrics_write on social_metrics;
create policy social_metrics_write on social_metrics for all
  using (organization_id = auth_org_id() and auth_role() = 'admin')
  with check (organization_id = auth_org_id() and auth_role() = 'admin');

drop policy if exists social_posts_select on social_posts;
create policy social_posts_select on social_posts for select
  using (organization_id = auth_org_id());
drop policy if exists social_posts_write on social_posts;
create policy social_posts_write on social_posts for all
  using (organization_id = auth_org_id() and auth_role() = 'admin')
  with check (organization_id = auth_org_id() and auth_role() = 'admin');
