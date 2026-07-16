/**
 * Repositorio de notificaciones: traduce filas de Prisma a la `Notification`
 * de dominio. Al estilo de `src/data/audit.ts`.
 */
import { prisma } from "@/lib/prisma";
import type { Notification as PrismaNotification } from "@/generated/prisma/client";
import type { Notification } from "@/domain";

/** Traduce una fila `Notification` de Prisma a la `Notification` de dominio. */
export function mapNotification(row: PrismaNotification): Notification {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    type: row.type,
    actionId: row.actionId,
    message: row.message,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Notificaciones de un usuario, de más reciente a más antigua. */
export async function getNotificationsForUser(
  userId: string,
): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapNotification);
}
