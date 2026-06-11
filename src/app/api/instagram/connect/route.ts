import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getInstagramAuthUrl } from "@/lib/instagram";

// Inicia el flujo: manda al usuario a Instagram para que autorice la app.
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const redes = (msg: string) =>
    NextResponse.redirect(
      `${origin}/dashboard/redes?msg=${encodeURIComponent(msg)}`
    );

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId || !process.env.INSTAGRAM_APP_SECRET) {
    return redes(
      "Falta configurar la app de Meta (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET) en el servidor."
    );
  }

  const { profile } = await getCurrentUser();
  if (profile.role !== "admin" || !profile.organization_id) {
    return redes("Solo un administrador puede conectar cuentas.");
  }

  const redirectUri = `${origin}/api/instagram/callback`;
  const state = profile.organization_id; // identifica la org al volver
  return NextResponse.redirect(getInstagramAuthUrl(appId, redirectUri, state));
}
