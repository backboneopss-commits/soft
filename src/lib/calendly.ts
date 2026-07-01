import crypto from "crypto";

const API = "https://api.calendly.com";

// Verifica la firma del webhook (header Calendly-Webhook-Signature).
// Formato: "t=<timestamp>,v1=<hmac_sha256>".
export function verifyCalendlySignature(
  rawBody: string,
  signatureHeader: string | null,
  signingKey: string | null
): boolean {
  if (!signingKey) return true; // sin clave configurada, no verificamos
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => kv.split("=").map((s) => s.trim()))
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;

  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(parts.v1)
    );
  } catch {
    return false;
  }
}

// Datos del usuario/organización dueños del Personal Access Token.
export async function calendlyGetMe(token: string) {
  const res = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Calendly /users/me falló (${res.status})`);
  }
  const json = await res.json();
  return {
    uri: json.resource.uri as string,
    organization: json.resource.current_organization as string,
    name: json.resource.name as string,
  };
}

// Crea la suscripción de webhook a nivel organización.
export async function calendlyCreateWebhook(params: {
  token: string;
  url: string;
  organization: string;
  signingKey: string;
}) {
  const res = await fetch(`${API}/webhook_subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: params.url,
      events: ["invitee.created", "invitee.canceled"],
      organization: params.organization,
      scope: "organization",
      signing_key: params.signingKey,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      json?.message || json?.details?.[0]?.message || `error ${res.status}`;
    throw new Error(`No se pudo crear el webhook en Calendly: ${detail}`);
  }
  return json.resource.uri as string;
}

// Elimina la suscripción (al desconectar).
export async function calendlyDeleteWebhook(token: string, subscriptionUri: string) {
  await fetch(subscriptionUri, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("hex");
}
