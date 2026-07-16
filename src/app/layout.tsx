import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell/app-shell";
import {
  RuntimeProvider,
  type EmergencyStopState,
} from "@/components/app-shell/runtime-provider";
import { CommandPaletteProvider } from "@/components/app-shell/command-palette-store";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { getCurrentUser, getCurrentOrganization } from "@/lib/session-db";
import { getUsers } from "@/data/users";
import { getNotificationsForUser } from "@/data/notifications";
import { getAgents } from "@/data/agents";
import { getActions } from "@/data/actions";
import { getPolicies } from "@/data/policies";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, organization, users, agents, actions, policies] =
    await Promise.all([
      getCurrentUser(),
      getCurrentOrganization(),
      getUsers(),
      getAgents(),
      getActions(),
      getPolicies(),
    ]);
  const notifications = await getNotificationsForUser(currentUser.id);

  const emergencyStop: EmergencyStopState = organization.emergencyStop
    ? {
        active: true,
        byId: organization.emergencyStopById,
        byName:
          users.find((u) => u.id === organization.emergencyStopById)?.name ??
          null,
        at: organization.emergencyStopAt,
      }
    : { active: false, byId: null, byName: null, at: null };

  return (
    <html lang="es" className={inter.variable}>
      <body>
        <RuntimeProvider emergencyStop={emergencyStop}>
          <CommandPaletteProvider>
            <AppShell notifications={notifications}>{children}</AppShell>
            <CommandPalette
              agents={agents}
              actions={actions}
              policies={policies}
            />
          </CommandPaletteProvider>
        </RuntimeProvider>
      </body>
    </html>
  );
}
