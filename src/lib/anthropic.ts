import Anthropic from "@anthropic-ai/sdk";

// Modelo por defecto: el más capaz de Anthropic.
export const GUION_MODEL = "claude-opus-4-8";

export function createAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export interface GuionContext {
  orgName: string;
  contentAssets: { title: string; kind: string; description: string | null }[];
  wonDeals: { title: string; value: number }[];
}

// Construye el prompt de sistema con el contexto del cliente: su contenido,
// SOPs y las oportunidades que mejor funcionaron. Esto hace que los guiones
// salgan a medida de cada cliente.
export function buildSystemPrompt(ctx: GuionContext): string {
  const content =
    ctx.contentAssets.length > 0
      ? ctx.contentAssets
          .map(
            (a) =>
              `- [${a.kind}] ${a.title}${
                a.description ? `: ${a.description}` : ""
              }`
          )
          .join("\n")
      : "(Todavía no hay contenido ni SOPs cargados.)";

  const won =
    ctx.wonDeals.length > 0
      ? ctx.wonDeals
          .map((d) => `- ${d.title} (USD ${d.value})`)
          .join("\n")
      : "(Todavía no hay ventas ganadas registradas.)";

  return `Sos un copywriter y estratega de ventas experto que trabaja para el cliente "${ctx.orgName}".

Tu trabajo es generar guiones a medida: guiones de venta, de mensajes directos (DM), de llamadas (calls de setter y closer), de reels y de contenido. Los guiones deben estar en español rioplatense, ser concretos, accionables y listos para usar.

CONTENIDO Y SOPs DEL CLIENTE (úsalos como base de tono, oferta y procedimientos):
${content}

OPORTUNIDADES QUE YA SE CERRARON (lo que funcionó — inspirate en estos ángulos):
${won}

Guías de estilo:
- Preguntá lo mínimo indispensable; si tenés contexto suficiente, generá directo.
- Estructurá los guiones con secciones claras (gancho, desarrollo, cierre, CTA).
- Adaptá el tono al cliente y al canal que te pidan.
- Cuando tenga sentido, ofrecé 2 variantes para A/B testing.
- Sé directo y práctico. Nada de relleno.`;
}
