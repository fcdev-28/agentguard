import type { Notification } from "@/domain";

/**
 * Notificaciones de un usuario, ordenadas de más reciente a más antigua.
 * Función pura: no muta la lista de entrada.
 */
export function notificationsForUser(
  list: Notification[],
  userId: string,
): Notification[] {
  return list
    .filter((notification) => notification.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/** Cuenta las notificaciones sin leer (`readAt` nulo) de la lista dada. */
export function unreadCount(list: Notification[]): number {
  return list.filter((notification) => notification.readAt === null).length;
}
