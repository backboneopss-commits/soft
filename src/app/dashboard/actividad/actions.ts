"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

function int(v: FormDataEntryValue | null): number {
  return Math.max(0, Math.trunc(Number(v ?? 0) || 0));
}

// Carga/actualiza el tracking de un setter para un día (una fila por día).
export async function upsertActivity(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (!profile.organization_id) return;

  const setterId =
    profile.role === "setter"
      ? profile.id
      : String(formData.get("setter_id") ?? "") || profile.id;
  const fecha =
    String(formData.get("fecha") ?? "") || new Date().toISOString().slice(0, 10);

  const supabase = createClient();
  await supabase.from("setter_activity").upsert(
    {
      organization_id: profile.organization_id,
      setter_id: setterId,
      fecha,
      conversaciones: int(formData.get("conversaciones")),
      follow_ups: int(formData.get("follow_ups")),
      pitch_call: int(formData.get("pitch_call")),
      calendarios_enviados: int(formData.get("calendarios_enviados")),
      calls_agendadas: int(formData.get("calls_agendadas")),
    },
    { onConflict: "organization_id,setter_id,fecha" }
  );
  revalidatePath("/dashboard/actividad");
  revalidatePath("/dashboard");
}

export async function deleteActivity(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("setter_activity").delete().eq("id", id);
  revalidatePath("/dashboard/actividad");
}
