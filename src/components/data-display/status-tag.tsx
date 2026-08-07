import type { ReactNode } from "react";
import styles from "./status-tag.module.css";

/** Qué distingue el color: nada (neutral), espera decisión (hold), fallo (fault). */
export type StatusTagVariant = "neutral" | "hold" | "fault";

const variantClass: Record<StatusTagVariant, string> = {
  neutral: styles.neutral,
  hold: styles.hold,
  fault: styles.fault,
};

/**
 * Etiqueta de estado compartida por la cola, el inventario de agentes y el
 * detalle. Vive en data-display y no en cada dominio: cuatro pantallas
 * muestran estados y no deben inventarse cuatro pills distintas.
 */
export function StatusTag({
  variant = "neutral",
  children,
}: {
  variant?: StatusTagVariant;
  children: ReactNode;
}) {
  return (
    <span className={`${styles.tag} ${variantClass[variant]}`}>{children}</span>
  );
}
