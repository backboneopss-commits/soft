-- ════════════════════════════════════════════════════════════════════
-- BACKBONE — Fase 2: Guiones IA (chat persistente por cliente)
-- ════════════════════════════════════════════════════════════════════
-- Ejecutar DESPUÉS de schema.sql, en Supabase → SQL Editor.
-- Guarda las conversaciones del chat de guiones, aisladas por organización.
-- ════════════════════════════════════════════════════════════════════

-- ── Hilos de conversación ────────────────────────────────────────────
create table if not exists guion_threads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by      uuid references profiles(id),
  title           text not null default 'Nueva conversación',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Mensajes ─────────────────────────────────────────────────────────
create table if not exists guion_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references guion_threads(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

create index if not exists guion_messages_thread_idx
  on guion_messages (thread_id, created_at);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table guion_threads  enable row level security;
alter table guion_messages enable row level security;

-- Todos los roles del cliente pueden usar el chat de guiones.
drop policy if exists guion_threads_all on guion_threads;
create policy guion_threads_all on guion_threads for all
  using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());

drop policy if exists guion_messages_all on guion_messages;
create policy guion_messages_all on guion_messages for all
  using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
