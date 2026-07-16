/**
 * Repositorio de permisos: traduce filas de Prisma a la `Permission` de dominio.
 */
import { prisma } from "@/lib/prisma";
import type { Permission as PrismaPermission } from "@/generated/prisma/client";
import type { Permission } from "@/domain";

/** Traduce una fila `Permission` de Prisma a la `Permission` de dominio. */
export function mapPermission(row: PrismaPermission): Permission {
  return {
    id: row.id,
    agentId: row.agentId,
    toolId: row.toolId,
    scope: row.scope,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Todos los permisos (agente↔herramienta) de la organización. */
export async function getPermissions(): Promise<Permission[]> {
  const rows = await prisma.permission.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapPermission);
}
