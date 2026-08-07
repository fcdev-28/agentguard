import type { ActionStatus } from "@/domain";

/**
 * ¿El estado lleva tag en la fila de la cola? `needs_approval` no: la barra
 * de parada ya *es* ese estado (IDENTITY §6 la define como "indicador de
 * estado" además de clave de ordenación y canal de urgencia), así que el tag
 * repetía la información — la misma redundancia que el pill "Vencida" que se
 * quitó al rediseñar la fila. Y en la práctica costaba caro: "Pendiente de
 * aprobación" son 22 caracteres en Plex Mono, que en un panel de cola de
 * 380px dejaban el título en "N..".
 *
 * Solo la cola oculta el tag: donde no hay barra de parada (detalle de
 * agente, auditoría) el estado tiene que escribirse. Por eso esta regla se
 * queda aquí y no viaja con actionStatusVariant a data-display.
 */
export function showsQueueTag(status: ActionStatus): boolean {
  return status !== "needs_approval";
}
