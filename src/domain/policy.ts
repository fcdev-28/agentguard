export type PolicyStatus = "draft" | "active" | "archived";
export type PolicyEffect = "allow" | "block" | "require_approval" | "escalate";

/** Regla que decide si una acción se permite, bloquea o requiere aprobación. */
export interface Policy {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: PolicyStatus;
  version: number;
  /** Condiciones evaluadas (JSON flexible en la fase inicial). */
  conditions: Record<string, unknown>;
  effect: PolicyEffect;
  /** Minutos de SLA para aprobación antes de marcar vencida (ver docs/FEATURES.md). */
  approvalSlaMinutes: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
