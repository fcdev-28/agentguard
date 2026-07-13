import type { ActionStatus } from "@/domain";
import styles from "./review.module.css";

/** Clase de color por estado de acción, coherente entre la cola y el detalle. */
export const actionStatusClass: Record<ActionStatus, string> = {
  proposed: styles.statusNeutral,
  allowed: styles.statusSuccess,
  blocked: styles.statusDanger,
  needs_approval: styles.statusWarning,
  approved: styles.statusSuccess,
  rejected: styles.statusDanger,
  changes_requested: styles.statusWarning,
  escalated: styles.statusInfo,
  executed: styles.statusSuccess,
  failed: styles.statusDanger,
};
