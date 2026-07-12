/** Decisión humana sobre una acción. `reason` obligatorio salvo al aprobar. */
export type ApprovalDecision =
  "approved" | "rejected" | "changes_requested" | "escalated";

export interface Approval {
  id: string;
  actionId: string;
  reviewerId: string;
  decision: ApprovalDecision;
  reason: string | null;
  createdAt: string;
}
