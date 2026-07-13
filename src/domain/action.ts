import type { RiskLevel } from "./risk";

/**
 * Estados de una acción de agente.
 * Flujo: proposed -> allowed | blocked | needs_approval
 *        needs_approval -> approved | rejected | changes_requested | escalated
 *        approved | allowed -> executed | failed
 */
export type ActionStatus =
  | "proposed"
  | "allowed"
  | "blocked"
  | "needs_approval"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "escalated"
  | "executed"
  | "failed";

/** Etiqueta visible en castellano para cada estado de acción. */
export const actionStatusLabel: Record<ActionStatus, string> = {
  proposed: "Propuesta",
  allowed: "Permitida",
  blocked: "Bloqueada",
  needs_approval: "Pendiente de aprobación",
  approved: "Aprobada",
  rejected: "Rechazada",
  changes_requested: "Cambios solicitados",
  escalated: "Escalada",
  executed: "Ejecutada",
  failed: "Fallida",
};

export type ActionType =
  | "send_email"
  | "update_record"
  | "issue_refund"
  | "create_task"
  | "change_permission";

/** Etiqueta visible en castellano para cada tipo de acción. */
export const actionTypeLabel: Record<ActionType, string> = {
  send_email: "Enviar email",
  update_record: "Actualizar registro",
  issue_refund: "Emitir reembolso",
  create_task: "Crear tarea",
  change_permission: "Cambiar permiso",
};

/** Resultado de evaluar una política sobre la acción. */
export interface PolicyResult {
  policyId: string | null;
  effect: string;
  reason: string;
}

/** Acción propuesta o ejecutada por un agente. */
export interface AgentAction {
  id: string;
  organizationId: string;
  agentId: string;
  toolId: string;
  policyId: string | null;
  title: string;
  summary: string;
  actionType: ActionType;
  status: ActionStatus;
  riskLevel: RiskLevel;
  /** Datos concretos de la acción (JSON flexible en la fase inicial). */
  payload: Record<string, unknown>;
  policyResult: PolicyResult | null;
  approvalDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  executedAt: string | null;
}
