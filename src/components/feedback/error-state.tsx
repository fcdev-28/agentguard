"use client";

import styles from "./error-state.module.css";

/**
 * Estado de error reutilizable para los `error.tsx` de cada ruta: título,
 * mensaje y un botón para reintentar la carga del segmento.
 */
export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className={styles.error} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}
