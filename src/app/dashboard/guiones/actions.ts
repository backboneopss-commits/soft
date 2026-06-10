"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function createThread() {
  const { profile } = await getCurrentUser();
  if (!profile.organization_id) return;

  const supabase = createClient();
  const { data } = await supabase
    .from("guion_threads")
    .insert({
      organization_id: profile.organization_id,
      created_by: profile.id,
    })
    .select("id")
    .single();

  revalidatePath("/dashboard/guiones");
  if (data?.id) redirect(`/dashboard/guiones?thread=${data.id}`);
}

export async function deleteThread(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("guion_threads").delete().eq("id", id);
  revalidatePath("/dashboard/guiones");
  redirect("/dashboard/guiones");
}
