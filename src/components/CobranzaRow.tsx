"use client";

import { useState } from "react";
import {
  TIPO_CUOTA_OPTIONS,
  ESTADO_PAGO_OPTIONS,
  ESTADO_PAGO_COLORS,
  type Cobranza,
} from "@/lib/types";
import { updateCobranza, deleteCobranza } from "@/app/dashboard/cobranzas/actions";

type Member = { id: string; full_name: string | null; role: string };

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function CobranzaRow({
  cobranza,
  members,
  canEdit,
  canDelete,
}: {
  cobranza: Cobranza;
  members: Member[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const c = cobranza;
  const closers = members.filter((m) => m.role === "closer" || m.role === "admin");
  const closerName = members.find((m) => m.id === c.closer_id)?.full_name ?? "—";

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-white/5">
        <td colSpan={6} className="px-4 py-3">
          <form
            action={async (fd) => {
              await updateCobranza(fd);
              setEditing(false);
            }}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <input type="hidden" name="id" value={c.id} />
            <F label="Lead *">
              <input name="lead_nombre" defaultValue={c.lead_nombre} className="input" required />
            </F>
            <F label="Programa">
              <input name="programa" defaultValue={c.programa ?? ""} list="programas" className="input" />
            </F>
            <F label="Closer">
              <select name="closer_id" defaultValue={c.closer_id ?? ""} className="input">
                <option value="" className="bg-zinc-900">—</option>
                {closers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-zinc-900">{m.full_name}</option>
                ))}
              </select>
            </F>
            <F label="Fecha cobro">
              <input type="date" name="fecha_cobro" defaultValue={c.fecha_cobro ?? ""} className="input" />
            </F>
            <F label="Tipo cuota">
              <select name="tipo_cuota" defaultValue={c.tipo_cuota ?? ""} className="input">
                <option value="" className="bg-zinc-900">—</option>
                {TIPO_CUOTA_OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-zinc-900">{o}</option>
                ))}
              </select>
            </F>
            <F label="Estado">
              <select name="estado" defaultValue={c.estado} className="input">
                {ESTADO_PAGO_OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-zinc-900">{o}</option>
                ))}
              </select>
            </F>
            <F label="Monto por cobrar ($)">
              <input type="number" name="monto_por_cobrar" min="0" step="1" defaultValue={Number(c.monto_por_cobrar || 0)} className="input" />
            </F>
            <F label="Monto cobrado ($)">
              <input type="number" name="monto_cobrado" min="0" step="1" defaultValue={Number(c.monto_cobrado || 0)} className="input" />
            </F>
            <div />
            <div className="flex gap-2 md:col-span-3">
              <button className="btn" type="submit">Guardar</button>
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/5">
      <td className="px-4 py-3">
        <div className="font-medium">{c.lead_nombre}</div>
        <div className="text-xs text-white/40">{c.programa ?? ""}</div>
      </td>
      <td className="px-4 py-3 text-xs text-white/60">{closerName}</td>
      <td className="px-4 py-3 text-xs text-white/60">
        {c.fecha_cobro ?? "—"}
        {c.tipo_cuota && <div className="text-white/40">{c.tipo_cuota}</div>}
      </td>
      <td className="px-4 py-3 text-xs">
        <div className="text-emerald-300">{money(Number(c.monto_cobrado))}</div>
        <div className="text-white/40">de {money(Number(c.monto_por_cobrar))}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${ESTADO_PAGO_COLORS[c.estado]}`}>{c.estado}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3">
          {canEdit && (
            <button onClick={() => setEditing(true)} className="text-xs text-brand-400 hover:underline">
              Editar
            </button>
          )}
          {canDelete && (
            <form action={deleteCobranza}>
              <input type="hidden" name="id" value={c.id} />
              <button className="text-xs text-red-400/70 hover:text-red-400">Eliminar</button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
