import { notificationTypeLabel } from "@/domain";
import { logger } from "@/lib/observability/logger";
import type { NotificationEvent } from "../events";

/**
 * Publica un único mensaje del evento en el incoming webhook de Slack.
 * Sin `SLACK_WEBHOOK_URL` → se salta sin error (canal opcional).
 */
export async function notifySlack(event: NotificationEvent): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    // `debug`, no `info`: sin webhook es el caso por defecto y se emitiría en
    // cada notificación, ensuciando el log estructurado del despliegue común.
    logger.debug("Slack sin configurar: SLACK_WEBHOOK_URL ausente", {
      type: event.type,
    });
    return;
  }
  const text = `*${notificationTypeLabel[event.type]}*\n${event.message}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`Slack respondió ${res.status}`);
  }
}
