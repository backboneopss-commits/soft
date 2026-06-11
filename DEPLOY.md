# Deploy de Backbone en Vercel

Guía paso a paso para poner Backbone online (gratis) en ~15 minutos. Solo
necesitás cuentas en Supabase, Vercel y Anthropic.

---

## 1. Supabase (base de datos + login)

1. Entrá a [supabase.com](https://supabase.com) → **New project** (plan gratis).
   Anotá la contraseña de la base de datos.
2. Cuando esté listo, andá a **SQL Editor → New query**, pegá el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**.
3. Repetí con [`supabase/02_guiones.sql`](supabase/02_guiones.sql) (el chat de
   guiones) y con [`supabase/03_redes.sql`](supabase/03_redes.sql) (redes y
   métricas).
4. Andá a **Settings → API** y copiá estos tres valores (los vas a pegar en
   Vercel):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secreto) → `SUPABASE_SERVICE_ROLE_KEY`
5. (Para probar rápido) **Authentication → Sign In / Providers → Email**:
   desactivá *Confirm email* así no tenés que confirmar por correo al registrarte.

---

## 2. Anthropic (chat de guiones IA)

1. Entrá a [console.anthropic.com](https://console.anthropic.com) → **API Keys**
   → creá una key.
2. Copiala → será `ANTHROPIC_API_KEY` en Vercel.

> Si todavía no querés usar el chat de IA, podés deployar sin esta key: todo lo
> demás funciona y la sección Guiones avisa que falta configurarla.

---

## 3. Vercel (hosting)

El código ya está en GitHub (`backboneopss-commits/soft`, rama
`claude/trusting-mayer-gopbpr`).

1. Entrá a [vercel.com](https://vercel.com) y registrate con GitHub.
2. **Add New… → Project** → importá el repo `soft`.
3. En **Configure Project**:
   - **Framework Preset**: Next.js (lo detecta solo).
   - **Branch**: elegí `claude/trusting-mayer-gopbpr` (o mergeá esa rama a `main`
     primero y deployá `main`).
   - Abrí **Environment Variables** y agregá:

     | Name | Value |
     |------|-------|
     | `NEXT_PUBLIC_SUPABASE_URL` | (de Supabase) |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (de Supabase) |
     | `SUPABASE_SERVICE_ROLE_KEY` | (de Supabase, secreto) |
     | `ANTHROPIC_API_KEY` | (de Anthropic) |

4. **Deploy**. En ~1 minuto tenés una URL tipo `https://soft-xxxx.vercel.app`.

---

## 4. Conectar Supabase con tu dominio de Vercel

Para que el login funcione bien:

1. Copiá la URL que te dio Vercel.
2. En Supabase → **Authentication → URL Configuration**:
   - **Site URL**: pegá la URL de Vercel.
   - **Redirect URLs**: agregá `https://TU-URL.vercel.app/**`.

---

## 5. Primer uso

1. Abrí tu URL de Vercel (¡desde el celu también!).
2. **Registrate** → la primera vez **creá tu cliente** (quedás como admin).
3. Invitá a tu equipo desde **Equipo**, cargá contactos, armá el pipeline,
   subí contenido/SOPs y probá el chat de **Guiones IA**.

---

## 6. Conectar Instagram (métricas en vivo)

Para que el botón **"Conectar con Instagram"** traiga métricas reales:

1. **Cuenta**: la de Instagram tiene que ser **Business** o **Creator** (no
   personal). Se cambia gratis desde la app de Instagram → Configuración →
   Tipo de cuenta.
2. **App de Meta**: entrá a [developers.facebook.com](https://developers.facebook.com)
   → **Crear app** → tipo **Business**.
3. Agregá el producto **"Instagram"** → **API setup with Instagram login**.
   Ahí vas a ver el **Instagram app ID** y el **Instagram app secret**.
4. En **Business login settings**, en *Redirect URIs* agregá:
   `https://TU-URL.vercel.app/api/instagram/callback`
   (la misma URL de tu deploy + `/api/instagram/callback`).
5. En Vercel → **Environment Variables** agregá:

   | Name | Value |
   |------|-------|
   | `INSTAGRAM_APP_ID` | (Instagram app ID) |
   | `INSTAGRAM_APP_SECRET` | (Instagram app secret) |

   Y **Redeploy**.
6. Para conectar **tu** cuenta mientras la app está en modo desarrollo:
   agregala como tester en la app de Meta (Roles → Instagram testers) y
   aceptá la invitación desde Instagram. Para conectar cuentas de **clientes**
   sin que sean testers, la app necesita **App Review** del permiso
   `instagram_business_manage_insights`.
7. Listo: en **Redes → Conectar con Instagram**, iniciás sesión, autorizás y
   las métricas aparecen en vivo.

> Los tokens de Instagram duran 60 días. Reconectá la cuenta cuando expire
> (el dashboard te avisa si falla la actualización en vivo).

---

## Notas

- **Duración del chat IA**: el endpoint de guiones usa streaming. En el plan
  **Hobby** de Vercel las funciones tienen un límite de tiempo; si notás cortes
  en respuestas muy largas, conviene el plan **Pro** (60s) o bajar la longitud
  de los guiones. El streaming ayuda a que casi nunca se llegue al límite.
- **Actualizaciones**: cada `git push` a la rama conectada redeploya solo.
- **Cambios de esquema**: si más adelante agrego tablas, vas a correr el nuevo
  `.sql` en Supabase (te aviso cuándo).
