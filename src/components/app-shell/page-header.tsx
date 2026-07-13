import type { ReactNode } from "react";
import styles from "./page-header.module.css";

/**
 * Cabecera de pantalla: título, descripción opcional y una zona de acciones
 * a la derecha. Común a todas las rutas del producto.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
