import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { addAccount, deleteAccount, syncAccount, loadDemoData } from "./actions";
import { fetchInstagramSnapshot } from "@/lib/instagram";
import {
  PLATFORM_LABELS,
  type SocialAccount,
  type SocialMetric,
  type SocialPost,
} from "@/lib/types";

function n(x: number) {
  return new Intl.NumberFormat("es-AR").format(x);
}

export default async function RedesPage({
  searchParams,
}: {
  searchParams: { account?: string; msg?: string };
}) {
  const { profile } = await getCurrentUser();
  const isAdmin = profile.role === "admin";
  const supabase = createClient();

  const { data: accountsData } = await supabase
    .from("social_accounts")
    .select("*")
    .order("created_at", { ascending: true });
  const accounts = (accountsData ?? []) as SocialAccount[];

  const activeId = searchParams.account ?? accounts[0]?.id ?? null;
  const active = accounts.find((a) => a.id === activeId) ?? null;

  // Si la cuenta tiene token, traemos métricas EN VIVO al abrir y guardamos
  // el snapshot del día (idempotente: una fila por día). Si Meta falla,
  // mostramos los datos guardados y un aviso.
  let liveError: string | null = null;
  let isLive = false;
  if (active?.access_token && active.platform === "instagram") {
    try {
      const snap = await fetchInstagramSnapshot(
        active.external_id ?? "",
        active.access_token
      );
      await supabase.from("social_metrics").upsert(
        {
          account_id: active.id,
          organization_id: active.organization_id,
          snapshot_date: new Date().toISOString().slice(0, 10),
          followers: snap.followers,
          reach: snap.reach,
          impressions: snap.impressions,
          profile_views: snap.profileViews,
          engagement: snap.engagement,
        },
        { onConflict: "account_id,snapshot_date" }
      );
      if (snap.posts.length) {
        await supabase.from("social_posts").upsert(
          snap.posts.map((p) => ({
            account_id: active.id,
            organization_id: active.organization_id,
            external_id: p.externalId,
            caption: p.caption,
            permalink: p.permalink,
            media_type: p.mediaType,
            likes: p.likes,
            comments: p.comments,
            posted_at: p.postedAt,
          })),
          { onConflict: "account_id,external_id" }
        );
      }
      await supabase
        .from("social_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", active.id);
      isLive = true;
    } catch (e) {
      liveError = e instanceof Error ? e.message : "No se pudo actualizar en vivo";
    }
  }

  let metrics: SocialMetric[] = [];
  let posts: SocialPost[] = [];
  if (active) {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase
        .from("social_metrics")
        .select("*")
        .eq("account_id", active.id)
        .order("snapshot_date", { ascending: true }),
      supabase
        .from("social_posts")
        .select("*")
        .eq("account_id", active.id)
        .order("likes", { ascending: false })
        .limit(5),
    ]);
    metrics = (m ?? []) as SocialMetric[];
    posts = (p ?? []) as SocialPost[];
  }

  const latest = metrics[metrics.length - 1];
  const first = metrics[0];
  const followerGrowth =
    latest && first ? latest.followers - first.followers : 0;
  const totalReach = metrics.reduce((s, x) => s + x.reach, 0);
  const totalEngagement = metrics.reduce((s, x) => s + x.engagement, 0);
  const engRate =
    latest && latest.followers > 0
      ? ((totalEngagement / metrics.length / latest.followers) * 100).toFixed(1)
      : "0";
  const maxFollowers = Math.max(1, ...metrics.map((x) => x.followers));
  const minFollowers = Math.min(...metrics.map((x) => x.followers), maxFollowers);

  return (
    <div>
      <PageHeader
        title="Redes & Métricas"
        subtitle="Seguidores, alcance, engagement y mejor contenido — por cuenta."
      />

      {searchParams.msg && (
        <div className="mb-4 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-brand-200">
          {searchParams.msg}
        </div>
      )}

      {liveError && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          No se pudo actualizar en vivo desde Instagram ({liveError}). Mostrando
          los últimos datos guardados.
        </div>
      )}

      {/* Selector de cuentas */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {accounts.map((a) => (
          <Link
            key={a.id}
            href={`/dashboard/redes?account=${a.id}`}
            className={`badge ${
              a.id === activeId
                ? "bg-brand-600/30 text-white"
                : "bg-white/10 text-white/60"
            }`}
          >
            {PLATFORM_LABELS[a.platform]} · @{a.handle.replace(/^@/, "")}
          </Link>
        ))}
        {accounts.length === 0 && (
          <span className="text-sm text-white/40">
            No hay cuentas conectadas todavía.
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {!active ? (
            <EmptyState>
              {isAdmin
                ? "Conectá tu primera cuenta de red a la derecha."
                : "Tu admin todavía no conectó cuentas de redes."}
            </EmptyState>
          ) : metrics.length === 0 ? (
            <EmptyState>
              Sin métricas todavía para @{active.handle.replace(/^@/, "")}.{" "}
              {isAdmin
                ? "Sincronizá o cargá datos de demo desde el panel."
                : "Esperá a que tu admin sincronice."}
            </EmptyState>
          ) : (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Seguidores"
                  value={n(latest.followers)}
                  hint={`${followerGrowth >= 0 ? "+" : ""}${n(
                    followerGrowth
                  )} en el período`}
                />
                <StatCard label="Alcance" value={n(totalReach)} hint="acumulado" />
                <StatCard
                  label="Engagement"
                  value={n(totalEngagement)}
                  hint="likes + comentarios"
                />
                <StatCard
                  label="Tasa engagement"
                  value={`${engRate}%`}
                  hint="promedio diario"
                />
              </div>

              {/* Tendencia de seguidores */}
              <div className="card">
                <h2 className="mb-4 font-medium">Seguidores (período)</h2>
                <div className="flex h-40 items-end gap-1">
                  {metrics.map((m) => {
                    const range = maxFollowers - minFollowers || 1;
                    const h = 15 + ((m.followers - minFollowers) / range) * 85;
                    return (
                      <div
                        key={m.id}
                        className="flex-1 rounded-t bg-brand-500/70 transition hover:bg-brand-400"
                        style={{ height: `${h}%` }}
                        title={`${m.snapshot_date}: ${n(m.followers)}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Top contenido */}
              <div className="card">
                <h2 className="mb-4 font-medium">Mejor contenido</h2>
                {posts.length === 0 ? (
                  <p className="text-sm text-white/40">Sin posts todavía.</p>
                ) : (
                  <div className="space-y-3">
                    {posts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm">
                            {p.caption ?? "(sin texto)"}
                          </div>
                          <div className="text-xs text-white/40">
                            {p.media_type ?? "POST"}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-4 text-xs text-white/60">
                          <span>♥ {n(p.likes)}</span>
                          <span>💬 {n(p.comments)}</span>
                          {p.permalink && (
                            <a
                              href={p.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-400 hover:underline"
                            >
                              Ver
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="flex items-center gap-2 text-xs text-white/30">
                {isLive && (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    En vivo
                  </span>
                )}
                {active.last_synced_at
                  ? `Última actualización: ${new Date(
                      active.last_synced_at
                    ).toLocaleString("es-AR")}`
                  : "Todavía sin datos."}
              </p>
            </div>
          )}
        </div>

        {/* Panel de gestión (admin) */}
        <div className="space-y-4">
          {isAdmin && active && (
            <div className="card">
              <h2 className="mb-3 font-medium">Acciones</h2>
              <div className="space-y-2">
                <form action={syncAccount}>
                  <input type="hidden" name="id" value={active.id} />
                  <button className="btn w-full">Sincronizar ahora</button>
                </form>
                <form action={loadDemoData}>
                  <input type="hidden" name="id" value={active.id} />
                  <button className="btn-ghost w-full">Cargar datos de demo</button>
                </form>
                <form action={deleteAccount}>
                  <input type="hidden" name="id" value={active.id} />
                  <button className="w-full text-xs text-red-400/70 hover:text-red-400">
                    Desconectar cuenta
                  </button>
                </form>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="card">
              <h2 className="mb-1 font-medium">Conectar Instagram</h2>
              <p className="mb-3 text-sm text-white/50">
                Iniciá sesión con la cuenta de Instagram (Business o Creator) y
                autorizá el acceso. Las métricas se actualizan en vivo.
              </p>
              <a
                href="/api/instagram/connect"
                className="btn flex w-full items-center justify-center gap-2"
              >
                Conectar con Instagram
              </a>
              <p className="mt-3 text-xs text-white/40">
                ¿Sin app de Meta configurada aún? Podés probar el panel con
                “Cargar datos de demo”.
              </p>
            </div>
          )}

          {isAdmin && (
            <details className="card">
              <summary className="cursor-pointer text-sm text-white/50">
                Conexión manual (avanzado)
              </summary>
              <form action={addAccount} className="mt-3 space-y-3">
                <div>
                  <label className="label">Red</label>
                  <select name="platform" className="input" defaultValue="instagram">
                    {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
                      <option key={v} value={v} className="bg-zinc-900">
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Usuario (@)</label>
                  <input name="handle" className="input" placeholder="tu_marca" required />
                </div>
                <div>
                  <label className="label">IG user id (opcional)</label>
                  <input name="external_id" className="input" placeholder="178414…" />
                </div>
                <div>
                  <label className="label">Access token (opcional)</label>
                  <input name="access_token" className="input" placeholder="IGAA…" />
                </div>
                <button className="btn w-full">Agregar</button>
              </form>
            </details>
          )}

          {!isAdmin && (
            <div className="card text-sm text-white/40">
              Solo los administradores pueden conectar y sincronizar cuentas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
