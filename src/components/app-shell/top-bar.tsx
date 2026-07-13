"use client";

import { useState } from "react";
import type { UserRole } from "@/domain";
import { currentOrganization, currentUser } from "@/lib/session";
import { MobileNav } from "./mobile-nav";
import styles from "./top-bar.module.css";

/** Etiqueta visible (castellano) de cada rol de usuario. */
const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  reviewer: "Revisor",
  auditor: "Auditor",
  developer: "Desarrollador",
};

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
 * usuario en sesión (derecha). El usuario proviene de la sesión simulada.
 */
export function TopBar() {
  const [navOpen, setNavOpen] = useState(false);

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
          <span className={styles.orgName}>{currentOrganization.name}</span>
        </div>
      </div>

      <div className={styles.user}>
        <span className={styles.userMeta}>
          <span className={styles.userName}>{currentUser.name}</span>
          <span className={styles.userRole}>
            {roleLabels[currentUser.role]}
          </span>
        </span>
        <span className={styles.avatar} aria-hidden="true">
          {initials(currentUser.name)}
        </span>
      </div>

      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
    </header>
  );
}
