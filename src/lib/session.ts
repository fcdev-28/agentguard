/**
 * Sesión simulada.
 * Hasta que exista autenticación real (fase 11), el shell asume un usuario
 * activo fijo: el administrador de la organización semilla.
 *
 * `currentUser`/`currentOrganization` (síncronos, sobre `demo-data`) siguen
 * alimentando los componentes cliente que aún no se han migrado a Prisma
 * (top-bar, runtime-store, notification-store, review). `getCurrentUser`/
 * `getCurrentOrganization` (asíncronos, sobre la BD) son la versión para las
 * páginas server ya migradas en este slice. Cuando los consumidores cliente
 * se muevan a Server Components + props (slices 2-4), estas dos fuentes se
 * unifican y los `const` síncronos desaparecen.
 */
import { organization, users } from "@/data/demo-data";
import type { Organization, User } from "@/domain";
import { getUsers } from "@/data/users";
import { getOrganization } from "@/data/organizations";

export const currentUser: User =
  users.find((u) => u.role === "admin") ?? users[0];
export const currentOrganization: Organization = organization;

/** Usuario activo leído de la BD: el administrador de la organización semilla. */
export async function getCurrentUser(): Promise<User> {
  const dbUsers = await getUsers();
  return dbUsers.find((u) => u.role === "admin") ?? dbUsers[0];
}

/** Organización activa leída de la BD. */
export async function getCurrentOrganization(): Promise<Organization> {
  return getOrganization();
}
