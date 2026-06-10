import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/lib/types";

export interface CurrentUser {
  userId: string;
  email: string | null;
  profile: Profile;
  organization: Organization | null;
}

// Obtiene el usuario autenticado junto a su perfil y organización.
// Redirige al login si no hay sesión.
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Sin perfil aún (raro: el trigger lo crea). Tratamos como sin asignar.
  const safeProfile: Profile =
    profile ??
    ({
      id: user.id,
      organization_id: null,
      full_name: user.email ?? null,
      role: "setter",
      created_at: new Date().toISOString(),
    } as Profile);

  let organization: Organization | null = null;
  if (safeProfile.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", safeProfile.organization_id)
      .single();
    organization = org ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: safeProfile,
    organization,
  };
}
