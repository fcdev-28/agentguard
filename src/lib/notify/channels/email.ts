import type { User } from "@/domain";
import { notificationTypeLabel } from "@/domain";
import { resolveTransport } from "@/lib/execution/transport";
import type { NotificationEvent } from "../events";

/** Envía un email por cada destinatario que tenga dirección. Reutiliza el transporte de ejecución. */
export async function notifyEmail(
  event: NotificationEvent,
  recipients: User[],
): Promise<void> {
  const transport = resolveTransport();
  const subject = `AgentGuard · ${notificationTypeLabel[event.type]}`;
  for (const u of recipients) {
    if (!u.email) continue;
    await transport.send({ to: u.email, subject, body: event.message });
  }
}
