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
