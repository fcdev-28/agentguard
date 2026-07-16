/**
 * Repositorio de políticas: traduce filas de Prisma a la `Policy` de dominio.
 * No confundir con `src/lib/policies.ts` (orden/filtro puro sobre `Policy[]`).
 */
import { prisma } from "@/lib/prisma";
import type { Policy as PrismaPolicy } from "@/generated/prisma/client";
import type { Policy } from "@/domain";

/** Traduce una fila `Policy` de Prisma a la `Policy` de dominio. */
export function mapPolicy(row: PrismaPolicy): Policy {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    status: row.status,
    version: row.version,
    conditions: row.conditions as Record<string, unknown>,
    effect: row.effect,
    approvalSlaMinutes: row.approvalSlaMinutes,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

/** Todas las políticas de la organización. */
export async function getPolicies(): Promise<Policy[]> {
  const rows = await prisma.policy.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(mapPolicy);
}
