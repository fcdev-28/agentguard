import { prisma } from "@/lib/prisma";
import type { NotificationEvent } from "../events";
import type { Recipient } from "../recipients";

/** Persiste una notificación in-app por cada destinatario. */
export async function notifyInApp(
  event: NotificationEvent,
  recipients: Recipient[],
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
