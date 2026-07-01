import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCalendlySignature } from "@/lib/calendly";

// Webhook de Calendly. La URL lleva un token que identifica al cliente:
//   POST /api/calendly/<webhook_token>
// Cada closer tiene su propio link → mapeamos por el email del host.
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const rawBody = await request.text();
  const admin = createAdminClient();

  // 1) Identificar al cliente por el token de la URL.
  const { data: settings } = await admin
    .from("calendly_settings")
    .select("*")
    .eq("webhook_token", params.token)
    .maybeSingle();

  if (!settings) {
    return NextResponse.json({ error: "unknown token" }, { status: 404 });
  }

  // 2) Verificar la firma.
  const sig = request.headers.get("calendly-webhook-signature");
  if (!verifyCalendlySignature(rawBody, sig, settings.signing_key)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const event = body?.event as string;
  const p = body?.payload ?? {};
  const scheduled = p.scheduled_event ?? {};
  const eventUri: string | null = scheduled.uri ?? p.uri ?? null;
  const orgId = settings.organization_id as string;

  // ── Cancelación: marcamos el lead existente ──
  if (event === "invitee.canceled") {
    if (eventUri) {
      const { data: lead } = await admin
        .from("leads")
        .select("id, nota_setter")
        .eq("organization_id", orgId)
        .eq("calendly_event_uri", eventUri)
        .maybeSingle();
      if (lead) {
        const nota = `${lead.nota_setter ? lead.nota_setter + " · " : ""}[Calendly] Cancelado`;
        await admin
          .from("leads")
          .update({ show_up: "NO", nota_setter: nota })
          .eq("id", lead.id);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── Nueva agenda ──
  if (event === "invitee.created") {
    const nombre = p.name ?? "Sin nombre";
    const email = p.email ?? null;
    const startTime: string | null = scheduled.start_time ?? null;
    const fechaAgenda = startTime ? startTime.slice(0, 10) : null;

    // Closer = dueño del evento (cada closer tiene su link).
    const hostEmail: string | undefined =
      scheduled.event_memberships?.[0]?.user_email?.toLowerCase();
    let closerId: string | null = null;
    if (hostEmail) {
      const { data: closer } = await admin
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId)
        .ilike("calendly_email", hostEmail)
        .maybeSingle();
      closerId = closer?.id ?? null;
    }

    // Fuente: UTM si viene, si no la default.
    const utm = p.tracking?.utm_source as string | undefined;
    const fuente = utm && utm.trim() ? utm.trim() : settings.default_fuente;

    // Contexto: nombre del evento + respuestas del formulario.
    const qa = Array.isArray(p.questions_and_answers)
      ? p.questions_and_answers
          .map((x: any) => `${x.question}: ${x.answer}`)
          .join(" · ")
      : "";
    const nota = [`[Calendly] ${scheduled.name ?? "Call"}`, qa]
      .filter(Boolean)
      .join(" · ");

    await admin.from("leads").upsert(
      {
        organization_id: orgId,
        calendly_event_uri: eventUri,
        nombre,
        contacto: email,
        fecha_agenda: fechaAgenda,
        setter_id: settings.default_setter_id,
        closer_id: closerId,
        fuente,
        calificacion: "PENDIENTE",
        nota_setter: nota,
      },
      { onConflict: "organization_id,calendly_event_uri" }
    );
    return NextResponse.json({ ok: true });
  }

  // Otros eventos: ack sin hacer nada.
  return NextResponse.json({ ok: true });
}
