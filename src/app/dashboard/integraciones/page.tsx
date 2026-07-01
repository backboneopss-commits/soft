import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { connectCalendly, disconnectCalendly, saveCalendlyRouting } from "./actions";
import type { CalendlySettings, Profile } from "@/lib/types";

export default async function IntegracionesPage({
  searchParams,
}: {
  searchParams: { msg?: string };
}) {
  const { profile } = await getCurrentUser();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = createClient();
  const [{ data: settingsData }, { data: membersData }] = await Promise.all([
    supabase.from("calendly_settings").select("*").maybeSingle(),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const settings = settingsData as CalendlySettings | null;
  const members = (membersData ?? []) as Profile[];
  const setters = members.filter((m) => m.role === "setter" || m.role === "admin");
  const closers = members.filter((m) => m.role === "closer" || m.role === "admin");
  const connected = !!settings?.connected;

  return (
    <div>
      <PageHeader
        title="Integraciones"
        subtitle="Conectá Calendly para que las agendas entren solas al CRM."
      />

      {searchParams.msg && (
        <div className="mb-4 rounded-lg border border-brand-500/30 bg-brand-600/10 px-4 py-3 text-sm text-white/80">
          {searchParams.msg}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {/* Estado de conexión */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">Calendly</h2>
              <p className="text-sm text-white/50">
                {connected
                  ? "Conectado. Las nuevas agendas se crean automáticamente."
                  : "No conectado."}
              </p>
            </div>
            <span
              className={`badge ${
                connected ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"
              }`}
            >
              {connected ? "● Activo" : "○ Inactivo"}
            </span>
          </div>

          {!connected && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-white/5 p-3 text-xs text-white/60">
                <p className="mb-1 font-medium text-white/70">Cómo obtener tu token:</p>
                <ol className="list-decimal space-y-0.5 pl-4">
                  <li>Entrá a Calendly → <b>Integrations &amp; apps</b> → <b>API &amp; webhooks</b>.</li>
                  <li>En <b>Personal access tokens</b>, generá uno y copialo.</li>
                  <li>Pegalo acá abajo. (Requiere plan pago de Calendly.)</li>
                </ol>
              </div>
              <form action={connectCalendly} className="space-y-3">
                <div>
                  <label className="label">Personal Access Token</label>
                  <input name="access_token" className="input" placeholder="eyJ… (token de Calendly)" required />
                </div>
                <div>
                  <label className="label">Setter (se asigna a todas las agendas)</label>
                  <select name="default_setter_id" className="input" defaultValue={profile.id}>
                    {setters.map((m) => (
                      <option key={m.id} value={m.id} className="bg-zinc-900">{m.full_name}</option>
                    ))}
                  </select>
                </div>
                <button className="btn w-full">Conectar Calendly</button>
              </form>
            </div>
          )}

          {connected && (
            <form action={disconnectCalendly} className="mt-4">
              <button className="btn-ghost text-sm text-red-400/80 hover:text-red-400">
                Desconectar
              </button>
            </form>
          )}
        </div>

        {/* Ruteo (solo si está conectado) */}
        {connected && (
          <div className="card">
            <h2 className="mb-1 font-medium">Ruteo de agendas</h2>
            <p className="mb-4 text-sm text-white/50">
              Cada closer tiene su propio link de Calendly. Poné el <b>email de Calendly</b> de
              cada uno para que el lead entre asignado al closer correcto.
            </p>
            <form action={saveCalendlyRouting} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Setter por defecto</label>
                  <select name="default_setter_id" className="input" defaultValue={settings?.default_setter_id ?? ""}>
                    {setters.map((m) => (
                      <option key={m.id} value={m.id} className="bg-zinc-900">{m.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Fuente por defecto</label>
                  <input name="default_fuente" className="input" defaultValue={settings?.default_fuente ?? "Calendly"} />
                </div>
              </div>

              <div className="pt-2">
                <label className="label">Email de Calendly de cada closer</label>
                <div className="space-y-2">
                  {closers.map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-sm text-white/70">{c.full_name}</span>
                      <input
                        name={`closer_email_${c.id}`}
                        defaultValue={c.calendly_email ?? ""}
                        placeholder="closer@email.com"
                        className="input flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn">Guardar ruteo</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
