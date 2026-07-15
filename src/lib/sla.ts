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
