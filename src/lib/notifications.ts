import type { Notification } from "@/domain";

/** Cuenta las notificaciones sin leer (`readAt` nulo) de la lista dada. */
export function unreadCount(list: Notification[]): number {
  return list.filter((notification) => notification.readAt === null).length;
}
