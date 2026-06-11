"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";
import { logout } from "@/app/login/actions";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: UserRole[]; // si se omite, visible para todos
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Resumen", icon: "▤" },
  { href: "/dashboard/crm", label: "CRM", icon: "◎" },
  { href: "/dashboard/ventas", label: "Ventas", icon: "↗" },
  { href: "/dashboard/cobranzas", label: "Cobranzas", icon: "$", roles: ["admin", "closer"] },
  { href: "/dashboard/actividad", label: "Actividad", icon: "▦" },
  { href: "/dashboard/contenido", label: "Contenido & SOPs", icon: "▥" },
  { href: "/dashboard/guiones", label: "Guiones IA", icon: "✦" },
  { href: "/dashboard/redes", label: "Redes & Métricas", icon: "◐" },
  { href: "/dashboard/equipo", label: "Equipo", icon: "⚇", roles: ["admin"] },
];

export default function Sidebar({
  role,
  orgName,
  fullName,
}: {
  role: UserRole;
  orgName: string;
  fullName: string;
}) {
  const pathname = usePathname();

  const items = NAV.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-black/30 p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">
          B
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{orgName}</div>
          <div className="text-xs text-white/40">Backbone</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-brand-600/20 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="w-4 text-center opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="px-2 text-sm font-medium">{fullName}</div>
        <div className="mb-3 px-2 text-xs text-white/40">
          {ROLE_LABELS[role]}
        </div>
        <form action={logout}>
          <button className="btn-ghost w-full text-sm">Cerrar sesión</button>
        </form>
      </div>
    </aside>
  );
}
