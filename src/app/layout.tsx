import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell/app-shell";
import { RuntimeProvider } from "@/components/app-shell/runtime-store";
import { CommandPaletteProvider } from "@/components/app-shell/command-palette-store";
import { NotificationProvider } from "@/components/app-shell/notification-store";
import { CommandPalette } from "@/components/app-shell/command-palette";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AgentGuard",
  description:
    "Plano de control para agentes de IA: visibilidad, aprobación y auditoría de cada acción.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <RuntimeProvider>
          <NotificationProvider>
            <CommandPaletteProvider>
              <AppShell>{children}</AppShell>
              <CommandPalette />
            </CommandPaletteProvider>
          </NotificationProvider>
        </RuntimeProvider>
      </body>
    </html>
  );
}
