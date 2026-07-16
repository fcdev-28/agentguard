import type { ReactNode } from "react";
import type { Notification, Organization, User } from "@/domain";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { EmergencyStopBanner } from "./emergency-stop-banner";
import styles from "./app-shell.module.css";

/**
 * Shell de aplicación: estructura común a todas las pantallas del producto.
 * Compone la navegación lateral, la cabecera y la región de contenido. El
 * comportamiento responsive se añade en el paso siguiente de la fase.
 */
export function AppShell({
  children,
  notifications,
  user,
  organization,
}: {
  children: ReactNode;
  notifications: Notification[];
  user: User;
  organization: Organization;
}) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <TopBar
          notifications={notifications}
          user={user}
          organization={organization}
        />
        <EmergencyStopBanner />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
