import "server-only";

/**
 * Frontera real de autorización de las mutaciones server. Separado de
 * `permissions.ts` para no arrastrar la sesión (Prisma, `next/headers`) al
 * bundle de cliente — mismo patrón que separa `session.ts` de
 * `session-db.ts`. El middleware NO cubre autorización, solo redirige a
 * `/login` por UX; `requireCan` es la única frontera real y debe abrir toda
 * mutación server.
 */
import type { User, UserRole } from "@/domain";
import { getCurrentUser } from "@/lib/session-db";
import { can, type Capability } from "@/lib/permissions";

/**
 * Exige sesión activa y la capacidad indicada. Devuelve el `user` en sesión
 * para que la mutación lo use como actor sin volver a llamar a
 * `getCurrentUser()`.
 */
export async function requireCan(
  capability: Capability,
): Promise<{ user: User } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "No autenticado." };
  }
  if (!can(user, capability)) {
    return { error: "No autorizado." };
  }
  return { user };
}

/**
 * Exige sesión activa y un rol concreto. Pensado para el guard de páginas
 * rol-only (p. ej. `/settings`), como alternativa a `requireCan` cuando el
 * gating es por rol y no por una capacidad puntual.
 */
export async function requireRole(
  role: UserRole,
): Promise<{ user: User } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "No autenticado." };
  }
  if (user.role !== role) {
    return { error: "No autorizado." };
  }
  return { user };
}
