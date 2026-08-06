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
