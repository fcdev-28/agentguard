import type { ActionStatus } from "@/domain";
import type { StatusTagVariant } from "./status-tag";

/**
 * ¿Se escribe el tag cuando la fila ya lleva barra de parada? `needs_approval`
 * no: la barra *es* ese estado (IDENTITY §6 la define como indicador de estado
 * además de clave de ordenación), así que el tag repetía la información — la
 * misma redundancia que el pill "Vencida" que se quitó de la fila. Y costaba
 * caro: "Pendiente de aprobación" son 22 caracteres en Plex Mono, que en un
 * panel de cola de 380px dejaban el título en "N..".
 *
 * Donde no hay barra (detalle de agente, auditoría) el estado se escribe
 * siempre: allí nada más lo cuenta.
 */
export function showsStatusTag(status: ActionStatus): boolean {
  return status !== "needs_approval";
}

/**
 * Variante del tag por estado de acción. Vive junto a StatusTag y no en la
 * cola: la cola, el detalle de agente, políticas y auditoría muestran los
 * mismos estados y deben colorearlos igual.
 *
 * Lleva hold todo lo que sigue esperando a una persona, aunque esa persona
 * esté fuera de AgentGuard: `changes_requested` es una acción devuelta a
 * quien construyó el agente, y mientras nadie la corrija sigue parada. No
 * corre SLA, pero el registro no debe darla por cerrada.
 */
export const actionStatusVariant: Record<ActionStatus, StatusTagVariant> = {
  proposed: "neutral",
  allowed: "neutral",
  blocked: "neutral",
  needs_approval: "hold",
  approved: "neutral",
  rejected: "neutral",
  changes_requested: "hold",
  escalated: "hold",
  executed: "neutral",
  failed: "fault",
};
