"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import {
  calendlyGetMe,
  calendlyCreateWebhook,
  calendlyDeleteWebhook,
  randomToken,
} from "@/lib/calendly";

function baseUrl(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Conecta Calendly: con el Personal Access Token creamos el webhook.
function back(msg: string): never {
  redirect(`/dashboard/integraciones?msg=${encodeURIComponent(msg)}`);
}

export async function connectCalendly(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) {
    back("Solo un administrador puede conectar Calendly.");
  }
  const token = String(formData.get("access_token") ?? "").trim();
  if (!token) back("Pegá tu Personal Access Token de Calendly.");

  const admin = createAdminClient();
  const orgId = profile.organization_id!;

  // Token para la URL del webhook (reutiliza el existente si ya hay).
  const { data: existing } = await admin
    .from("calendly_settings")
    .select("webhook_token, subscription_uri, access_token")
    .eq("organization_id", orgId)
    .maybeSingle();

  const webhookToken = existing?.webhook_token ?? randomToken(16);
  const signingKey = randomToken(24);
  const url = `${baseUrl()}/api/calendly/${webhookToken}`;

  let errMsg = "";
  try {
    const me = await calendlyGetMe(token);

    // Si había una suscripción previa, la borramos para no duplicar.
    if (existing?.subscription_uri && existing.access_token) {
      await calendlyDeleteWebhook(existing.access_token, existing.subscription_uri);
    }

    const subscriptionUri = await calendlyCreateWebhook({
      token,
      url,
      organization: me.organization,
      signingKey,
    });

    await admin.from("calendly_settings").upsert(
      {
        organization_id: orgId,
        webhook_token: webhookToken,
        signing_key: signingKey,
        access_token: token,
        organization_uri: me.organization,
        subscription_uri: subscriptionUri,
        default_setter_id:
          (formData.get("default_setter_id") as string) || profile.id,
        connected: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );
  } catch (e: any) {
    errMsg = e?.message ?? "No se pudo conectar con Calendly.";
  }

  revalidatePath("/dashboard/integraciones");
  back(errMsg || "¡Calendly conectado! Las agendas van a entrar solas.");
}

// Desconecta: elimina el webhook en Calendly y marca desconectado.
export async function disconnectCalendly() {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) return;

  const admin = createAdminClient();
  const { data: s } = await admin
    .from("calendly_settings")
    .select("access_token, subscription_uri")
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  if (s?.access_token && s.subscription_uri) {
    await calendlyDeleteWebhook(s.access_token, s.subscription_uri);
  }
  await admin
    .from("calendly_settings")
    .update({ connected: false, subscription_uri: null, updated_at: new Date().toISOString() })
    .eq("organization_id", profile.organization_id);

  revalidatePath("/dashboard/integraciones");
}

// Guarda el setter por defecto y el email de Calendly de cada closer.
export async function saveCalendlyRouting(formData: FormData) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) return;

  const supabase = createClient();

  const defaultSetter = String(formData.get("default_setter_id") ?? "") || null;
  const fuente = String(formData.get("default_fuente") ?? "").trim() || "Calendly";
  await supabase
    .from("calendly_settings")
    .update({ default_setter_id: defaultSetter, default_fuente: fuente, updated_at: new Date().toISOString() })
    .eq("organization_id", profile.organization_id);

  // Emails de Calendly por closer: campos closer_email_<id>.
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("closer_email_")) {
      const id = key.replace("closer_email_", "");
      const email = String(value).trim().toLowerCase() || null;
      await supabase.from("profiles").update({ calendly_email: email }).eq("id", id);
    }
  }

  revalidatePath("/dashboard/integraciones");
  back("Ruteo guardado.");
}
