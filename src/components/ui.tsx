import type { DealStage } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-white/40">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-white/40">{hint}</div>}
    </div>
  );
}

const STAGE_STYLES: Record<DealStage, string> = {
  lead: "bg-white/10 text-white/70",
  contactado: "bg-sky-500/20 text-sky-300",
  agendado: "bg-indigo-500/20 text-indigo-300",
  presentado: "bg-amber-500/20 text-amber-300",
  ganado: "bg-emerald-500/20 text-emerald-300",
  perdido: "bg-red-500/20 text-red-300",
};

export function StageBadge({
  stage,
  label,
}: {
  stage: DealStage;
  label: string;
}) {
  return <span className={`badge ${STAGE_STYLES[stage]}`}>{label}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="card border-dashed text-center text-sm text-white/40">
      {children}
    </div>
  );
}
