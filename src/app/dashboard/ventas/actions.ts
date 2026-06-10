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
