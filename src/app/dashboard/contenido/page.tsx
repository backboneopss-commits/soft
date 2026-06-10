import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { createAsset, deleteAsset } from "./actions";
import type { ContentAsset } from "@/lib/types";

const KIND_LABELS: Record<string, string> = {
  documento: "Documento",
  sop: "SOP",
  guion: "Guion",
  video: "Video",
  imagen: "Imagen",
};

export default async function ContenidoPage() {
  const { profile } = await getCurrentUser();
  const supabase = createClient();
  const { data } = await supabase
    .from("content_assets")
    .select("*")
    .order("created_at", { ascending: false });
  const assets = (data ?? []) as ContentAsset[];
  const isAdmin = profile.role === "admin";

  return (
    <div>
      <PageHeader
        title="Contenido & SOPs"
        subtitle="Biblioteca del cliente: documentos, procedimientos, guiones y links de Google Drive."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {assets.length === 0 ? (
            <EmptyState>
              Sin material todavía.{" "}
              {isAdmin
                ? "Agregá el primero con el formulario."
                : "Tu admin todavía no cargó contenido."}
            </EmptyState>
          ) : (
            assets.map((a) => (
              <div key={a.id} className="card flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-brand-600/20 text-brand-200">
                      {KIND_LABELS[a.kind] ?? a.kind}
                    </span>
                    <span className="font-medium">{a.title}</span>
                  </div>
                  {a.description && (
                    <p className="mt-1 text-sm text-white/50">{a.description}</p>
                  )}
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-brand-400 hover:underline"
                    >
                      Abrir →
                    </a>
                  )}
                </div>
                {isAdmin && (
                  <form action={deleteAsset}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-xs text-red-400/70 hover:text-red-400">
                      Eliminar
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>

        {isAdmin ? (
          <div className="card h-fit">
            <h2 className="mb-4 font-medium">Agregar material</h2>
            <form action={createAsset} className="space-y-3">
              <div>
                <label className="label">Título *</label>
                <input name="title" className="input" required />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select name="kind" className="input">
                  {Object.entries(KIND_LABELS).map(([v, l]) => (
                    <option key={v} value={v} className="bg-zinc-900">
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Link (Google Drive, etc.)</label>
                <input
                  name="url"
                  type="url"
                  className="input"
                  placeholder="https://drive.google.com/…"
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea name="description" className="input" rows={3} />
              </div>
              <button className="btn w-full">Agregar</button>
            </form>
          </div>
        ) : (
          <div className="card h-fit text-sm text-white/40">
            Solo los administradores pueden cargar contenido.
          </div>
        )}
      </div>
    </div>
  );
}
