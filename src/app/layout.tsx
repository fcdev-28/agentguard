import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/globals.css";

// Eje de ancho funcional, no decorativo: el riesgo escala por wdth
// (docs/design/IDENTITY.md §3), no por color.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-display",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-sans",
});

// Pesos explícitos: Plex Mono no siempre resuelve como variable en next/font.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AgentGuard",
  description:
    "Plano de control para agentes de IA: visibilidad, aprobación y auditoría de cada acción.",
};

/**
 * Layout raíz: solo `<html>`/`<body>`, fuente y estilos globales, compartido
 * por el grupo `(auth)` (login, sin shell) y `(app)` (resto de la app, con
 * shell). El shell y la sesión viven en `(app)/layout.tsx`.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
