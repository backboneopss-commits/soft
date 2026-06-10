import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import StageSelect from "@/components/StageSelect";
import { createDeal, deleteDeal } from "./actions";
import type { Contact, Deal } from "@/lib/types";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function VentasPage() {
  const { profile } = await getCurrentUser();
  const supabase = createClient();

  const [{ data: dealsData }, { data: contactsData }] = await Promise.all([
    supabase.from("deals").select("*").order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, full_name").order("full_name"),
  ]);

  const deals = (dealsData ?? []) as Deal[];
  const contacts = (contactsData ?? []) as Pick<Contact, "id" | "full_name">[];
  const contactName = new Map(contacts.map((c) => [c.id, c.full_name]));
  const isAdmin = profile.role === "admin";

  return (
    <div>
      <PageHeader
        title="Ventas"
        subtitle="Tu pipeline. Cambiá la etapa y se actualiza al instante."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden p-0">
          {deals.length === 0 ? (
            <div className="p-5">
              <EmptyState>
                Sin oportunidades todavía. Creá la primera a la derecha.
              </EmptyState>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                  <th className="px-4 py-3 font-medium">Oportunidad</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Etapa</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{d.title}</div>
                      {d.contact_id && contactName.get(d.contact_id) && (
                        <div className="text-xs text-white/40">
                          {contactName.get(d.contact_id)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {money(Number(d.value || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <StageSelect dealId={d.id} current={d.stage} />
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <form action={deleteDeal}>
                          <input type="hidden" name="id" value={d.id} />
                          <button className="text-xs text-red-400/70 hover:text-red-400">
                            Eliminar
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
