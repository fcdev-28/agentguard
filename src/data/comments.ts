/**
 * Repositorio de comentarios de acción: traduce filas de Prisma a la
 * `ActionComment` de dominio.
 */
import { prisma } from "@/lib/prisma";
import type { ActionComment as PrismaActionComment } from "@/generated/prisma/client";
import type { ActionComment } from "@/domain";

/** Traduce una fila `ActionComment` de Prisma a la `ActionComment` de dominio. */
export function mapActionComment(row: PrismaActionComment): ActionComment {
  return {
    id: row.id,
    actionId: row.actionId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Todos los comentarios de acción de la organización, en orden cronológico. */
export async function getComments(): Promise<ActionComment[]> {
  const rows = await prisma.actionComment.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapActionComment);
}
