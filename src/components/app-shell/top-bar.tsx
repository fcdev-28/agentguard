import type { UserRole } from "@/domain";
import { currentOrganization, currentUser } from "@/lib/session";
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
  return (
    <header className={styles.bar}>
      <div className={styles.org}>
        <span className={styles.orgName}>{currentOrganization.name}</span>
      </div>

      <div className={styles.user}>
        <span className={styles.userMeta}>
          <span className={styles.userName}>{currentUser.name}</span>
          <span className={styles.userRole}>{roleLabels[currentUser.role]}</span>
        </span>
        <span className={styles.avatar} aria-hidden="true">
          {initials(currentUser.name)}
        </span>
      </div>
    </header>
  );
}
