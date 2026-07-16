/**
 * Repositorio de aprobaciones: traduce la decisión humana persistida sobre
 * una acción (con el nombre de quien la tomó) a la forma mínima que necesita
 * el detalle de revisión.
 */
import { prisma } from "@/lib/prisma";
import type { ApprovalDecision, RecordedApproval } from "@/domain";

/** Traduce una fila `Approval` (con el revisor incluido) a `RecordedApproval`. */
export function mapApproval(row: {
  actionId: string;
  reviewer: { name: string };
  decision: ApprovalDecision;
  reason: string | null;
  createdAt: Date;
}): RecordedApproval {
  return {
    actionId: row.actionId,
    reviewer: { name: row.reviewer.name },
    decision: row.decision,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Todas las aprobaciones de la organización, para la cola de `/review`, donde
 * la acción seleccionada cambia sin recargar la página.
 */
export async function getApprovals(): Promise<RecordedApproval[]> {
  const rows = await prisma.approval.findMany({ include: { reviewer: true } });
  return rows.map(mapApproval);
}

/** Decisión humana registrada sobre una acción; `null` si aún no se ha decidido. */
export async function getApprovalByActionId(
  actionId: string,
): Promise<RecordedApproval | null> {
  const row = await prisma.approval.findUnique({
    where: { actionId },
    include: { reviewer: true },
  });
  return row ? mapApproval(row) : null;
}
