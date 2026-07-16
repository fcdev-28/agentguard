/**
 * Repositorio de agentes: traduce filas de Prisma a la `Agent` de dominio.
 * No confundir con `src/lib/agents.ts` (funciones puras de orden/filtro
 * sobre un array de `Agent[]` ya cargado; se usan dentro de componentes).
 */
import { prisma } from "@/lib/prisma";
import type { Agent as PrismaAgent } from "@/generated/prisma/client";
import type { Agent } from "@/domain";

/** Traduce una fila `Agent` de Prisma a la `Agent` de dominio. */
export function mapAgent(row: PrismaAgent): Agent {
  return {
    id: row.id,
    organizationId: row.organizationId,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    environment: row.environment,
    status: row.status,
    mode: row.mode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Todos los agentes de la organización. */
export async function getAgents(): Promise<Agent[]> {
  const rows = await prisma.agent.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(mapAgent);
}

/** Busca un agente por id directamente en BD; `undefined` si no existe. */
export async function getAgentById(id: string): Promise<Agent | undefined> {
  const row = await prisma.agent.findUnique({ where: { id } });
  return row ? mapAgent(row) : undefined;
}
