"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { DealStage } from "@/lib/types";

export async function createDeal(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (!profile.organization_id) return;

  const supabase = createClient();
  const contactId = String(formData.get("contact_id") ?? "");

  await supabase.from("deals").insert({
    organization_id: profile.organization_id,
    owner_id: profile.id,
    contact_id: contactId || null,
    title: String(formData.get("title") ?? "").trim(),
    value: Number(formData.get("value") ?? 0) || 0,
    stage: "lead",
  });

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
}

export async function updateDealStage(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "") as DealStage;
  if (!id || !stage) return;

  const closed = stage === "ganado" || stage === "perdido";
  await supabase
    .from("deals")
    .update({ stage, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
}

export async function updateDeal(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const contactId = String(formData.get("contact_id") ?? "");
  await supabase
    .from("deals")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      value: Number(formData.get("value") ?? 0) || 0,
      contact_id: contactId || null,
    })
    .eq("id", id);

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
}

export async function deleteDeal(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("deals").delete().eq("id", id);
  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
}

// ── CRM de Leads (Base de Leads real) ────────────────────────────────

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
function num(v: FormDataEntryValue | null): number {
  return Number(v ?? 0) || 0;
}

// Arma el objeto de campos del lead desde el form (compartido alta/edición).
function leadFields(formData: FormData) {
  return {
    fecha_agenda: str(formData.get("fecha_agenda")),
    fecha_llamada: str(formData.get("fecha_llamada")),
    setter_id: str(formData.get("setter_id")),
    closer_id: str(formData.get("closer_id")),
    nombre: String(formData.get("nombre") ?? "").trim(),
    contacto: str(formData.get("contacto")),
    audio: str(formData.get("audio")),
    fuente: str(formData.get("fuente")),
    calificacion: str(formData.get("calificacion")) ?? "PENDIENTE",
    show_up: str(formData.get("show_up")),
    estado: str(formData.get("estado")),
    programa: str(formData.get("programa")),
    precio_pactado: num(formData.get("precio_pactado")),
    cash_collected: num(formData.get("cash_collected")),
    nota_setter: str(formData.get("nota_setter")),
    nota_closer: str(formData.get("nota_closer")),
    grabacion: str(formData.get("grabacion")),
  };
}

export async function createLead(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (!profile.organization_id) return;

  const fields = leadFields(formData);
  if (!fields.nombre) return;

  // Defaults por rol: el setter se autoasigna; el closer también.
  if (!fields.setter_id && profile.role === "setter") fields.setter_id = profile.id;
  if (!fields.closer_id && profile.role === "closer") fields.closer_id = profile.id;

  const supabase = createClient();
  await supabase
    .from("leads")
    .insert({ ...fields, organization_id: profile.organization_id });

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
}

export async function updateLead(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const fields = leadFields(formData);
  if (!fields.nombre) return;
  await supabase.from("leads").update(fields).eq("id", id);
  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
}

export async function deleteLead(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("leads").delete().eq("id", id);
  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard");
}

export async function addProgram(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const supabase = createClient();
  await supabase.from("programs").insert({
    organization_id: profile.organization_id,
    name,
    price: num(formData.get("price")),
  });
  revalidatePath("/dashboard/ventas");
}

export async function deleteProgram(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("programs").delete().eq("id", id);
  revalidatePath("/dashboard/ventas");
}
