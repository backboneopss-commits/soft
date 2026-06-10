"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function createContact(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (!profile.organization_id) return;

  const supabase = createClient();
  await supabase.from("contacts").insert({
    organization_id: profile.organization_id,
    owner_id: profile.id,
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
    instagram: emptyToNull(formData.get("instagram")),
    source: emptyToNull(formData.get("source")),
    notes: emptyToNull(formData.get("notes")),
  });

  revalidatePath("/dashboard/crm");
}

export async function deleteContact(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/dashboard/crm");
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
