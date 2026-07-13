import type { ReactNode } from "react";
import styles from "./dashboard.module.css";

/**
 * Bloque del dashboard: contenedor de un solo nivel (sin tarjetas anidadas)
 * con título, una acción opcional a la derecha (p. ej. un enlace) y cuerpo.
 */
export function DashboardBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.block}>
      <div className={styles.blockHead}>
        <h2 className={styles.blockTitle}>{title}</h2>
        {action ?? null}
      </div>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}
