import type { ReactNode } from "react";
import styles from "./dashboard.module.css";

/**
 * Bloque del dashboard: contenedor de un solo nivel (sin tarjetas anidadas)
 * con título, una acción opcional a la derecha (p. ej. un enlace) y cuerpo.
 */
export function DashboardBlock({
  title,
  action,
  wide = false,
  children,
}: {
  title: string;
  action?: ReactNode;
  /** true para ocupar la fila entera de la rejilla en vez de una celda. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.block} ${wide ? styles.blockWide : ""}`}>
      <div className={styles.blockHead}>
        <h2 className={styles.blockTitle}>{title}</h2>
        {action ?? null}
      </div>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}
