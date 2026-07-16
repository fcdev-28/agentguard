import "server-only";

/**
 * Sesión sobre BD para páginas server ya migradas a Prisma.
 * El equivalente síncrono, client-safe (sobre `demo-data`), sigue en
 * `./session.ts`; es deuda temporal hasta que `top-bar` (el último
 * componente cliente que lo consume) migre a Server Components + props.
 * Marcar este módulo con `server-only` evita que Prisma se cuele en el
 * bundle de cliente si alguien lo importa por error desde un componente
 * `"use client"`.
 */
import type { Organization, User } from "@/domain";
import { getUsers } from "@/data/users";
import { getOrganization } from "@/data/organizations";

/** Usuario activo leído de la BD: el administrador de la organización semilla. */
export async function getCurrentUser(): Promise<User> {
  const dbUsers = await getUsers();
  return dbUsers.find((u) => u.role === "admin") ?? dbUsers[0];
}

/** Organización activa leída de la BD. */
export async function getCurrentOrganization(): Promise<Organization> {
  return getOrganization();
}
