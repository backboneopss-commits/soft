import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/ui";
import { saveGoals } from "./actions";
import {
  DEFAULT_GOALS,
  BONUS_SETTER,
  BONUS_CLOSER,
  type Lead,
  type Cobranza,
  type SetterActivity,
  type OrgGoals,
} from "@/lib/types";

type Member = { id: string; full_name: string | null; role: string };

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
function pct(n: number, d: number) {
  return d > 0 ? (n / d) * 100 : 0;
}
function bestTier(value: number, tiers: { min: number; premio: number }[]) {
  return tiers.find((t) => value >= t.min)?.premio ?? 0;
}

function monthShift(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const { profile } = await getCurrentUser();
  const isAdmin = profile.role === "admin";
  const supabase = createClient();

  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "")
    ? searchParams.mes!
    : new Date().toISOString().slice(0, 7);
  const [y, m] = mes.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const start = `${mes}-01`;

  const [
    { data: leadsData },
    { data: actData },
    { data: cobData },
    { data: membersData },
    { data: goalsData },
  ] = await Promise.all([
    supabase.from("leads").select("*").gte("fecha_agenda", start).lt("fecha_agenda", next),
    supabase.from("setter_activity").select("*").gte("fecha", start).lt("fecha", next),
    supabase.from("cobranzas").select("*").gte("fecha_cobro", start).lt("fecha_cobro", next),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
    supabase.from("org_goals").select("*").maybeSingle(),
  ]);

  const leads = (leadsData ?? []) as Lead[];
  const activity = (actData ?? []) as SetterActivity[];
  const cobranzas = (cobData ?? []) as Cobranza[];
  const members = (membersData ?? []) as Member[];
  const goals = (goalsData as OrgGoals | null) ?? {
    organization_id: "",
    ...DEFAULT_GOALS,
    updated_at: "",
  };
  const name = (id: string | null) =>
    members.find((mm) => mm.id === id)?.full_name ?? "—";

  // ── Embudo + KPIs ──
  const conversaciones = activity.reduce((s, a) => s + a.conversaciones, 0);
  const calendarios = activity.reduce((s, a) => s + a.calendarios_enviados, 0);
  const agendasTotales = leads.length;
  const calificadas = leads.filter((l) => l.calificacion === "CALIFICADO").length;
  const presentadas = leads.filter((l) => l.show_up === "SI").length;
  const unidades = leads.filter((l) => l.estado === "COMPRÓ").length;
  const cashCollected = leads.reduce((s, l) => s + Number(l.cash_collected || 0), 0);
  const tasaCierre = pct(unidades, presentadas);
  const showUpRate = pct(presentadas, agendasTotales);

  const funnel = [
    { etapa: "Conversaciones (DMs)", val: conversaciones },
    { etapa: "Calendarios enviados", val: calendarios },
    { etapa: "Agendas (calls)", val: agendasTotales },
    { etapa: "Agendas calificadas", val: calificadas },
    { etapa: "Presentadas (show up)", val: presentadas },
    { etapa: "Unidades cerradas", val: unidades },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.val));

  // ── Leaderboard setters ──
  const setterRows = members
    .filter((mm) => mm.role === "setter" || mm.role === "admin")
    .map((mm) => {
      const own = leads.filter((l) => l.setter_id === mm.id);
      const cal = own.filter((l) => l.calificacion === "CALIFICADO").length;
      const su = own.filter((l) => l.show_up === "SI").length;
      const cash = own.reduce((s, l) => s + Number(l.cash_collected || 0), 0);
      const bonus = bestTier(cash, BONUS_SETTER.cash) + bestTier(cal, BONUS_SETTER.calificadas);
      return { id: mm.id, name: mm.full_name ?? "—", agendas: own.length, cal, su, cash, bonus };
    })
    .filter((r) => r.agendas > 0)
    .sort((a, b) => b.cash - a.cash);

  // ── Leaderboard closers ──
  const closerRows = members
    .filter((mm) => mm.role === "closer" || mm.role === "admin")
    .map((mm) => {
      const own = leads.filter((l) => l.closer_id === mm.id);
      const cerr = own.filter((l) => l.estado === "COMPRÓ").length;
      const cash = own.reduce((s, l) => s + Number(l.cash_collected || 0), 0);
      const bonus = bestTier(cash, BONUS_CLOSER.cash) + bestTier(cerr, BONUS_CLOSER.unidades);
      return {
        id: mm.id,
        name: mm.full_name ?? "—",
        llamadas: own.length,
        cerr,
        cash,
        aov: cerr > 0 ? cash / cerr : 0,
        bonus,
      };
    })
    .filter((r) => r.llamadas > 0)
    .sort((a, b) => b.cash - a.cash);

  // ── Performance por fuente ──
  const fuentes = new Map<string, { agendas: number; cal: number; cerr: number; cash: number }>();
  for (const l of leads) {
    const f = l.fuente ?? "Sin fuente";
    const cur = fuentes.get(f) ?? { agendas: 0, cal: 0, cerr: 0, cash: 0 };
    cur.agendas += 1;
    if (l.calificacion === "CALIFICADO") cur.cal += 1;
    if (l.estado === "COMPRÓ") cur.cerr += 1;
    cur.cash += Number(l.cash_collected || 0);
    fuentes.set(f, cur);
  }
  const fuenteRows = [...fuentes.entries()].sort((a, b) => b[1].cash - a[1].cash);

  // ── Cobranzas del mes ──
  const cobrado = cobranzas.reduce((s, c) => s + Number(c.monto_cobrado || 0), 0);
  const cobSum = (e: string) =>
    cobranzas.filter((c) => c.estado === e).reduce((s, c) => s + Number(c.monto_por_cobrar || 0), 0);
  const porCobrar = cobSum("Por Cobrar");
  const enAtraso = cobSum("En Atraso");
  const noPaga = cobSum("No Paga");
  const cobBase = cobrado + porCobrar + enAtraso + noPaga;
  const cobEfectiva = pct(cobrado, cobBase);

  const goalRows = [
    { label: "Cash collected", val: cashCollected, meta: Number(goals.meta_cash_collected), money: true },
    { label: "Unidades cerradas", val: unidades, meta: Number(goals.meta_unidades), money: false },
    { label: "Tasa de cierre", val: tasaCierre, meta: Number(goals.meta_tasa_cierre), pctv: true },
    { label: "Agendas calificadas", val: calificadas, meta: Number(goals.meta_agendas_calif), money: false },
    { label: "Show up rate", val: showUpRate, meta: Number(goals.meta_show_up_rate), pctv: true },
    { label: "Agenda / calendario", val: pct(agendasTotales, calendarios), meta: Number(goals.meta_agenda_calendario), pctv: true },
  ];

  return (
    <div>
      <PageHeader title="Resumen de ventas" subtitle="Métricas del equipo por mes." />

      {/* Selector de mes */}
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/dashboard?mes=${monthShift(mes, -1)}`} className="btn-ghost">←</Link>
        <span className="font-medium">{mes}</span>
        <Link href={`/dashboard?mes=${monthShift(mes, 1)}`} className="btn-ghost">→</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Cash collected" value={money(cashCollected)} hint="día 1 del mes" />
        <StatCard label="Unidades cerradas" value={String(unidades)} hint={`meta ${goals.meta_unidades}`} />
        <StatCard label="Tasa de cierre" value={`${tasaCierre.toFixed(1)}%`} hint="s/ presentadas" />
        <StatCard label="Show up rate" value={`${showUpRate.toFixed(1)}%`} hint={`${presentadas}/${agendasTotales}`} />
      </div>

      {/* Metas / progreso */}
      <div className="mt-8 card">
        <h2 className="mb-4 font-medium">Metas del mes</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goalRows.map((g) => {
            const p = g.meta > 0 ? Math.min(100, (g.val / g.meta) * 100) : 0;
            const fmt = (v: number) =>
              g.money ? money(v) : g.pctv ? `${v.toFixed(1)}%` : String(Math.round(v));
            return (
              <div key={g.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-white/70">{g.label}</span>
                  <span className="text-white/50">{fmt(g.val)} / {fmt(g.meta)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${p >= 100 ? "bg-emerald-500" : "bg-brand-500"}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-white/50">Editar metas</summary>
            <form action={saveGoals} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              <Goal name="meta_cash_collected" label="Cash collected ($)" value={goals.meta_cash_collected} />
              <Goal name="meta_unidades" label="Unidades" value={goals.meta_unidades} />
              <Goal name="meta_tasa_cierre" label="Tasa cierre (%)" value={goals.meta_tasa_cierre} />
              <Goal name="meta_agendas_calif" label="Agendas calif." value={goals.meta_agendas_calif} />
              <Goal name="meta_show_up_rate" label="Show up (%)" value={goals.meta_show_up_rate} />
              <Goal name="meta_agenda_calendario" label="Agenda/calend. (%)" value={goals.meta_agenda_calendario} />
              <div className="col-span-2 md:col-span-3">
                <button className="btn">Guardar metas</button>
              </div>
            </form>
          </details>
        )}
      </div>

      {/* Embudo */}
      <div className="mt-6 card">
        <h2 className="mb-4 font-medium">Embudo del mes</h2>
        <div className="space-y-3">
          {funnel.map((f, i) => {
            const prev = i > 0 ? funnel[i - 1].val : 0;
            return (
              <div key={f.etapa} className="flex items-center gap-3">
                <div className="w-44 shrink-0 text-sm text-white/70">{f.etapa}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(f.val / funnelMax) * 100}%` }} />
                </div>
                <div className="w-12 text-right text-sm text-white/60">{f.val}</div>
                <div className="w-14 text-right text-xs text-white/40">
                  {i > 0 ? `${pct(f.val, prev).toFixed(0)}%` : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Leaderboard setters */}
        <div className="card overflow-x-auto">
          <h2 className="mb-4 font-medium">Leaderboard setters</h2>
          <Table head={["Setter", "Agendas", "Calif.", "% Cal", "Show", "Cash", "Bonus"]}>
            {setterRows.length === 0 ? (
              <EmptyRow cols={7} />
            ) : (
              setterRows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <Td>{r.name}</Td>
                  <Td>{r.agendas}</Td>
                  <Td>{r.cal}</Td>
                  <Td>{pct(r.cal, r.agendas).toFixed(0)}%</Td>
                  <Td>{pct(r.su, r.agendas).toFixed(0)}%</Td>
                  <Td>{money(r.cash)}</Td>
                  <Td>{r.bonus ? money(r.bonus) : "—"}</Td>
                </tr>
              ))
            )}
          </Table>
        </div>

        {/* Leaderboard closers */}
        <div className="card overflow-x-auto">
          <h2 className="mb-4 font-medium">Leaderboard closers</h2>
          <Table head={["Closer", "Llam.", "Cerr.", "Tasa", "Cash", "AOV", "Bonus"]}>
            {closerRows.length === 0 ? (
              <EmptyRow cols={7} />
            ) : (
              closerRows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <Td>{r.name}</Td>
                  <Td>{r.llamadas}</Td>
                  <Td>{r.cerr}</Td>
                  <Td>{pct(r.cerr, r.llamadas).toFixed(0)}%</Td>
                  <Td>{money(r.cash)}</Td>
                  <Td>{money(r.aov)}</Td>
                  <Td>{r.bonus ? money(r.bonus) : "—"}</Td>
                </tr>
              ))
            )}
          </Table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Performance por fuente */}
        <div className="card overflow-x-auto">
          <h2 className="mb-4 font-medium">Performance por fuente</h2>
          <Table head={["Fuente", "Agendas", "Calif.", "Cerr.", "% Cierre", "Cash"]}>
            {fuenteRows.length === 0 ? (
              <EmptyRow cols={6} />
            ) : (
              fuenteRows.map(([f, v]) => (
                <tr key={f} className="border-b border-white/5 last:border-0">
                  <Td>{f}</Td>
                  <Td>{v.agendas}</Td>
                  <Td>{v.cal}</Td>
                  <Td>{v.cerr}</Td>
                  <Td>{pct(v.cerr, v.agendas).toFixed(0)}%</Td>
                  <Td>{money(v.cash)}</Td>
                </tr>
              ))
            )}
          </Table>
        </div>

        {/* Cobranzas del mes */}
        <div className="card">
          <h2 className="mb-4 font-medium">Cobranzas del mes</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Cobrado" value={money(cobrado)} />
            <StatCard label="Por cobrar" value={money(porCobrar)} />
            <StatCard label="En atraso" value={money(enAtraso)} />
            <StatCard label="% efectiva" value={`${cobEfectiva.toFixed(1)}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Goal({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type="number" min="0" step="1" defaultValue={Number(value)} className="input" />
    </div>
  );
}
function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
          {head.map((h) => (
            <th key={h} className="px-3 py-2 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-white/70">{children}</td>;
}
function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-6 text-center text-sm text-white/30">
        Sin datos este mes.
      </td>
    </tr>
  );
}
