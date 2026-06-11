"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
function num(v: FormDataEntryValue | null): number {
  return Number(v ?? 0) || 0;
}

function cobranzaFields(formData: FormData) {
  return {
    lead_id: str(formData.get("lead_id")),
    lead_nombre: String(formData.get("lead_nombre") ?? "").trim(),
    programa: str(formData.get("programa")),
    closer_id: str(formData.get("closer_id")),
    fecha_cobro: str(formData.get("fecha_cobro")),
    tipo_cuota: str(formData.get("tipo_cuota")),
    monto_por_cobrar: num(formData.get("monto_por_cobrar")),
    monto_cobrado: num(formData.get("monto_cobrado")),
    estado: str(formData.get("estado")) ?? "Por Cobrar",
  };
}

export async function createCobranza(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (!profile.organization_id) return;
  const fields = cobranzaFields(formData);
  if (!fields.lead_nombre) return;
  if (!fields.closer_id && profile.role === "closer") fields.closer_id = profile.id;

  const supabase = createClient();
  await supabase
    .from("cobranzas")
    .insert({ ...fields, organization_id: profile.organization_id });
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/dashboard");
}

export async function updateCobranza(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const fields = cobranzaFields(formData);
  if (!fields.lead_nombre) return;
  await supabase.from("cobranzas").update(fields).eq("id", id);
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/dashboard");
}

export async function deleteCobranza(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("cobranzas").delete().eq("id", id);
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/dashboard");
}
