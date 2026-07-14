/** Tipos de evento de auditoría (registro inmutable). */
export type AuditEventType =
  | "agent_created"
  | "agent_paused"
  | "agent_resumed"
  | "permission_changed"
  | "policy_published"
  | "action_proposed"
  | "action_allowed"
  | "action_blocked"
  | "approval_created"
  | "action_escalated"
  | "action_executed"
  | "action_failed"
  | "emergency_stop_engaged"
  | "emergency_stop_released";

/** Registro inmutable de algo relevante ocurrido en el sistema. */
export interface AuditEvent {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  agentId: string | null;
  actionId: string | null;
  eventType: AuditEventType;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Etiqueta visible en castellano para cada tipo de evento de auditoría. */
export const auditEventTypeLabel: Record<AuditEventType, string> = {
  agent_created: "Agente creado",
  agent_paused: "Agente pausado",
  agent_resumed: "Agente reanudado",
  permission_changed: "Permiso modificado",
  policy_published: "Política publicada",
  action_proposed: "Acción propuesta",
  action_allowed: "Acción permitida",
  action_blocked: "Acción bloqueada",
  approval_created: "Aprobación registrada",
  action_escalated: "Acción escalada",
  action_executed: "Acción ejecutada",
  action_failed: "Acción fallida",
  emergency_stop_engaged: "Parada de emergencia activada",
  emergency_stop_released: "Parada de emergencia desactivada",
};
