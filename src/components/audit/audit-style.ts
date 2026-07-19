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

/**
 * Clase de color del punto (dot) de severidad, mismo mapeo que
 * `auditEventTypeClass` pero con fondos sólidos: las clases pill usan
 * tintes casi blancos (`--color-*-bg`) que dejan el dot de 8px invisible.
 */
export const auditEventDotClass: Record<AuditEventType, string> = {
  agent_created: styles.dotInfo,
  agent_paused: styles.dotWarning,
  agent_resumed: styles.dotSuccess,
  permission_changed: styles.dotWarning,
  policy_published: styles.dotInfo,
  action_proposed: styles.dotNeutral,
  action_allowed: styles.dotSuccess,
  action_blocked: styles.dotDanger,
  approval_created: styles.dotSuccess,
  action_escalated: styles.dotInfo,
  action_executed: styles.dotSuccess,
  action_failed: styles.dotDanger,
  emergency_stop_engaged: styles.dotDanger,
  emergency_stop_released: styles.dotSuccess,
};
