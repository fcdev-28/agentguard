import type { UserRole } from "@/domain";
import { userRoleLabel } from "@/domain";
import { roleCapabilities } from "@/lib/users";
import styles from "./settings.module.css";

/** Orden fijo de presentación de los roles. */
const roleOrder: UserRole[] = ["admin", "reviewer", "auditor", "developer"];

/** Descripción de qué puede hacer cada rol en AgentGuard. Solo informativo, sin edición. */
export function RolesSection() {
  return (
    <div className={styles.roleGrid}>
      {roleOrder.map((role) => (
        <div key={role} className={styles.roleCard}>
          <h3 className={styles.roleTitle}>{userRoleLabel[role]}</h3>
          <ul className={styles.roleList}>
            {roleCapabilities[role].map((capability) => (
              <li key={capability} className={styles.roleItem}>
                {capability}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
