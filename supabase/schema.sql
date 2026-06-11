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
