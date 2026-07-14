import type { AuditEventType } from "@/domain";
import styles from "./audit.module.css";

/**
 * Clase de color por tipo de evento de auditoría: agrupa los 14 tipos en
 * cinco severidades visuales, coherentes con las paletas ya usadas en
 * estados de acción y de política.
 */
export const auditEventTypeClass: Record<AuditEventType, string> = {
  agent_created: styles.eventInfo,
  agent_paused: styles.eventWarning,
  agent_resumed: styles.eventSuccess,
  permission_changed: styles.eventWarning,
  policy_published: styles.eventInfo,
  action_proposed: styles.eventNeutral,
  action_allowed: styles.eventSuccess,
  action_blocked: styles.eventDanger,
  approval_created: styles.eventSuccess,
  action_escalated: styles.eventInfo,
  action_executed: styles.eventSuccess,
  action_failed: styles.eventDanger,
  emergency_stop_engaged: styles.eventDanger,
  emergency_stop_released: styles.eventSuccess,
};
