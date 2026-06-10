import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ROLE_LABELS, type Profile, type UserRole } from "@/lib/types";
import { changeRole, assignMember } from "./actions";

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  const members = (data ?? []) as Profile[];

  const roles: UserRole[] = ["admin", "closer", "setter"];

  return (
    <div>
      <PageHeader
        title="Equipo"
        subtitle="Gestioná quién accede a este cliente y con qué rol."
      />

      {searchParams.error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {searchParams.error}
        </div>
      )}
      {searchParams.message && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {searchParams.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                <th className="px-4 py-3 font-medium">Miembro</th>
                <th className="px-4 py-3 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {m.full_name ?? "Sin nombre"}
                      {m.id === profile.id && (
                        <span className="ml-2 text-xs text-white/40">(vos)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.id === profile.id ? (
                      <span className="badge bg-brand-600/20 text-brand-200">
                        {ROLE_LABELS[m.role]}
                      </span>
                    ) : (
                      <form action={changeRole}>
                        <input type="hidden" name="id" value={m.id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          className="input w-36 py-1 text-xs"
                          // El cambio se confirma con el botón de al lado.
                        >
                          {roles.map((r) => (
                            <option key={r} value={r} className="bg-zinc-900">
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <button className="btn-ghost ml-2 px-2 py-1 text-xs">
                          Guardar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card h-fit">
          <h2 className="mb-2 font-medium">Invitar / asignar miembro</h2>
          <p className="mb-4 text-sm text-white/50">
            La persona debe crear su cuenta primero en la pantalla de registro.
            Después la asignás acá por su email.
          </p>
          <form action={assignMember} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                name="email"
                type="email"
                className="input"
                placeholder="persona@email.com"
                required
              />
            </div>
            <div>
              <label className="label">Rol</label>
              <select name="role" className="input" defaultValue="setter">
                {roles.map((r) => (
                  <option key={r} value={r} className="bg-zinc-900">
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn w-full">Asignar al cliente</button>
          </form>
        </div>
      </div>
    </div>
  );
}
