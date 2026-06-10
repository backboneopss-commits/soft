"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
