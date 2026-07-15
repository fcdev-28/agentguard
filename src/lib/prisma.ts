/**
 * Cliente Prisma singleton.
 * El generador `prisma-client` (Prisma 7) exige un driver adapter explícito;
 * usamos `@prisma/adapter-pg` (runtime Node, no Edge) sobre la `DATABASE_URL`
 * de Neon. Patrón `globalForPrisma` para no agotar el pool de conexiones con
 * el hot-reload de `next dev`, donde el módulo se reevalúa en cada cambio.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
