import type { ActionStatus } from "@/domain";
import type { StatusTagVariant } from "./status-tag";

/**
 * Variante del tag por estado de acción. Vive junto a StatusTag y no en la
 * cola: la cola, el detalle de agente y (más adelante) auditoría muestran
 * los mismos estados y deben colorearlos igual.
 */
export const actionStatusVariant: Record<ActionStatus, StatusTagVariant> = {
  proposed: "neutral",
  allowed: "neutral",
  blocked: "neutral",
  needs_approval: "hold",
  approved: "neutral",
  rejected: "neutral",
  changes_requested: "neutral",
  escalated: "hold",
  executed: "neutral",
  failed: "fault",
};
