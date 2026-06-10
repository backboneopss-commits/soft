# Backbone

Plataforma **multi-cliente** para agencias: CRM, métricas de ventas,
biblioteca de contenido/SOPs y (próximamente) guiones con IA e integración con
redes sociales. Cada cliente vive aislado, con roles **administrador / closer /
setter**.

> Estado: **Módulo 1 — Base + CRM + Roles** ✅ · **Fase 2 — Guiones IA** ✅
> Próximo: Fase 3 (Instagram/TikTok/Facebook).

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — Postgres + Auth + Row Level Security (aislamiento multi-cliente)
- **Claude API** — para el chat de guiones (Fase 2)

## Deploy (ponerlo online)

¿Querés probarlo en vivo (también desde el celular)? Seguí
[`DEPLOY.md`](DEPLOY.md): deploy gratis en Vercel + Supabase en ~15 minutos.

## Puesta en marcha (local)

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto (gratis).
2. En **SQL Editor**, pegá y ejecutá el contenido de
   [`supabase/schema.sql`](supabase/schema.sql). Esto crea las tablas, las
   políticas de seguridad (RLS) y los roles.
3. En **Authentication → Providers**, dejá habilitado *Email*. Para probar
   rápido podés desactivar la confirmación por email
   (*Authentication → Sign In / Up → Confirm email = off*).
4. Para el chat de **Guiones IA**, ejecutá también
   [`supabase/02_guiones.sql`](supabase/02_guiones.sql) y completá
   `ANTHROPIC_API_KEY` en `.env.local`
   (la conseguís en [console.anthropic.com](https://console.anthropic.com)).

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completá con los valores de **Supabase → Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (¡secreto! solo backend, para asignar miembros)

### 3. Instalar y correr

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000>.

## Cómo se usa

1. **Registrate** (`/login?mode=registro`).
2. La primera vez, **creá un cliente** → quedás como su **administrador**.
3. Como admin, en **Equipo** invitás a tu gente por email (deben haberse
   registrado antes) y les asignás rol **closer** o **setter**.
4. Cargá **contactos** (CRM), armá tu **pipeline** (Ventas) y subí
   **contenido/SOPs** (links de Google Drive).
5. El **Resumen** te muestra métricas en vivo: facturado, pipeline, tasa de
   cierre y embudo.

## Permisos por rol

| Acción                         | Admin | Closer | Setter |
|--------------------------------|:-----:|:------:|:------:|
| Ver todo el cliente            |  ✅   |  ✅    |  ✅    |
| Crear contactos / oportunidades|  ✅   |  ✅    |  ✅    |
| Editar lo propio               |  ✅   |  ✅    |  ✅    |
| Editar/eliminar de otros       |  ✅   |  ❌    |  ❌    |
| Cargar contenido / SOPs        |  ✅   |  ❌    |  ❌    |
| Gestionar equipo y roles       |  ✅   |  ❌    |  ❌    |

Estos permisos están aplicados **en la base de datos** (RLS), no solo en la UI.

## Estructura

```
src/
  app/
    login/                 # auth (login / registro)
    dashboard/
      page.tsx             # resumen + métricas
      crm/                 # contactos
      ventas/              # pipeline
      contenido/           # contenido y SOPs
      equipo/              # gestión de miembros (admin)
      guiones/             # chat IA (Fase 2)
      redes/               # métricas de redes (Fase 3)
  components/              # UI compartida
  lib/
    supabase/              # clientes (browser / server / admin / middleware)
    auth.ts                # usuario + perfil + organización actual
    types.ts               # tipos del dominio
supabase/schema.sql        # esquema + RLS + roles
```

## Roadmap

- **Fase 2 — Guiones IA** ✅: chat con Claude que usa el contenido/SOPs y el
  histórico de ventas ganadas del cliente para generar guiones a medida, con
  respuestas en streaming y conversaciones guardadas por cliente.
- **Fase 3 — Redes & Métricas**: Instagram Graph API, TikTok Business API y
  Meta Ads. Ingesta automática de métricas y panel de medición.
- **Más adelante**: importación directa desde Google Drive, notificaciones,
  automatizaciones.
