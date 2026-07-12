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

export type ActionType =
  | "send_email"
  | "update_record"
  | "issue_refund"
  | "create_task"
  | "change_permission";

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
