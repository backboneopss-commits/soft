import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { upsertActivity, deleteActivity } from "./actions";
import type { SetterActivity } from "@/lib/types";

type Member = { id: string; full_name: string | null; role: string };

function pct(n: number, d: number) {
  return d > 0 ? `${((n / d) * 100).toFixed(0)}%` : "—";
}

export default async function ActividadPage() {
  const { profile } = await getCurrentUser();
  const isAdmin = profile.role === "admin";
  const supabase = createClient();

  let query = supabase
    .from("setter_activity")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(60);
  if (!isAdmin) query = query.eq("setter_id", profile.id);

  const [{ data: actData }, { data: membersData }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  const rows = (actData ?? []) as SetterActivity[];
  const members = (membersData ?? []) as Member[];
  const setters = members.filter((m) => m.role === "setter" || m.role === "admin");
  const setterName = (id: string) =>
    members.find((m) => m.id === id)?.full_name ?? "—";

  const today = new Date().toISOString().slice(0, 10);

  // Totales del período visible.
  const sum = (k: keyof SetterActivity) =>
    rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const conv = sum("conversaciones");
  const calend = sum("calendarios_enviados");
  const calls = sum("calls_agendadas");

  return (
    <div>
      <PageHeader
        title="Actividad de setters"
        subtitle="Tracking diario: conversaciones, calendarios y calls agendadas."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Conversaciones" value={String(conv)} hint="período visible" />
        <StatCard label="Calendarios" value={String(calend)} />
        <StatCard label="Calls agendadas" value={String(calls)} />
        <StatCard label="Tasa agenda/conv" value={pct(calls, conv)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState>Sin registros todavía. Cargá tu día a la derecha.</EmptyState>
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                  <th className="px-3 py-3 font-medium">Fecha</th>
                  {isAdmin && <th className="px-3 py-3 font-medium">Setter</th>}
                  <th className="px-3 py-3 font-medium">Conv.</th>
                  <th className="px-3 py-3 font-medium">Follow</th>
                  <th className="px-3 py-3 font-medium">Calend.</th>
                  <th className="px-3 py-3 font-medium">Calls</th>
                  <th className="px-3 py-3 font-medium">Ag/Cal</th>
                  <th className="px-3 py-3 font-medium">Ag/Conv</th>
                  {isAdmin && <th className="px-3 py-3" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-3 py-2 text-white/70">{r.fecha}</td>
                    {isAdmin && <td className="px-3 py-2 text-white/60">{setterName(r.setter_id)}</td>}
                    <td className="px-3 py-2">{r.conversaciones}</td>
                    <td className="px-3 py-2">{r.follow_ups}</td>
                    <td className="px-3 py-2">{r.calendarios_enviados}</td>
                    <td className="px-3 py-2">{r.calls_agendadas}</td>
                    <td className="px-3 py-2 text-white/60">{pct(r.calls_agendadas, r.calendarios_enviados)}</td>
                    <td className="px-3 py-2 text-white/60">{pct(r.calls_agendadas, r.conversaciones)}</td>
                    {isAdmin && (
                      <td className="px-3 py-2 text-right">
                        <form action={deleteActivity}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-xs text-red-400/70 hover:text-red-400">✕</button>
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
          <h2 className="mb-1 font-medium">Cargar día</h2>
          <p className="mb-4 text-xs text-white/40">
            Si ya cargaste ese día, se actualiza (una fila por día).
          </p>
          <form action={upsertActivity} className="space-y-3">
            <div>
              <label className="label">Fecha</label>
              <input type="date" name="fecha" defaultValue={today} className="input" />
            </div>
            {isAdmin && (
              <div>
                <label className="label">Setter</label>
                <select name="setter_id" className="input" defaultValue={profile.id}>
                  {setters.map((m) => (
                    <option key={m.id} value={m.id} className="bg-zinc-900">{m.full_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Conversaciones</label>
                <input type="number" name="conversaciones" min="0" className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Follow-ups</label>
                <input type="number" name="follow_ups" min="0" className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Pitch call</label>
                <input type="number" name="pitch_call" min="0" className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Calendarios</label>
                <input type="number" name="calendarios_enviados" min="0" className="input" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="label">Calls agendadas</label>
                <input type="number" name="calls_agendadas" min="0" className="input" placeholder="0" />
              </div>
            </div>
            <button className="btn w-full">Guardar día</button>
          </form>
        </div>
      </div>
    </div>
  );
}
