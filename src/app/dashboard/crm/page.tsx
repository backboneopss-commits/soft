import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import ContactRow from "@/components/ContactRow";
import { createContact } from "./actions";
import type { Contact } from "@/lib/types";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { profile } = await getCurrentUser();
  const supabase = createClient();

  const q = (searchParams.q ?? "").trim().replace(/[,()]/g, "");

  let query = supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,instagram.ilike.%${q}%,source.ilike.%${q}%`
    );
  }
  const { data } = await query;
  const contacts = (data ?? []) as Contact[];
  const isAdmin = profile.role === "admin";

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle={`${contacts.length} contacto${
          contacts.length === 1 ? "" : "s"
        }${q ? ` para “${q}”` : " en tu cliente."}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {/* Búsqueda */}
          <form className="mb-4 flex gap-2">
            <input
              name="q"
              defaultValue={q}
              className="input"
              placeholder="Buscar por nombre, email, Instagram u origen…"
            />
            <button className="btn-ghost">Buscar</button>
          </form>

          <div className="card overflow-hidden p-0">
            {contacts.length === 0 ? (
              <div className="p-5">
                <EmptyState>
                  {q
                    ? "No hay contactos que coincidan con la búsqueda."
                    : "Todavía no hay contactos. Cargá el primero a la derecha."}
                </EmptyState>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 font-medium">Origen</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <ContactRow
                      key={c.id}
                      contact={c}
                      canEdit={isAdmin || c.owner_id === profile.id}
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
