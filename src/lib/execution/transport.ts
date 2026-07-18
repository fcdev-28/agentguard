/**
 * Transporte de email: interfaz de integración real y sus implementaciones.
 * `resolveTransport` elige por entorno — si hay `RESEND_API_KEY` (+ `EMAIL_FROM`)
 * envía de verdad (Resend), si no cae a `LoggingTransport` (dev: registra, no
 * envía). Los transportes no tocan Prisma; la evidencia (`IntegrationLog`) la
 * persiste el runner, para que sean intercambiables y testeables sin BD.
 */
import type { EmailMessage, SendResult } from "@/lib/execution";
import { logger } from "@/lib/observability/logger";

export interface EmailTransport {
  readonly name: string;
  send(msg: EmailMessage): Promise<SendResult>;
}

/** Dev/fallback: registra el email por consola y lo da por enviado. */
export class LoggingTransport implements EmailTransport {
  readonly name = "logging";

  async send(msg: EmailMessage): Promise<SendResult> {
    logger.info("email enviado (logging transport)", {
      to: msg.to,
      subject: msg.subject,
    });
    return { ok: true, providerId: "logged" };
  }
}

/** Envío real vía la API HTTP de Resend. */
export class SmtpTransport implements EmailTransport {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(msg: EmailMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: msg.to,
          subject: msg.subject,
          text: msg.body,
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `Resend respondió ${res.status}` };
      }
      const data = (await res.json()) as { id?: string };
      return { ok: true, providerId: data.id };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "error de red",
      };
    }
  }
}

/** Elige el transporte según el entorno (real si hay credenciales). */
export function resolveTransport(): EmailTransport {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) {
    return new SmtpTransport(apiKey, from);
  }
  return new LoggingTransport();
}
