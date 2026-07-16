/**
 * Repositorio de usuarios: traduce filas de Prisma a la `User` de dominio.
 */
import { prisma } from "@/lib/prisma";
import type { User as PrismaUser } from "@/generated/prisma/client";
import type { User } from "@/domain";

/** Traduce una fila `User` de Prisma a la `User` de dominio. */
export function mapUser(row: PrismaUser): User {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Todos los usuarios de la organización, orden estable por alta. */
export async function getUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(mapUser);
}

/** Un usuario por id, o `null` si no existe. Usado por la sesión para revalidar en cada request. */
export async function getUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? mapUser(row) : null;
}
