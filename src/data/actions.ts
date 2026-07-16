/**
 * Repositorio de acciones de agente: traduce filas de Prisma a la
 * `AgentAction` de dominio.
 */
import { prisma } from "@/lib/prisma";
import type { AgentAction as PrismaAgentAction } from "@/generated/prisma/client";
import type { AgentAction, PolicyResult } from "@/domain";

/** Traduce una fila `AgentAction` de Prisma a la `AgentAction` de dominio. */
export function mapAgentAction(row: PrismaAgentAction): AgentAction {
  return {
    id: row.id,
    organizationId: row.organizationId,
    agentId: row.agentId,
    toolId: row.toolId,
    policyId: row.policyId,
    title: row.title,
    summary: row.summary,
    actionType: row.actionType,
    status: row.status,
    riskLevel: row.riskLevel,
    payload: row.payload as Record<string, unknown>,
    policyResult: row.policyResult as PolicyResult | null,
    approvalDueAt: row.approvalDueAt ? row.approvalDueAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    executedAt: row.executedAt ? row.executedAt.toISOString() : null,
  };
}

/** Todas las acciones de agente de la organización. */
export async function getActions(): Promise<AgentAction[]> {
  const rows = await prisma.agentAction.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapAgentAction);
}

/** Busca una acción por id directamente en BD; `undefined` si no existe. */
export async function getActionById(
  id: string,
): Promise<AgentAction | undefined> {
  const row = await prisma.agentAction.findUnique({ where: { id } });
  return row ? mapAgentAction(row) : undefined;
}
