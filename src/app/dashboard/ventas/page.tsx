import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import DealRow from "@/components/DealRow";
import { createDeal } from "./actions";
import {
  STAGE_LABELS,
  STAGE_ORDER,
  type Contact,
  type Deal,
  type DealStage,
} from "@/lib/types";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: { q?: string; stage?: string };
}) {
  const { profile } = await getCurrentUser();
  const supabase = createClient();

  const q = (searchParams.q ?? "").trim().replace(/[,()]/g, "");
  const stage = searchParams.stage as DealStage | undefined;
  const validStage = stage && STAGE_ORDER.includes(stage) ? stage : undefined;

  let dealsQuery = supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false });
  if (validStage) dealsQuery = dealsQuery.eq("stage", validStage);
  if (q) dealsQuery = dealsQuery.ilike("title", `%${q}%`);

  const [{ data: dealsData }, { data: contactsData }] = await Promise.all([
    dealsQuery,
    supabase.from("contacts").select("id, full_name").order("full_name"),
  ]);

  const deals = (dealsData ?? []) as Deal[];
  const contacts = (contactsData ?? []) as Pick<Contact, "id" | "full_name">[];
  const contactName = new Map(contacts.map((c) => [c.id, c.full_name]));
  const isAdmin = profile.role === "admin";

  const filterHref = (s?: DealStage) => {
    const params = new URLSearchParams();
    if (s) params.set("stage", s);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/dashboard/ventas${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Ventas"
        subtitle="Tu pipeline. Cambiá la etapa, editá y filtrá al instante."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {/* Filtros por etapa */}
          <div className="mb-3 flex flex-wrap gap-2">
            <Link
              href={filterHref(undefined)}
              className={`badge ${
                !validStage ? "bg-brand-600/30 text-white" : "bg-white/10 text-white/60"
              }`}
            >
              Todas
            </Link>
            {STAGE_ORDER.map((s) => (
              <Link
                key={s}
                href={filterHref(s)}
                className={`badge ${
                  validStage === s
                    ? "bg-brand-600/30 text-white"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {STAGE_LABELS[s]}
              </Link>
            ))}
          </div>

          {/* Búsqueda */}
          <form className="mb-4 flex gap-2">
            {validStage && <input type="hidden" name="stage" value={validStage} />}
            <input
              name="q"
              defaultValue={q}
              className="input"
              placeholder="Buscar oportunidad por título…"
            />
            <button className="btn-ghost">Buscar</button>
          </form>

          <div className="card overflow-hidden p-0">
            {deals.length === 0 ? (
              <div className="p-5">
                <EmptyState>
                  {q || validStage
                    ? "No hay oportunidades con esos filtros."
                    : "Sin oportunidades todavía. Creá la primera a la derecha."}
                </EmptyState>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                    <th className="px-4 py-3 font-medium">Oportunidad</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Etapa</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => (
                    <DealRow
                      key={d.id}
                      deal={d}
                      contacts={contacts}
                      contactName={
                        d.contact_id ? contactName.get(d.contact_id) ?? null : null
                      }
                      canEdit={isAdmin || d.owner_id === profile.id}
                      canDelete={isAdmin}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Alta */}
        <div className="card h-fit">
          <h2 className="mb-4 font-medium">Nueva oportunidad</h2>
          <form action={createDeal} className="space-y-3">
            <div>
              <label className="label">Título *</label>
              <input
                name="title"
                className="input"
                placeholder="Ej: Plan trimestral"
                required
              />
            </div>
            <div>
              <label className="label">Valor (USD)</label>
              <input
                name="value"
                type="number"
                min="0"
                step="1"
                className="input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Contacto</label>
              <select name="contact_id" className="input">
                <option value="" className="bg-zinc-900">
                  — Sin contacto —
                </option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900">
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn w-full">Crear oportunidad</button>
          </form>
        </div>
      </div>
    </div>
  );
}
