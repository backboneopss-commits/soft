"use client";

import { useState } from "react";
import type { Contact } from "@/lib/types";
import { updateContact, deleteContact } from "@/app/dashboard/crm/actions";

export default function ContactRow({
  contact,
  canEdit,
  canDelete,
}: {
  contact: Contact;
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
              await updateContact(fd);
              setEditing(false);
            }}
            className="grid grid-cols-2 gap-3 md:grid-cols-3"
          >
            <input type="hidden" name="id" value={contact.id} />
            <div>
              <label className="label">Nombre *</label>
              <input
                name="full_name"
                defaultValue={contact.full_name}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={contact.email ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                name="phone"
                defaultValue={contact.phone ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label">Instagram</label>
              <input
                name="instagram"
                defaultValue={contact.instagram ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label">Origen</label>
              <input
                name="source"
                defaultValue={contact.source ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label">Notas</label>
              <input
                name="notes"
                defaultValue={contact.notes ?? ""}
                className="input"
              />
            </div>
            <div className="col-span-2 flex gap-2 md:col-span-3">
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
        <div className="font-medium">{contact.full_name}</div>
        {contact.instagram && (
          <div className="text-xs text-white/40">
            @{contact.instagram.replace(/^@/, "")}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-white/60">
        {contact.email && <div>{contact.email}</div>}
        {contact.phone && <div>{contact.phone}</div>}
        {!contact.email && !contact.phone && (
          <span className="text-white/30">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-white/60">
        {contact.source ?? <span className="text-white/30">—</span>}
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
            <form action={deleteContact}>
              <input type="hidden" name="id" value={contact.id} />
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
