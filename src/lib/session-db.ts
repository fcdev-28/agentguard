import "server-only";

/**
 * Sesión real (fase 11): fallo cerrado. `getCurrentUser` relee el `User` de
 * BD en cada request a partir del `userId` de la cookie firmada, y devuelve
 * `null` si no hay cookie válida, el usuario no existe o su `status` ya no
 * es "active". Esta revalidación en cada request es lo que hace que
 * desactivar un usuario tenga efecto inmediato aunque su JWT siga vivo, sin
 * necesidad de lista de revocación.
 *
 * Marcado `server-only`: usa `next/headers` (vía `auth/session`) y Prisma,
 * ninguno de los dos debe colarse en el bundle de cliente.
 */
import type { Organization, User } from "@/domain";
import { readSessionToken } from "@/lib/auth/session";
import { getUserById } from "@/data/users";
import { getOrganization } from "@/data/organizations";

/** Usuario en sesión, revalidado contra BD; `null` si no hay sesión válida. */
export async function getCurrentUser(): Promise<User | null> {
  const userId = await readSessionToken();
  if (!userId) return null;

  const user = await getUserById(userId);
  if (!user || user.status !== "active") return null;

  return user;
}

/** Organización activa; `null` en los mismos casos que `getCurrentUser`. */
export async function getCurrentOrganization(): Promise<Organization | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return getOrganization();
}
