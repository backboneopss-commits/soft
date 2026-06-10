"use client";

import { useState } from "react";
import type { Contact, Deal } from "@/lib/types";
import StageSelect from "@/components/StageSelect";
import { updateDeal, deleteDeal } from "@/app/dashboard/ventas/actions";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DealRow({
  deal,
  contacts,
  contactName,
  canEdit,
  canDelete,
}: {
  deal: Deal;
  contacts: Pick<Contact, "id" | "full_name">[];
  contactName: string | null;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-white/5">
        <td colSpan={4} className="px-4 py-3">
          <form
            action={async (fd) => {
              await updateDeal(fd);
              setEditing(false);
            }}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <input type="hidden" name="id" value={deal.id} />
            <div>
              <label className="label">Título *</label>
              <input
                name="title"
                defaultValue={deal.title}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Valor (USD)</label>
              <input
                name="value"
                type="number"
                min="0"
                step="1"
                defaultValue={Number(deal.value || 0)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Contacto</label>
              <select
                name="contact_id"
                defaultValue={deal.contact_id ?? ""}
                className="input"
              >
                <option value="" className="bg-zinc-900">
                  — Sin contacto —
                </option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900">
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 md:col-span-3">
              <button className="btn" type="submit">
                Guardar
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditing(false)}
              >
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
        <div className="font-medium">{deal.title}</div>
        {contactName && (
          <div className="text-xs text-white/40">{contactName}</div>
        )}
      </td>
      <td className="px-4 py-3 text-white/70">{money(Number(deal.value || 0))}</td>
      <td className="px-4 py-3">
        <StageSelect dealId={deal.id} current={deal.stage} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3">
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-brand-400 hover:underline"
            >
              Editar
            </button>
          )}
          {canDelete && (
            <form action={deleteDeal}>
              <input type="hidden" name="id" value={deal.id} />
              <button className="text-xs text-red-400/70 hover:text-red-400">
                Eliminar
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
