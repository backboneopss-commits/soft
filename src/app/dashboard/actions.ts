"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// Crea una organización (cliente) y asigna al usuario actual como admin.
// Usa el RPC create_organization (SECURITY DEFINER) para evitar el
// problema de huevo-y-gallina con las políticas de RLS.
export async function createOrganization(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/dashboard?error=Nombre%20requerido");

  const { error } = await supabase.rpc("create_organization", {
    org_name: name,
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

function num(v: FormDataEntryValue | null): number {
  return Number(v ?? 0) || 0;
}

// Guarda las metas mensuales del cliente (solo admin).
export async function saveGoals(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) return;

  const supabase = createClient();
  await supabase.from("org_goals").upsert(
    {
      organization_id: profile.organization_id,
      meta_cash_collected: num(formData.get("meta_cash_collected")),
      meta_unidades: Math.trunc(num(formData.get("meta_unidades"))),
      meta_tasa_cierre: num(formData.get("meta_tasa_cierre")),
      meta_agendas_calif: Math.trunc(num(formData.get("meta_agendas_calif"))),
      meta_show_up_rate: num(formData.get("meta_show_up_rate")),
      meta_agenda_calendario: num(formData.get("meta_agenda_calendario")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  );
  revalidatePath("/dashboard");
}
