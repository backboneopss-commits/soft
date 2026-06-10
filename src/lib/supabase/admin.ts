import { createClient } from "@supabase/supabase-js";

// Cliente con service-role: omite RLS. Usar SOLO en el servidor y siempre
// después de verificar que quien llama tiene permiso (p. ej. es admin).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
