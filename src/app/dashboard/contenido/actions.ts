"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function createAsset(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (!profile.organization_id || profile.role !== "admin") return;

  const supabase = createClient();
  await supabase.from("content_assets").insert({
    organization_id: profile.organization_id,
    created_by: profile.id,
    title: String(formData.get("title") ?? "").trim(),
    kind: String(formData.get("kind") ?? "documento"),
    url: nullable(formData.get("url")),
    description: nullable(formData.get("description")),
  });

  revalidatePath("/dashboard/contenido");
}

export async function deleteAsset(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("content_assets").delete().eq("id", id);
  revalidatePath("/dashboard/contenido");
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
