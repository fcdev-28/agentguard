import "server-only";
import type { NotificationType } from "@/domain";
import { prisma } from "@/lib/prisma";
import { logger, metric } from "@/lib/observability/logger";
import type { NotificationEvent } from "./events";
import { recipientsFor } from "./recipients";
import { notifyInApp } from "./channels/in-app";
import { notifyEmail } from "./channels/email";
import { notifySlack } from "./channels/slack";

/**
 * Punto único de emisión de notificaciones. Resuelve destinatarios por rol y
 * hace fan-out a in-app, email y Slack. Best-effort: cada canal va aislado y un
 * fallo se registra pero nunca propaga al llamante ni bloquea los otros canales.
 */
export async function notify(event: NotificationEvent): Promise<void> {
  const orgUsers = await prisma.user.findMany({
    where: { organizationId: event.organizationId },
  });
  const recipients = recipientsFor(event.type, orgUsers);

  await runChannel("in-app", event.type, () => notifyInApp(event, recipients));
  await runChannel("email", event.type, () => notifyEmail(event, recipients));
  await runChannel("slack", event.type, () => notifySlack(event));
}

/** Ejecuta un canal aislado: éxito → metric `sent`; fallo → log + metric `failed`. Nunca lanza. */
async function runChannel(
  channel: "in-app" | "email" | "slack",
  type: NotificationType,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
    metric("notification.sent", { channel, type });
  } catch (err) {
    logger.error("Fallo al enviar notificación", {
      channel,
      type,
      err: String(err),
    });
    metric("notification.failed", { channel, type });
  }
}
