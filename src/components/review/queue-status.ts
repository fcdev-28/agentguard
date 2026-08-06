import type { ActionStatus } from "@/domain";
import styles from "./review.module.css";

/**
 * Clase del tag de estado dentro de la cola. Local a la cola (no lo usa el
 * panel de detalle, que tiene su propio .statusBadge en review.module.css).
 * Prefijo .rowTag* en vez de .queueTag*: es la única forma de nombrar estas
 * clases dentro del subconjunto de review.module.css que la cola puede
 * tocar (.queue, .row*, .overdue) sin colisionar con .statusBadge.
 * Exhaustivo aunque la cola solo muestre proposed/needs_approval/escalated
 * en la práctica.
 */
/**
 * ¿El estado lleva tag en la fila de la cola? `needs_approval` no: la barra
 * de parada ya *es* ese estado (IDENTITY §6 la define como "indicador de
 * estado" además de clave de ordenación y canal de urgencia), así que el tag
 * repetía la información — la misma redundancia que el pill "Vencida" que se
 * quitó al rediseñar la fila. Y en la práctica costaba caro: "Pendiente de
 * aprobación" son 22 caracteres en Plex Mono, que en un panel de cola de
 * 380px dejaban el título en "N..".
 */
export function showsQueueTag(status: ActionStatus): boolean {
  return status !== "needs_approval";
}

export const queueStatusClass: Record<ActionStatus, string> = {
  proposed: styles.rowTagNeutral,
  allowed: styles.rowTagNeutral,
  blocked: styles.rowTagNeutral,
  needs_approval: styles.rowTagHold,
  approved: styles.rowTagNeutral,
  rejected: styles.rowTagNeutral,
  changes_requested: styles.rowTagNeutral,
  escalated: styles.rowTagHold,
  executed: styles.rowTagNeutral,
  failed: styles.rowTagFault,
};
