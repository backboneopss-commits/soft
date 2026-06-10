import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAnthropic, buildSystemPrompt, GUION_MODEL } from "@/lib/anthropic";
import type { GuionMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Sin cliente asignado" }, { status: 403 });
  }
  const orgId = profile.organization_id as string;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY en el servidor." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const threadId = String(body?.threadId ?? "");
  const message = String(body?.message ?? "").trim();
  if (!threadId || !message) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Verificar que el hilo pertenece al cliente (RLS también lo cubre).
  const { data: thread } = await supabase
    .from("guion_threads")
    .select("id")
    .eq("id", threadId)
    .single();
  if (!thread) {
    return NextResponse.json({ error: "Hilo no encontrado" }, { status: 404 });
  }

  // Guardar el mensaje del usuario.
  await supabase.from("guion_messages").insert({
    thread_id: threadId,
    organization_id: orgId,
    role: "user",
    content: message,
  });

  // Cargar historial del hilo.
  const { data: history } = await supabase
    .from("guion_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  // Cargar contexto del cliente: contenido/SOPs y ventas ganadas.
  const [{ data: org }, { data: assets }, { data: deals }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).single(),
    supabase
      .from("content_assets")
      .select("title, kind, description")
      .limit(50),
    supabase.from("deals").select("title, value").eq("stage", "ganado").limit(50),
  ]);

  const system = buildSystemPrompt({
    orgName: org?.name ?? "el cliente",
    contentAssets: assets ?? [],
    wonDeals: (deals ?? []).map((d) => ({
      title: d.title,
      value: Number(d.value || 0),
    })),
  });

  const messages = (history ?? []).map((m: Pick<GuionMessage, "role" | "content">) => ({
    role: m.role,
    content: m.content,
  }));

  const anthropic = createAnthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        const claudeStream = anthropic.messages.stream({
          model: GUION_MODEL,
          max_tokens: 16000,
          thinking: { type: "adaptive" },
          system,
          messages,
        });

        claudeStream.on("text", (delta) => {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        });

        await claudeStream.finalMessage();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error generando respuesta";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        // Guardar la respuesta del asistente y tocar el hilo.
        if (full.trim()) {
          await supabase.from("guion_messages").insert({
            thread_id: threadId,
            organization_id: orgId,
            role: "assistant",
            content: full,
          });
        }
        await supabase
          .from("guion_threads")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", threadId);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
