import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import CobranzaRow from "@/components/CobranzaRow";
import { createCobranza } from "./actions";
import {
  ESTADO_PAGO_OPTIONS,
  TIPO_CUOTA_OPTIONS,
  type Cobranza,
  type EstadoPago,
  type Program,
} from "@/lib/types";

type Member = { id: string; full_name: string | null; role: string };

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default async function CobranzasPage({
  searchParams,
}: {
  searchParams: { estado?: string; mes?: string };
}) {
  const { profile } = await getCurrentUser();
  if (profile.role === "setter") {
    return (
      <div>
        <PageHeader title="Cobranzas" />
        <EmptyState>Esta sección es para closers y administradores.</EmptyState>
      </div>
    );
  }
  const isAdmin = profile.role === "admin";
  const supabase = createClient();

  const estado = ESTADO_PAGO_OPTIONS.includes(searchParams.estado as EstadoPago)
    ? (searchParams.estado as EstadoPago)
    : undefined;
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : undefined;

  let query = supabase
    .from("cobranzas")
    .select("*")
    .order("fecha_cobro", { ascending: false, nullsFirst: false });
  if (!isAdmin) query = query.eq("closer_id", profile.id);
  if (estado) query = query.eq("estado", estado);
  if (mes) {
    const [y, m] = mes.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    query = query.gte("fecha_cobro", `${mes}-01`).lt("fecha_cobro", next);
  }

  const [{ data: cobData }, { data: membersData }, { data: programsData }] =
    await Promise.all([
      query,
      supabase.from("profiles").select("id, full_name, role").order("full_name"),
      supabase.from("programs").select("id, name").order("name"),
    ]);

  const cobranzas = (cobData ?? []) as Cobranza[];
  const members = (membersData ?? []) as Member[];
  const programs = (programsData ?? []) as Pick<Program, "id" | "name">[];
  const closers = members.filter((m) => m.role === "closer" || m.role === "admin");

  // Resumen (sobre lo filtrado).
  const cobrado = cobranzas.reduce((s, c) => s + Number(c.monto_cobrado || 0), 0);
  const sumBy = (e: EstadoPago) =>
    cobranzas.filter((c) => c.estado === e).reduce((s, c) => s + Number(c.monto_por_cobrar || 0), 0);
  const porCobrar = sumBy("Por Cobrar");
  const enAtraso = sumBy("En Atraso");
  const noPaga = sumBy("No Paga");
  const base = cobrado + porCobrar + enAtraso + noPaga;
  const efectiva = base > 0 ? ((cobrado / base) * 100).toFixed(1) : "0";

  const filterHref = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { estado, mes, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const qs = p.toString();
    return `/dashboard/cobranzas${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Cobranzas"
        subtitle="Cuotas y cobros. Seguí qué está cobrado, por cobrar o en atraso."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Cobrado" value={money(cobrado)} />
        <StatCard label="Por cobrar" value={money(porCobrar)} />
        <StatCard label="En atraso" value={money(enAtraso)} />
        <StatCard label="No paga" value={money(noPaga)} />
        <StatCard label="% cobranza efectiva" value={`${efectiva}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Link
              href={filterHref({ estado: undefined })}
              className={`badge ${!estado ? "bg-brand-600/30 text-white" : "bg-white/10 text-white/60"}`}
            >
              Todas
            </Link>
            {ESTADO_PAGO_OPTIONS.map((s) => (
              <Link
                key={s}
                href={filterHref({ estado: s })}
                className={`badge ${estado === s ? "bg-brand-600/30 text-white" : "bg-white/10 text-white/60"}`}
              >
                {s}
              </Link>
            ))}
          </div>

          <form className="mb-4 flex gap-2">
            {estado && <input type="hidden" name="estado" value={estado} />}
            <input name="mes" defaultValue={mes ?? ""} type="month" className="input w-44" />
            <button className="btn-ghost">Filtrar mes</button>
          </form>

          <div className="card overflow-x-auto p-0">
            {cobranzas.length === 0 ? (
              <div className="p-5">
                <EmptyState>Sin cobranzas con esos filtros. Cargá una a la derecha.</EmptyState>
              </div>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                    <th className="px-4 py-3 font-medium">Lead</th>
                    <th className="px-4 py-3 font-medium">Closer</th>
                    <th className="px-4 py-3 font-medium">Cobro</th>
                    <th className="px-4 py-3 font-medium">Monto</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {cobranzas.map((c) => (
                    <CobranzaRow
                      key={c.id}
                      cobranza={c}
                      members={members}
                      canEdit={isAdmin || c.closer_id === profile.id}
                      canDelete={isAdmin}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card h-fit">
          <h2 className="mb-4 font-medium">Nueva cobranza</h2>
          <form action={createCobranza} className="space-y-3">
            <div>
              <label className="label">Lead *</label>
              <input name="lead_nombre" className="input" placeholder="Nombre del cliente" required />
            </div>
            <div>
              <label className="label">Programa</label>
              <input name="programa" list="programas" className="input" placeholder="BIG4 1 A 1…" />
            </div>
            {profile.role !== "closer" && (
              <div>
                <label className="label">Closer</label>
                <select name="closer_id" className="input" defaultValue="">
                  <option value="" className="bg-zinc-900">—</option>
                  {closers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-zinc-900">{m.full_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Fecha cobro</label>
              <input type="date" name="fecha_cobro" className="input" />
            </div>
            <div>
              <label className="label">Tipo cuota</label>
              <select name="tipo_cuota" className="input" defaultValue="">
                <option value="" className="bg-zinc-900">—</option>
                {TIPO_CUOTA_OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-zinc-900">{o}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Por cobrar ($)</label>
                <input type="number" name="monto_por_cobrar" min="0" step="1" className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Cobrado ($)</label>
                <input type="number" name="monto_cobrado" min="0" step="1" className="input" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="label">Estado</label>
              <select name="estado" className="input" defaultValue="Por Cobrar">
                {ESTADO_PAGO_OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-zinc-900">{o}</option>
                ))}
              </select>
            </div>
            <button className="btn w-full">Cargar cobranza</button>
          </form>
        </div>
      </div>

      <datalist id="programas">
        {programs.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
    </div>
  );
}
