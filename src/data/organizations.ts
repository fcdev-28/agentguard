/**
 * Repositorio de organizaciones: traduce filas de Prisma a la `Organization`
 * de dominio. Sustituye a `organization` de `src/data/demo-data.ts` como
 * fuente de lectura para las páginas server (MVP de un solo tenant).
 */
import { prisma } from "@/lib/prisma";
import type { Organization as PrismaOrganization } from "@/generated/prisma/client";
import type { Organization } from "@/domain";

/** Traduce una fila `Organization` de Prisma a la `Organization` de dominio. */
export function mapOrganization(row: PrismaOrganization): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    emergencyStop: row.emergencyStop,
    emergencyStopById: row.emergencyStopById,
    emergencyStopAt: row.emergencyStopAt
      ? row.emergencyStopAt.toISOString()
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Organización activa. MVP de un solo tenant: siempre la primera (y única)
 * fila sembrada por `prisma/seed.ts`.
 */
export async function getOrganization(): Promise<Organization> {
  const row = await prisma.organization.findFirstOrThrow();
  return mapOrganization(row);
}
