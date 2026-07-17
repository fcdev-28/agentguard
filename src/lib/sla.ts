/**
 * Cálculo del vencimiento de aprobación (SLA) a partir del momento en que una
 * acción entra en `needs_approval` y la política aplicada.
 *
 * Hoy el seed (`src/data/demo-data.ts`) ya trae `approvalDueAt` poblado para
 * las acciones `needs_approval`, así que este helper no se invoca todavía en
 * ningún flujo. Queda listo para cuando exista la transición real a
 * `needs_approval` en runtime (fase 10, con persistencia), momento en el que
 * se calculará `action.approvalDueAt` con esta función en el instante en que
 * la política decide pedir aprobación.
 */
import type { AgentAction } from "@/domain";
export function computeApprovalDueAt(
  enteredAt: string | Date,
  approvalSlaMinutes: number | null,
): string | null {
  if (approvalSlaMinutes === null) return null;

  const entered =
    typeof enteredAt === "string" ? new Date(enteredAt) : enteredAt;
  return new Date(
    entered.getTime() + approvalSlaMinutes * 60_000,
  ).toISOString();
}

/**
 * Ids de acciones vencidas: en `needs_approval`, con `approvalDueAt` poblado y
 * anterior a `now`. Pura; el barrido que las escala vive en
 * `/api/cron/escalate`.
 */
export function findOverdue(actions: AgentAction[], now: Date): string[] {
  return actions
    .filter(
      (a) =>
        a.status === "needs_approval" &&
        a.approvalDueAt !== null &&
        new Date(a.approvalDueAt).getTime() < now.getTime(),
    )
    .map((a) => a.id);
}
