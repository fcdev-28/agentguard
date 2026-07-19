import type { User } from "@/domain";
import { prisma } from "@/lib/prisma";
import type { NotificationEvent } from "../events";

/** Persiste una notificación in-app por cada destinatario. */
export async function notifyInApp(
  event: NotificationEvent,
  recipients: User[],
): Promise<void> {
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((u) => ({
      organizationId: event.organizationId,
      userId: u.id,
      type: event.type,
      actionId: event.actionId,
      message: event.message,
    })),
  });
}
