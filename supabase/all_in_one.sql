-- ════════════════════════════════════════════════════════════════════
-- BACKBONE — Esquema multi-cliente (multi-tenant) con Row Level Security
-- ════════════════════════════════════════════════════════════════════
-- Ejecutar en: Supabase → SQL Editor → New query → pegar y Run.
-- Cada CLIENTE = una fila en `organizations`. Todos los datos cuelgan de
-- una organización y RLS garantiza el aislamiento total entre clientes.
-- Roles dentro de cada cliente: admin, closer, setter.
-- ════════════════════════════════════════════════════════════════════

-- ── Tipos ────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'closer', 'setter');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_stage as enum ('lead', 'contactado', 'agendado', 'presentado', 'ganado', 'perdido');
exception when duplicate_object then null; end $$;

-- ── Organizaciones (un registro por cliente) ─────────────────────────
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz not null default now()
);

-- ── Perfiles (extiende auth.users con org + rol) ─────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  full_name       text,
  role            user_role not null default 'setter',
  created_at      timestamptz not null default now()
);

-- ── CRM: contactos / prospectos ──────────────────────────────────────
create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name       text not null,
  email           text,
  phone           text,
  instagram       text,
  source          text,                       -- de dónde vino (ads, organico, referido...)
  notes           text,
  owner_id        uuid references profiles(id),-- responsable (setter/closer)
  created_at      timestamptz not null default now()
);

-- ── Pipeline de ventas ───────────────────────────────────────────────
create table if not exists deals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id      uuid references contacts(id) on delete set null,
  title           text not null,
  stage           deal_stage not null default 'lead',
  value           numeric(12,2) default 0,     -- valor potencial / cerrado
  owner_id        uuid references profiles(id),
  closed_at       timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Contenido / SOPs (links a Google Drive, docs, etc.) ──────────────
create table if not exists content_assets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title           text not null,
  kind            text not null default 'documento', -- documento | sop | guion | video | imagen
  url             text,                              -- link de Google Drive u otro
  description     text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- ── Helpers de RLS ───────────────────────────────────────────────────
-- Devuelve la organización del usuario autenticado.
create or replace function auth_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- Devuelve el rol del usuario autenticado.
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- ── Activar RLS ──────────────────────────────────────────────────────
alter table organizations  enable row level security;
alter table profiles       enable row level security;
alter table contacts       enable row level security;
alter table deals          enable row level security;
alter table content_assets enable row level security;

-- ── Políticas: ORGANIZATIONS ─────────────────────────────────────────
drop policy if exists org_select on organizations;
create policy org_select on organizations for select
  using (id = auth_org_id());

drop policy if exists org_update on organizations;
create policy org_update on organizations for update
  using (id = auth_org_id() and auth_role() = 'admin');

-- ── Políticas: PROFILES ──────────────────────────────────────────────
-- Cada quien ve los perfiles de su propia organización.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (organization_id = auth_org_id());

-- Cada usuario puede editar su propio perfil; admin edita los de su org.
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (id = auth.uid() or (organization_id = auth_org_id() and auth_role() = 'admin'));

-- ── Políticas: CONTACTS (CRM) ────────────────────────────────────────
drop policy if exists contacts_select on contacts;
create policy contacts_select on contacts for select
  using (organization_id = auth_org_id());

-- Todos los roles pueden crear contactos en su organización.
drop policy if exists contacts_insert on contacts;
create policy contacts_insert on contacts for insert
  with check (organization_id = auth_org_id());

-- Editar: admin todo; setter/closer solo lo que les pertenece.
drop policy if exists contacts_update on contacts;
create policy contacts_update on contacts for update
  using (
    organization_id = auth_org_id()
    and (auth_role() = 'admin' or owner_id = auth.uid())
  );

-- Borrar: solo admin.
drop policy if exists contacts_delete on contacts;
create policy contacts_delete on contacts for delete
  using (organization_id = auth_org_id() and auth_role() = 'admin');

-- ── Políticas: DEALS ─────────────────────────────────────────────────
drop policy if exists deals_select on deals;
create policy deals_select on deals for select
  using (organization_id = auth_org_id());

drop policy if exists deals_insert on deals;
create policy deals_insert on deals for insert
  with check (organization_id = auth_org_id());

drop policy if exists deals_update on deals;
create policy deals_update on deals for update
  using (
    organization_id = auth_org_id()
    and (auth_role() = 'admin' or owner_id = auth.uid())
  );

drop policy if exists deals_delete on deals;
create policy deals_delete on deals for delete
  using (organization_id = auth_org_id() and auth_role() = 'admin');

-- ── Políticas: CONTENT_ASSETS ────────────────────────────────────────
drop policy if exists content_select on content_assets;
create policy content_select on content_assets for select
  using (organization_id = auth_org_id());

-- Crear/editar contenido y SOPs: admin (los setters/closers consumen).
drop policy if exists content_insert on content_assets;
create policy content_insert on content_assets for insert
  with check (organization_id = auth_org_id() and auth_role() = 'admin');

drop policy if exists content_update on content_assets;
create policy content_update on content_assets for update
  using (organization_id = auth_org_id() and auth_role() = 'admin');

drop policy if exists content_delete on content_assets;
create policy content_delete on content_assets for delete
  using (organization_id = auth_org_id() and auth_role() = 'admin');

-- ── RPC: crear organización y volverse su admin ─────────────────────
-- Resuelve el problema "huevo y gallina" de RLS: el usuario todavía no
-- pertenece a ninguna org, así que no podría insertarla bajo RLS normal.
-- SECURITY DEFINER ejecuta con privilegios elevados de forma controlada.
create or replace function create_organization(org_name text)
returns organizations language plpgsql security definer set search_path = public as $$
declare
  new_org organizations;
  new_slug text;
begin
  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'El nombre es obligatorio';
  end if;

  new_slug := lower(regexp_replace(trim(org_name), '[^a-zA-Z0-9]+', '-', 'g'))
              || '-' || substr(md5(random()::text), 1, 4);

  insert into organizations (name, slug)
  values (trim(org_name), new_slug)
  returning * into new_org;

  -- Linkea al usuario como admin. Si por algún motivo todavía no tiene fila
  -- de perfil (p. ej. se creó antes de existir el trigger), la crea acá mismo
  -- para que el alta nunca quede a medias.
  insert into profiles (id, organization_id, role)
  values (auth.uid(), new_org.id, 'admin')
  on conflict (id) do update
    set organization_id = excluded.organization_id, role = 'admin';

  return new_org;
end $$;

-- ── Trigger: crear perfil automáticamente al registrarse ─────────────
-- El primer usuario de una organización debe asignarse manualmente o vía
-- invitación. Este trigger crea un perfil vacío (sin org) para que luego
-- un admin lo asigne, o lo completás vía el flujo de onboarding.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
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
