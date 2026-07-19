import type { NotificationType, User } from "@/domain";
import { RECIPIENT_ROLES } from "./events";

/**
 * Destinatario mínimo que necesitan los canales: id, email y role. Más
 * estrecho que `User` para admitir tanto usuarios de dominio como filas
 * Prisma (que traen `createdAt`/`updatedAt` como `Date`, no `string`).
 */
export type Recipient = Pick<User, "id" | "email" | "role">;

/** Usuarios de la organización cuyo rol recibe este tipo de evento. */
export function recipientsFor(
  type: NotificationType,
  orgUsers: Recipient[],
): Recipient[] {
  const roles = RECIPIENT_ROLES[type];
  return orgUsers.filter((u) => roles.includes(u.role));
}
