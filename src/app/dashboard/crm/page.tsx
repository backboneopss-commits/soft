import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { createContact, deleteContact } from "./actions";
import type { Contact } from "@/lib/types";

export default async function CrmPage() {
  const { profile } = await getCurrentUser();
  const supabase = createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });
  const contacts = (data ?? []) as Contact[];

  const isAdmin = profile.role === "admin";

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle={`${contacts.length} contacto${
          contacts.length === 1 ? "" : "s"
        } en tu cliente.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Listado */}
        <div className="card overflow-hidden p-0">
          {contacts.length === 0 ? (
            <div className="p-5">
              <EmptyState>
                Todavía no hay contactos. Cargá el primero desde el formulario.
              </EmptyState>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Origen</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.full_name}</div>
                      {c.instagram && (
                        <div className="text-xs text-white/40">
                          @{c.instagram.replace(/^@/, "")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                      {!c.email && !c.phone && (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {c.source ?? <span className="text-white/30">—</span>}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <form action={deleteContact}>
                          <input type="hidden" name="id" value={c.id} />
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

        {/* Alta */}
        <div className="card h-fit">
          <h2 className="mb-4 font-medium">Nuevo contacto</h2>
          <form action={createContact} className="space-y-3">
            <div>
              <label className="label">Nombre *</label>
              <input name="full_name" className="input" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input name="phone" className="input" />
            </div>
            <div>
              <label className="label">Instagram</label>
              <input name="instagram" className="input" placeholder="@usuario" />
            </div>
            <div>
              <label className="label">Origen</label>
              <input
                name="source"
                className="input"
                placeholder="ads, orgánico, referido…"
              />
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea name="notes" className="input" rows={3} />
            </div>
            <button className="btn w-full">Agregar contacto</button>
          </form>
        </div>
      </div>
    </div>
  );
}
