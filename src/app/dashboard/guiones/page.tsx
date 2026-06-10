import { PageHeader } from "@/components/ui";

export default function GuionesPage() {
  return (
    <div>
      <PageHeader
        title="Guiones IA"
        subtitle="Chat con IA para pedir guiones a medida según lo que mejor funcionó."
      />

      <div className="card max-w-2xl">
        <span className="badge bg-amber-500/20 text-amber-300">Fase 2</span>
        <h2 className="mt-3 text-lg font-medium">Próximamente</h2>
        <p className="mt-2 text-sm text-white/60">
          Acá vas a poder chatear con una IA (Claude) que conoce el contenido y
          los SOPs de este cliente. Le vas a pedir guiones de venta, de DM, de
          reels o de llamadas, y los va a generar basándose en:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-white/60">
          <li className="flex gap-2">
            <span className="text-brand-400">✦</span> El contenido y SOPs que
            cargaste en la biblioteca.
          </li>
          <li className="flex gap-2">
            <span className="text-brand-400">✦</span> Las oportunidades que más se
            cerraron en tu pipeline.
          </li>
          <li className="flex gap-2">
            <span className="text-brand-400">✦</span> El tono y estilo de tu marca.
          </li>
        </ul>
        <p className="mt-4 text-xs text-white/40">
          Requiere configurar <code>ANTHROPIC_API_KEY</code>. El enganche ya está
          previsto en el código.
        </p>
      </div>
    </div>
  );
}
