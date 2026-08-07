import type { AuditEventType } from "@/domain";
import type { StatusTagVariant } from "@/components/data-display/status-tag";

/**
 * Variante del tag por tipo de evento. En un registro histórico ya no hay
 * nada que interrumpir —todo ha pasado ya—, así que el color se reserva a
 * los dos hechos que alguien tendría que ir a mirar: lo que falló (fault) y
 * lo que se quedó esperando a una persona (hold).
 *
 * `action_blocked` es neutro a propósito: la política cortó la acción ella
 * sola y funcionó como debía. Misma lectura que el efecto `block` en
 * policies-style.ts.
 */
export const auditEventVariant: Record<AuditEventType, StatusTagVariant> = {
  agent_created: "neutral",
  agent_paused: "hold",
  agent_resumed: "neutral",
  permission_changed: "neutral",
  policy_published: "neutral",
  action_proposed: "neutral",
  action_allowed: "neutral",
  action_blocked: "neutral",
  approval_created: "neutral",
  action_escalated: "hold",
  action_executed: "neutral",
  action_failed: "fault",
  emergency_stop_engaged: "fault",
  emergency_stop_released: "neutral",
};
