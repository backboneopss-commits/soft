"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["admin", "closer", "setter"];

// Cambia el rol de un miembro del mismo cliente (RLS valida la pertenencia).
export async function changeRole(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin") return;

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!id || !VALID_ROLES.includes(role)) return;

  const supabase = createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/dashboard/equipo");
}

// Asigna un usuario ya registrado (por email) al cliente del admin.
// Usa service-role porque el usuario sin org no es visible bajo RLS.
export async function assignMember(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) {
    return redirectErr("Sin permisos");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "setter") as UserRole;
  if (!email) return redirectErr("Email requerido");

  const admin = createAdminClient();

  // Buscar al usuario por email entre los registrados.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) return redirectErr(listErr.message);

  const target = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === email
  );
  if (!target) {
    return redirectErr(
      "Ese email no está registrado. Pedile que cree su cuenta primero."
    );
  }

  const { error: upErr } = await admin.from("profiles").upsert({
    id: target.id,
    organization_id: profile.organization_id,
    role: VALID_ROLES.includes(role) ? role : "setter",
    full_name:
      (target.user_metadata?.full_name as string | undefined) ?? target.email,
  });
  if (upErr) return redirectErr(upErr.message);

  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo?message=Miembro%20asignado");
}

function redirectErr(msg: string): never {
  redirect(`/dashboard/equipo?error=${encodeURIComponent(msg)}`);
}
