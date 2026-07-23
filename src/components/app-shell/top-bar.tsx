"use client";

import { useState, useSyncExternalStore } from "react";
import type { Notification, Organization, User } from "@/domain";
import { userRoleLabel } from "@/domain";
import { logout } from "@/lib/auth/auth-actions";
import { MobileNav } from "./mobile-nav";
import { useCommandPalette } from "./command-palette-store";
import { NotificationBell } from "./notification-bell";
import styles from "./top-bar.module.css";

/** La plataforma no cambia en vida de la página: no hace falta suscribirse. */
function subscribePlatform() {
  return () => {};
}

/** True en macOS/iOS, donde el atajo se muestra como ⌘K en vez de Ctrl+K. */
function isMacPlatform() {
  return /Mac|iPhone|iPad|iPod/i.test(
    `${navigator.userAgent} ${navigator.platform || ""}`,
  );
}

/** Iniciales a partir de las dos primeras palabras del nombre. */
function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * Cabecera del shell: contexto de la organización activa (izquierda) y del
 * usuario en sesión (derecha, con opción de cerrar sesión). `user` y
 * `organization` llegan por props desde el layout del grupo `(app)`, que los
 * lee de la sesión real.
 */
export function TopBar({
  notifications,
  user,
  organization,
}: {
  notifications: Notification[];
  user: User;
  organization: Organization;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const { openPalette } = useCommandPalette();

  // Atajo del command palette: Ctrl+K por defecto (Windows/Linux), ⌘K en macOS.
  // useSyncExternalStore devuelve false en el servidor (getServerSnapshot), así
  // que el SSR pinta "Ctrl+K" y no hay desajuste de hidratación; el valor real
  // de la plataforma se resuelve en cliente sin setState dentro de un efecto.
  const isMac = useSyncExternalStore(
    subscribePlatform,
    isMacPlatform,
    () => false,
  );
  const shortcut = isMac ? "⌘+K" : "Ctrl+K";

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menu}
          aria-label="Abrir navegación"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className={styles.org}>
          <span className={styles.orgName}>{organization.name}</span>
        </div>
      </div>

      <button
        type="button"
        className={styles.search}
        onClick={openPalette}
        aria-label="Abrir paleta de comandos"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className={styles.searchHint}>Buscar</span>
        <span className={styles.searchKey}>{shortcut}</span>
      </button>

      <div className={styles.user}>
        <NotificationBell notifications={notifications} />
        <span className={styles.userMeta}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userRole}>{userRoleLabel[user.role]}</span>
        </span>
        <span className={styles.avatar} aria-hidden="true">
          {initials(user.name)}
        </span>
        <form action={logout}>
          <button type="submit" className={styles.logoutButton}>
            Cerrar sesión
          </button>
        </form>
      </div>

      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
    </header>
  );
}
