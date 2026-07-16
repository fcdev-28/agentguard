/**
 * Repositorio de herramientas: traduce filas de Prisma a la `Tool` de dominio.
 * No confundir con `src/lib/tools.ts` (orden/filtro puro sobre `Tool[]`).
 */
import { prisma } from "@/lib/prisma";
import type { Tool as PrismaTool } from "@/generated/prisma/client";
import type { Tool } from "@/domain";

/** Traduce una fila `Tool` de Prisma a la `Tool` de dominio. */
export function mapTool(row: PrismaTool): Tool {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    type: row.type,
    status: row.status,
    riskLevel: row.riskLevel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Todas las herramientas de la organización. */
export async function getTools(): Promise<Tool[]> {
  const rows = await prisma.tool.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(mapTool);
}
