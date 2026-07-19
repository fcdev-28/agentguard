import type { NotificationType, User } from "@/domain";
import { RECIPIENT_ROLES } from "./events";

/** Usuarios de la organización cuyo rol recibe este tipo de evento. */
export function recipientsFor(
  type: NotificationType,
  orgUsers: User[],
): User[] {
  const roles = RECIPIENT_ROLES[type];
  return orgUsers.filter((u) => roles.includes(u.role));
}
