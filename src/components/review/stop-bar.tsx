import type { ActionStatus } from "@/domain";
import { demoNow } from "@/data/demo-data";
import { formatElapsedCompact } from "@/lib/format";
import styles from "./stop-bar.module.css";

/** Recorta un número al rango [0, 1]. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Barra de parada (elemento firma, IDENTITY §6): el tiempo que una acción
 * lleva parada como objeto físico, a sangre en el borde izquierdo de la fila.
 * Solo se llena en estados "hold" (needs_approval, escalated) con SLA
 * conocido; el resto de filas muestran la pista vacía para mantener la
 * columna alineada. Estática: la animación de descarga (settle, 320ms)
 * pertenece a la fase de pulido, no a este rediseño.
 */
export function StopBar({
  status,
  createdAt,
  approvalDueAt,
}: {
  status: ActionStatus;
  createdAt: string;
  approvalDueAt: string | null;
}) {
  const isHold = status === "needs_approval" || status === "escalated";
  const hasSla = approvalDueAt !== null;
  const showSlab = isHold && hasSla;

  // Mismo reloj simulado que formatRelativeTime, para no contradecir la
  // línea de metadatos de la fila.
  const now = demoNow.getTime();
  const startedAt = new Date(createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.round((now - startedAt) / 60_000));

  let fill = 0;
  let slaMinutes: number | null = null;
  if (showSlab && approvalDueAt) {
    const dueAt = new Date(approvalDueAt).getTime();
    fill = clamp01((now - startedAt) / (dueAt - startedAt));
    slaMinutes = Math.max(0, Math.round((dueAt - startedAt) / 60_000));
  }

  // "Ventana", no "SLA": el llenado se mide contra la ventana real de la
  // acción (createdAt → approvalDueAt), que no siempre coincide con el
  // approvalSlaMinutes nominal de la política.
  const trackLabel = showSlab
    ? `Lleva ${elapsedMinutes} minutos parada, ventana de aprobación de ${slaMinutes} minutos`
    : `Lleva ${elapsedMinutes} minutos parada`;

  return (
    <div
      className={styles.track}
      role="img"
      aria-label={trackLabel}
      title={trackLabel}
    >
      {showSlab ? (
        <div className={styles.slab} style={{ width: `${fill * 100}%` }}>
          <div className={styles.tick} />
        </div>
      ) : null}
      <span
        className={`${styles.counter} ${showSlab ? styles.counterHold : styles.counterIdle}`}
        aria-hidden="true"
      >
        {formatElapsedCompact(createdAt)}
      </span>
    </div>
  );
}
