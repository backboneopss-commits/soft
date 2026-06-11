import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import LeadRow from "@/components/LeadRow";
import { createLead, addProgram, deleteProgram } from "./actions";
import {
  ESTADO_OPTIONS,
  CALIFICACION_OPTIONS,
  FUENTE_OPTIONS,
  type Lead,
  type Program,
  type LeadEstado,
} from "@/lib/types";

type Member = { id: string; full_name: string | null; role: string };

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: { q?: string; estado?: string; mes?: string; setter?: string };
}) {
  const { profile } = await getCurrentUser();
  const isAdmin = profile.role === "admin";
  const supabase = createClient();

  const q = (searchParams.q ?? "").trim().replace(/[,()]/g, "");
  const estado = ESTADO_OPTIONS.includes(searchParams.estado as LeadEstado)
    ? (searchParams.estado as LeadEstado)
    : undefined;
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : undefined;

  let query = supabase.from("leads").select("*").order("fecha_agenda", {
    ascending: false,
    nullsFirst: false,
  });

  // Vista por rol: el setter ve sus leads; el closer los suyos; admin todo.
  if (profile.role === "setter") query = query.eq("setter_id", profile.id);
  else if (profile.role === "closer") query = query.eq("closer_id", profile.id);

  if (estado) query = query.eq("estado", estado);
  if (q) query = query.ilike("nombre", `%${q}%`);
  if (mes) {
    const [y, m] = mes.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    query = query.gte("fecha_agenda", `${mes}-01`).lt("fecha_agenda", next);
  }

  const [{ data: leadsData }, { data: membersData }, { data: programsData }] =
    await Promise.all([
      query,
      supabase.from("profiles").select("id, full_name, role").order("full_name"),
      supabase.from("programs").select("*").order("name"),
    ]);

  const leads = (leadsData ?? []) as Lead[];
  const members = (membersData ?? []) as Member[];
  const programs = (programsData ?? []) as Program[];
  const setters = members.filter((m) => m.role === "setter" || m.role === "admin");
  const closers = members.filter((m) => m.role === "closer" || m.role === "admin");

  // Resumen rápido de lo que se está viendo.
  const cerrados = leads.filter((l) => l.estado === "COMPRÓ" || l.estado === "SEÑÓ").length;
  const cashTotal = leads.reduce((s, l) => s + Number(l.cash_collected || 0), 0);
  const restante = leads.reduce((s, l) => s + Number(l.monto_restante || 0), 0);

  const filterHref = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, estado, mes, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const qs = p.toString();
    return `/dashboard/ventas${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Ventas — Base de Leads"
        subtitle={
          profile.role === "setter"
            ? "Tus leads agendados. Cargá y seguí cada uno."
            : profile.role === "closer"
            ? "Tus llamadas asignadas. Registrá el resultado de cada call."
            : "Todos los leads del equipo. Filtrá, editá y seguí el pipeline."
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Leads" value={String(leads.length)} hint="en esta vista" />
        <StatCard label="Cerrados" value={String(cerrados)} hint="COMPRÓ + SEÑÓ" />
        <StatCard label="Cash collected" value={money(cashTotal)} hint="día 1" />
        <StatCard label="Por cobrar" value={money(restante)} hint="saldos abiertos" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {/* Filtros por estado */}
          <div className="mb-3 flex flex-wrap gap-2">
            <Link
              href={filterHref({ estado: undefined })}
              className={`badge ${!estado ? "bg-brand-600/30 text-white" : "bg-white/10 text-white/60"}`}
            >
              Todos
            </Link>
            {ESTADO_OPTIONS.map((s) => (
              <Link
                key={s}
                href={filterHref({ estado: s })}
                className={`badge ${estado === s ? "bg-brand-600/30 text-white" : "bg-white/10 text-white/60"}`}
              >
                {s}
              </Link>
            ))}
          </div>

          {/* Búsqueda + mes */}
          <form className="mb-4 flex flex-wrap gap-2">
            {estado && <input type="hidden" name="estado" value={estado} />}
            <input name="q" defaultValue={q} className="input flex-1" placeholder="Buscar lead por nombre…" />
            <input name="mes" defaultValue={mes ?? ""} type="month" className="input w-40" />
            <button className="btn-ghost">Filtrar</button>
          </form>

          <div className="card overflow-x-auto p-0">
            {leads.length === 0 ? (
              <div className="p-5">
                <EmptyState>
                  {q || estado || mes
                    ? "No hay leads con esos filtros."
                    : "Sin leads todavía. Cargá el primero a la derecha."}
                </EmptyState>
              </div>
            ) : (
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                    <th className="px-4 py-3 font-medium">Lead</th>
                    <th className="px-4 py-3 font-medium">Resp.</th>
                    <th className="px-4 py-3 font-medium">Calif.</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Plata</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <LeadRow
                      key={l.id}
                      lead={l}
                      members={members}
                      canEdit={
                        isAdmin ||
                        l.setter_id === profile.id ||
                        l.closer_id === profile.id
                      }
                      canDelete={isAdmin}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <div className="card h-fit">
            <h2 className="mb-4 font-medium">Nuevo lead</h2>
            <form action={createLead} className="space-y-3">
              <div>
                <label className="label">Lead *</label>
                <input name="nombre" className="input" placeholder="Nombre del prospecto" required />
              </div>
              <div>
                <label className="label">Contacto (link/tel)</label>
                <input name="contacto" className="input" placeholder="link de IG / ManyChat / tel" />
              </div>
              <div>
                <label className="label">Fecha agenda</label>
                <input type="date" name="fecha_agenda" className="input" />
              </div>
              <div>
                <label className="label">Fuente</label>
                <input name="fuente" list="fuentes" className="input" placeholder="Instagram DM…" />
              </div>
              <div>
                <label className="label">Programa</label>
                <input name="programa" list="programas" className="input" placeholder="BIG4 1 A 1…" />
              </div>
              {profile.role !== "setter" && (
                <div>
                  <label className="label">Setter</label>
                  <select name="setter_id" className="input" defaultValue="">
                    <option value="" className="bg-zinc-900">—</option>
                    {setters.map((m) => (
                      <option key={m.id} value={m.id} className="bg-zinc-900">{m.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                <label className="label">Calificación</label>
                <select name="calificacion" className="input" defaultValue="PENDIENTE">
                  {CALIFICACION_OPTIONS.map((o) => (
                    <option key={o} value={o} className="bg-zinc-900">{o}</option>
                  ))}
                </select>
              </div>
              <button className="btn w-full">Cargar lead</button>
            </form>
          </div>

          {/* Catálogo de programas (admin) */}
          {isAdmin && (
            <div className="card">
              <h2 className="mb-3 font-medium">Programas</h2>
              <div className="mb-3 space-y-1">
                {programs.length === 0 && (
                  <p className="text-xs text-white/40">Sin programas. Agregá el primero.</p>
                )}
                {programs.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.name} · {money(Number(p.price))}</span>
                    <form action={deleteProgram}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs text-red-400/60 hover:text-red-400">✕</button>
                    </form>
                  </div>
                ))}
              </div>
              <form action={addProgram} className="flex gap-2">
                <input name="name" className="input flex-1" placeholder="Programa" required />
                <input name="price" type="number" min="0" step="1" className="input w-24" placeholder="$" />
                <button className="btn-ghost">+</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Datalists para autocompletar */}
      <datalist id="fuentes">
        {FUENTE_OPTIONS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <datalist id="programas">
        {programs.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
    </div>
  );
}
