"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchInstagramSnapshot } from "@/lib/instagram";
import type { SocialAccount, SocialPlatform } from "@/lib/types";

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "facebook"];

export async function addAccount(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) return;

  const platform = String(formData.get("platform") ?? "") as SocialPlatform;
  if (!PLATFORMS.includes(platform)) return;

  const supabase = createClient();
  const { data } = await supabase
    .from("social_accounts")
    .insert({
      organization_id: profile.organization_id,
      connected_by: profile.id,
      platform,
      handle: String(formData.get("handle") ?? "").trim(),
      external_id: nullable(formData.get("external_id")),
      access_token: nullable(formData.get("access_token")),
    })
    .select("id")
    .single();

  revalidatePath("/dashboard/redes");
  if (data?.id) redirect(`/dashboard/redes?account=${data.id}`);
}

export async function deleteAccount(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("social_accounts").delete().eq("id", id);
  revalidatePath("/dashboard/redes");
  redirect("/dashboard/redes");
}

// Sincroniza métricas reales desde la API de la red (Instagram por ahora).
export async function syncAccount(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) return;

  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  const { data: acct } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("id", id)
    .single();
  const account = acct as SocialAccount | null;
  if (!account) return back(id, "Cuenta no encontrada");

  if (account.platform !== "instagram") {
    return back(
      id,
      "La sincronización automática de TikTok/Facebook llega pronto. Mientras tanto podés cargar datos de demo."
    );
  }
  if (!account.external_id || !account.access_token) {
    return back(
      id,
      "Para sincronizar Instagram necesitás cargar el IG user id y el access token en la cuenta (editá la conexión)."
    );
  }

  try {
    const snap = await fetchInstagramSnapshot(
      account.external_id,
      account.access_token
    );

    await supabase.from("social_metrics").upsert(
      {
        account_id: account.id,
        organization_id: account.organization_id,
        snapshot_date: new Date().toISOString().slice(0, 10),
        followers: snap.followers,
        reach: snap.reach,
        impressions: snap.impressions,
        profile_views: snap.profileViews,
        engagement: snap.engagement,
      },
      { onConflict: "account_id,snapshot_date" }
    );

    if (snap.posts.length) {
      await supabase.from("social_posts").upsert(
        snap.posts.map((p) => ({
          account_id: account.id,
          organization_id: account.organization_id,
          external_id: p.externalId,
          caption: p.caption,
          permalink: p.permalink,
          media_type: p.mediaType,
          likes: p.likes,
          comments: p.comments,
          posted_at: p.postedAt,
        })),
        { onConflict: "account_id,external_id" }
      );
    }

    await supabase
      .from("social_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", account.id);

    return back(id, "¡Sincronizado!");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al sincronizar";
    return back(id, msg);
  }
}

// Carga datos de ejemplo para ver el dashboard sin esperar la aprobación de Meta.
export async function loadDemoData(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) return;

  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  const orgId = profile.organization_id;

  // 14 días de crecimiento simulado.
  const today = new Date();
  let followers = 4200;
  const metrics = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    followers += Math.floor(Math.random() * 60) + 10;
    metrics.push({
      account_id: id,
      organization_id: orgId,
      snapshot_date: d.toISOString().slice(0, 10),
      followers,
      reach: 8000 + Math.floor(Math.random() * 6000),
      impressions: 12000 + Math.floor(Math.random() * 9000),
      profile_views: 300 + Math.floor(Math.random() * 400),
      engagement: 400 + Math.floor(Math.random() * 500),
    });
  }
  await supabase
    .from("social_metrics")
    .upsert(metrics, { onConflict: "account_id,snapshot_date" });

  const demoPosts = [
    { cap: "Cómo cerramos 3 ventas esta semana 🔥", likes: 1240, comments: 89 },
    { cap: "El error #1 al hacer prospección en frío", likes: 980, comments: 54 },
    { cap: "Reel: rutina de un closer top", likes: 2100, comments: 132 },
    { cap: "Caso de éxito: x4 en 60 días", likes: 760, comments: 41 },
  ];
  await supabase.from("social_posts").upsert(
    demoPosts.map((p, idx) => ({
      account_id: id,
      organization_id: orgId,
      external_id: `demo-${idx}`,
      caption: p.cap,
      permalink: "https://instagram.com",
      media_type: idx === 2 ? "VIDEO" : "IMAGE",
      likes: p.likes,
      comments: p.comments,
      reach: 5000 + idx * 1200,
      posted_at: new Date(today.getTime() - idx * 86400000).toISOString(),
    })),
    { onConflict: "account_id,external_id" }
  );

  await supabase
    .from("social_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", id);

  return back(id, "Datos de demo cargados");
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function back(accountId: string, message: string): never {
  redirect(
    `/dashboard/redes?account=${accountId}&msg=${encodeURIComponent(message)}`
  );
}
