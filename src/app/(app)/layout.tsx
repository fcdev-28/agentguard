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

/**
 * Layout del grupo de rutas protegidas: shell (sidebar + top bar), providers
 * de runtime/paleta de comandos y los datos que necesitan en cada pantalla.
 * Vive separado del layout raíz para que `(auth)/login` pueda renderizar sin
 * shell dentro del mismo `<html>`/`<body>` (patrón de Next para layouts
 * raíz múltiples sobre grupos de rutas).
 */
export default async function AppLayout({
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
    <RuntimeProvider emergencyStop={emergencyStop}>
      <CommandPaletteProvider>
        <AppShell notifications={notifications}>{children}</AppShell>
        <CommandPalette agents={agents} actions={actions} policies={policies} />
      </CommandPaletteProvider>
    </RuntimeProvider>
  );
}
