import type { ActionStatus } from "@/domain";
import { isPendingReview } from "@/lib/dashboard";

/** Decisiones humanas posibles sobre una acción pendiente (ver docs/UX_ARCHITECTURE.md). */
export type ReviewDecision = "approved" | "rejected" | "changes_requested";

/** Estado resultante de aplicar la decisión, o el motivo por el que no procede. */
export type ApplyDecisionResult = { status: ActionStatus } | { error: string };

/** Estado de `AgentAction` al que transiciona cada decisión. */
const DECISION_STATUS: Record<ReviewDecision, ActionStatus> = {
  approved: "approved",
  rejected: "rejected",
  changes_requested: "changes_requested",
};

/** Decisiones que exigen un motivo no vacío. */
const REASON_REQUIRED: ReadonlySet<ReviewDecision> = new Set([
  "rejected",
  "changes_requested",
]);

/**
 * Aplica una decisión humana sobre el estado actual de una acción.
 * Función pura: no muta nada, solo valida y calcula el resultado. Rechaza
 * decidir sobre acciones que ya no están pendientes, y exige motivo en
 * rechazo y petición de cambios (aprobar no lo requiere).
 */
export function applyDecision(
  currentStatus: ActionStatus,
  decision: ReviewDecision,
  reason: string | null,
): ApplyDecisionResult {
  if (!isPendingReview(currentStatus)) {
    return { error: "La acción ya no está pendiente de revisión." };
  }
  if (REASON_REQUIRED.has(decision) && !reason?.trim()) {
    return { error: "Esta decisión requiere un motivo." };
  }
  return { status: DECISION_STATUS[decision] };
}
