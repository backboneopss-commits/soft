import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  fetchInstagramUsername,
} from "@/lib/instagram";

// Vuelta de Instagram: cambia el código por un token y guarda la cuenta.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const redes = (msg: string, account?: string) =>
    NextResponse.redirect(
      `${origin}/dashboard/redes?msg=${encodeURIComponent(msg)}${
        account ? `&account=${account}` : ""
      }`
    );

  const code = url.searchParams.get("code");
  const oauthError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (oauthError) return redes(`Instagram: ${oauthError}`);
  if (!code) return redes("No se recibió la autorización de Instagram.");

  const appId = process.env.INSTAGRAM_APP_ID!;
  const appSecret = process.env.INSTAGRAM_APP_SECRET!;

  try {
    const { profile } = await getCurrentUser();
    if (profile.role !== "admin" || !profile.organization_id) {
      return redes("Solo un administrador puede conectar cuentas.");
    }

    const redirectUri = `${origin}/api/instagram/callback`;
    const { token, userId } = await exchangeCodeForToken(
      appId,
      appSecret,
      redirectUri,
      code
    );
    const handle = await fetchInstagramUsername(token);

    const supabase = createClient();
    // Si ya existe esa cuenta en la org, actualizamos el token; si no, la creamos.
    const { data: existing } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("platform", "instagram")
      .eq("external_id", userId)
      .maybeSingle();

    let accountId = existing?.id as string | undefined;
    if (accountId) {
      await supabase
        .from("social_accounts")
        .update({ access_token: token, handle, last_synced_at: null })
        .eq("id", accountId);
    } else {
      const { data: created } = await supabase
        .from("social_accounts")
        .insert({
          organization_id: profile.organization_id,
          connected_by: profile.id,
          platform: "instagram",
          handle,
          external_id: userId,
          access_token: token,
        })
        .select("id")
        .single();
      accountId = created?.id;
    }

    return redes(`¡Instagram @${handle} conectado!`, accountId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al conectar Instagram";
    return redes(msg);
  }
}
