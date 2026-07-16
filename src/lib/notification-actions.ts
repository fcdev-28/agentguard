"use server";

/**
 * Server actions de notificaciones in-app: marcar una o todas como leídas.
 * Sustituyen al store efímero `notification-store.tsx`; la campana de la
 * top bar (montada en el layout raíz) es su único consumidor.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session-db";

/** Resultado uniforme de una mutación: éxito o motivo por el que no procede. */
type ActionResult = { ok: true } | { error: string };

/** Revalida el layout raíz: la campana de notificaciones vive ahí, en todas las rutas. */
function revalidateNotifications(): void {
  revalidatePath("/", "layout");
}

/** Marca una notificación como leída; solo si pertenece al usuario en sesión. */
export async function markNotificationRead(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!notification || notification.userId !== user.id) {
    return {
      error: "La notificación no existe o no pertenece al usuario actual.",
    };
  }

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  revalidateNotifications();
  return { ok: true };
}

/** Marca como leídas todas las notificaciones sin leer del usuario en sesión. */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getCurrentUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidateNotifications();
  return { ok: true };
}
