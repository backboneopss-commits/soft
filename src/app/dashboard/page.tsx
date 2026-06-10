import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, StatCard, StageBadge } from "@/components/ui";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/types";
import type { Deal } from "@/lib/types";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function DashboardPage() {
  const { profile } = await getCurrentUser();
  const supabase = createClient();

  const [{ count: contactCount }, { data: deals }] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("deals").select("*"),
  ]);

  const allDeals = (deals ?? []) as Deal[];
  const won = allDeals.filter((d) => d.stage === "ganado");
  const lost = allDeals.filter((d) => d.stage === "perdido");
  const open = allDeals.filter(
    (d) => d.stage !== "ganado" && d.stage !== "perdido"
  );

  const revenue = won.reduce((s, d) => s + Number(d.value || 0), 0);
  const pipelineValue = open.reduce((s, d) => s + Number(d.value || 0), 0);
  const closedTotal = won.length + lost.length;
  const winRate = closedTotal ? Math.round((won.length / closedTotal) * 100) : 0;

  // Conteo por etapa para el embudo.
  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    count: allDeals.filter((d) => d.stage === stage).length,
  }));
  const maxStage = Math.max(1, ...byStage.map((s) => s.count));

  return (
    <div>
      <PageHeader
        title={`Hola, ${profile.full_name ?? ""}`.trim()}
        subtitle="Resumen de tu operación en tiempo real."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Contactos" value={contactCount ?? 0} hint="en el CRM" />
        <StatCard
          label="Facturado"
          value={money(revenue)}
          hint={`${won.length} ventas ganadas`}
        />
        <StatCard
          label="Pipeline abierto"
          value={money(pipelineValue)}
          hint={`${open.length} oportunidades`}
        />
        <StatCard
          label="Tasa de cierre"
          value={`${winRate}%`}
          hint={`${won.length} de ${closedTotal} cerradas`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-medium">Embudo de ventas</h2>
          <div className="space-y-3">
            {byStage.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <StageBadge stage={stage} label={STAGE_LABELS[stage]} />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(count / maxStage) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-sm text-white/60">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 font-medium">Próximos pasos</h2>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex gap-2">
              <span className="text-brand-400">→</span> Cargá tus contactos en el{" "}
              <span className="text-white/80">CRM</span>.
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">→</span> Movó tus oportunidades por
              el <span className="text-white/80">pipeline de Ventas</span>.
            </li>
            <li className="flex gap-2">
              <span className="text-brand-400">→</span> Subí tus{" "}
              <span className="text-white/80">SOPs y contenido</span> desde Google
              Drive.
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">◷</span> Pronto: métricas
              automáticas de Instagram y guiones con IA.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
