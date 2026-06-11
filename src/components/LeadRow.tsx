"use client";

import { useState } from "react";
import {
  CALIFICACION_OPTIONS,
  SHOW_UP_OPTIONS,
  ESTADO_OPTIONS,
  ESTADO_COLORS,
  type Lead,
} from "@/lib/types";
import { updateLead, deleteLead } from "@/app/dashboard/ventas/actions";

type Member = { id: string; full_name: string | null; role: string };

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function LeadRow({
  lead,
  members,
  canEdit,
  canDelete,
}: {
  lead: Lead;
  members: Member[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const name = (id: string | null) =>
    members.find((m) => m.id === id)?.full_name ?? "—";
  const setters = members.filter((m) => m.role === "setter" || m.role === "admin");
  const closers = members.filter((m) => m.role === "closer" || m.role === "admin");

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-white/5">
        <td colSpan={6} className="px-4 py-3">
          <form
            action={async (fd) => {
              await updateLead(fd);
              setEditing(false);
            }}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <input type="hidden" name="id" value={lead.id} />
            <Field label="Lead *">
              <input name="nombre" defaultValue={lead.nombre} className="input" required />
            </Field>
            <Field label="Contacto (link/tel)">
              <input name="contacto" defaultValue={lead.contacto ?? ""} className="input" />
            </Field>
            <Field label="Fuente">
              <input name="fuente" defaultValue={lead.fuente ?? ""} list="fuentes" className="input" />
            </Field>

            <Field label="Fecha agenda">
              <input type="date" name="fecha_agenda" defaultValue={lead.fecha_agenda ?? ""} className="input" />
            </Field>
            <Field label="Fecha llamada">
              <input type="date" name="fecha_llamada" defaultValue={lead.fecha_llamada ?? ""} className="input" />
            </Field>
            <Field label="Audio">
              <select name="audio" defaultValue={lead.audio ?? ""} className="input">
                <option value="" className="bg-zinc-900">—</option>
                <option value="ENVIADO" className="bg-zinc-900">ENVIADO</option>
                <option value="NO ENVIADO" className="bg-zinc-900">NO ENVIADO</option>
              </select>
            </Field>

            <Field label="Setter">
              <select name="setter_id" defaultValue={lead.setter_id ?? ""} className="input">
                <option value="" className="bg-zinc-900">—</option>
                {setters.map((m) => (
                  <option key={m.id} value={m.id} className="bg-zinc-900">{m.full_name}</option>
                ))}
              </select>
            </Field>
            <Field label="Closer">
              <select name="closer_id" defaultValue={lead.closer_id ?? ""} className="input">
                <option value="" className="bg-zinc-900">—</option>
                {closers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-zinc-900">{m.full_name}</option>
                ))}
              </select>
            </Field>
            <Field label="Programa">
              <input name="programa" defaultValue={lead.programa ?? ""} list="programas" className="input" />
            </Field>

            <Field label="Calificación">
              <select name="calificacion" defaultValue={lead.calificacion} className="input">
                {CALIFICACION_OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-zinc-900">{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Show Up">
              <select name="show_up" defaultValue={lead.show_up ?? ""} className="input">
                <option value="" className="bg-zinc-900">—</option>
                {SHOW_UP_OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-zinc-900">{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select name="estado" defaultValue={lead.estado ?? ""} className="input">
                <option value="" className="bg-zinc-900">—</option>
                {ESTADO_OPTIONS.map((o) => (
                  <option key={o} value={o} className="bg-zinc-900">{o}</option>
                ))}
              </select>
            </Field>

            <Field label="Cash collected ($)">
              <input type="number" name="cash_collected" min="0" step="1" defaultValue={Number(lead.cash_collected || 0)} className="input" />
            </Field>
            <Field label="Precio pactado ($)">
              <input type="number" name="precio_pactado" min="0" step="1" defaultValue={Number(lead.precio_pactado || 0)} className="input" />
            </Field>
            <Field label="Grabación (link)">
              <input name="grabacion" defaultValue={lead.grabacion ?? ""} className="input" />
            </Field>

            <Field label="Nota setter (pre-call)">
              <textarea name="nota_setter" defaultValue={lead.nota_setter ?? ""} className="input min-h-[60px]" />
            </Field>
            <Field label="Nota closer (post-call)">
              <textarea name="nota_closer" defaultValue={lead.nota_closer ?? ""} className="input min-h-[60px]" />
            </Field>
            <div />

            <div className="flex gap-2 md:col-span-3">
              <button className="btn" type="submit">Guardar</button>
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/5">
      <td className="px-4 py-3">
        <div className="font-medium">{lead.nombre}</div>
        <div className="text-xs text-white/40">
          {lead.fecha_agenda ?? "sin fecha"}
          {lead.fuente ? ` · ${lead.fuente}` : ""}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-white/60">
        <div>S: {name(lead.setter_id)}</div>
        <div>C: {name(lead.closer_id)}</div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-white/60">{lead.calificacion}</span>
        {lead.show_up && (
          <div className="text-xs text-white/40">Show: {lead.show_up}</div>
        )}
      </td>
      <td className="px-4 py-3">
        {lead.estado ? (
          <span className={`badge ${ESTADO_COLORS[lead.estado]}`}>{lead.estado}</span>
        ) : (
          <span className="text-xs text-white/30">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs">
        <div className="text-emerald-300">{money(Number(lead.cash_collected))}</div>
        {Number(lead.monto_restante) > 0 && (
          <div className="text-white/40">resta {money(Number(lead.monto_restante))}</div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3">
          {canEdit && (
            <button onClick={() => setEditing(true)} className="text-xs text-brand-400 hover:underline">
              Editar
            </button>
          )}
          {canDelete && (
            <form action={deleteLead}>
              <input type="hidden" name="id" value={lead.id} />
              <button className="text-xs text-red-400/70 hover:text-red-400">Eliminar</button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
