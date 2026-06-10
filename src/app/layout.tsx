import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backbone — Plataforma de clientes",
  description:
    "CRM, métricas de ventas, contenido/SOPs y guiones con IA. Una columna vertebral por cliente.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
