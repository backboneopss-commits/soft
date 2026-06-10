import { PageHeader } from "@/components/ui";

export default function RedesPage() {
  return (
    <div>
      <PageHeader
        title="Redes & Métricas"
        subtitle="Instagram, TikTok y Facebook con métricas automáticas y anuncios."
      />

      <div className="card max-w-2xl">
        <span className="badge bg-amber-500/20 text-amber-300">Fase 3</span>
        <h2 className="mt-3 text-lg font-medium">Próximamente</h2>
        <p className="mt-2 text-sm text-white/60">
          Vas a conectar las cuentas de cada cliente y traer métricas
          automáticamente: alcance, interacción, seguidores, rendimiento de
          contenido y de anuncios (Ads).
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {["Instagram", "TikTok", "Facebook"].map((red) => (
            <div
              key={red}
              className="rounded-lg border border-white/10 bg-white/5 p-3 text-center text-sm"
            >
              {red}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/40">
          Nota: estas plataformas usan APIs oficiales (Instagram Graph API,
          TikTok Business API) que requieren cuentas Business y aprobación de
          permisos por parte de Meta/TikTok. Lo dejamos preparado para enchufar.
        </p>
      </div>
    </div>
  );
}
