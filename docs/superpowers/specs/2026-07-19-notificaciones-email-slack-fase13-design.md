# Diseño — Fase 13 · Tarea 109: Notificaciones por email y Slack

**Fecha:** 2026-07-19
**Fase:** 13 (Preparación para producción)
**Tarea del roadmap:** 109 — «Añadir notificaciones por email/Slack además de las in-app.»

## Contexto

Cuarta tarea de la fase 13 (tras 111 CI, 112 observabilidad y 110 reintentos).

El modelo de datos define cuatro tipos de notificación in-app
(`approval_requested`, `action_escalated`, `agent_error`, `emergency_stop`) y la
top bar tiene la campana que las lee (`src/lib/notifications.ts` cuenta las no
leídas; `src/lib/notification-actions.ts` las marca como leídas). Pero **ninguna
notificación se emite en runtime**: `prisma.notification.create` solo aparece en
`prisma/seed.ts`. La campana muestra datos sembrados, nada más.

Por tanto la tarea 109 no es «añadir dos canales a un emisor existente»: primero
hay que **crear la capa de emisión** (que hoy no existe) y desde ella enrutar a
los tres canales — in-app, email y Slack.

## Objetivo

Un único punto de emisión `notify(evento)` que, ante un evento de dominio
(aprobación solicitada, acción escalada, error de agente, parada de emergencia):

1. persiste la notificación in-app (cierra el vacío actual),
2. envía un email a cada destinatario,
3. publica un mensaje en Slack.

Todo **best-effort**: un fallo de cualquier canal se registra pero **nunca**
rompe el flujo que disparó la notificación (ingesta, cron, aprobación, toggle).

## Arquitectura

Directorio nuevo `src/lib/notify/`. Frontera clara con lo existente:
`notify/` **emite**; `src/lib/notifications.ts` (in-app read) y
`src/lib/notification-actions.ts` (marcar leído) **no se tocan**. Se usa un
directorio nuevo, no el fichero `notifications.ts`, para no colisionar en la
resolución de módulos (`@/lib/notifications` seguiría apuntando al fichero).

```
src/lib/notify/
  events.ts          # tipo NotificationEvent + metadata por tipo (roles destino)
  recipients.ts      # puro: recipientsFor(type, users) → usuarios por rol
  notify.ts          # dispatcher: resuelve destinatarios → fan-out best-effort
  channels/
    in-app.ts        # createMany de Notification (1 fila por destinatario)
    email.ts         # 1 email por destinatario, reutiliza resolveTransport()
    slack.ts         # 1 POST a SLACK_WEBHOOK_URL por evento (skip si no hay env)
```

### `events.ts`

```ts
import type { NotificationType, UserRole } from "@/domain";

/** Evento que dispara una notificación multicanal. */
export interface NotificationEvent {
  type: NotificationType;
  organizationId: string;
  actionId: string | null;
  message: string; // texto ya redactado en castellano
}

/** Roles que reciben cada tipo (in-app + email). Slack va a un canal único. */
export const RECIPIENT_ROLES: Record<NotificationType, readonly UserRole[]> = {
  approval_requested: ["reviewer", "admin"],
  action_escalated: ["admin"],
  agent_error: ["developer", "admin"],
  emergency_stop: ["admin"],
};
```

### `recipients.ts` (puro, testeable sin I/O)

```ts
import type { User, NotificationType } from "@/domain";
import { RECIPIENT_ROLES } from "./events";

/** Usuarios de la org cuyo rol recibe este tipo de evento. */
export function recipientsFor(
  type: NotificationType,
  orgUsers: User[],
): User[] {
  const roles = RECIPIENT_ROLES[type];
  return orgUsers.filter((u) => roles.includes(u.role));
}
```

Mapa rol→evento:

| Evento               | Roles destino          | Motivo                                    |
| -------------------- | ---------------------- | ----------------------------------------- |
| `approval_requested` | `reviewer` + `admin`   | el revisor debe actuar; el admin supervisa|
| `action_escalated`   | `admin`                | incumplimiento de SLA, decisión de gestión|
| `agent_error`        | `developer` + `admin`  | el dev integra; el admin supervisa        |
| `emergency_stop`     | `admin`                | control de organización                   |

### Canal in-app (`channels/in-app.ts`)

```ts
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
```

### Canal email (`channels/email.ts`)

Reutiliza `resolveTransport()` de `src/lib/execution/transport.ts` (Resend real
si hay `RESEND_API_KEY`+`EMAIL_FROM`, si no `LoggingTransport`). No se duplica la
lógica de proveedor: el transporte es email genérico (`send(EmailMessage)`), no
específico de ejecución de acciones.

```ts
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
```

### Canal Slack (`channels/slack.ts`)

Un POST por evento a `SLACK_WEBHOOK_URL` (incoming webhook). Sin env → skip
logueado (no error). Un mensaje por evento, no por destinatario.

```ts
export async function notifySlack(event: NotificationEvent): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    logger.info("Slack sin configurar: SLACK_WEBHOOK_URL ausente", {
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
  if (!res.ok) throw new Error(`Slack respondió ${res.status}`);
}
```

### Dispatcher (`notify.ts`)

```ts
export async function notify(event: NotificationEvent): Promise<void> {
  const orgUsers = await prisma.user.findMany({
    where: { organizationId: event.organizationId },
  });
  const recipients = recipientsFor(event.type, orgUsers);

  await runChannel("in-app", event.type, () => notifyInApp(event, recipients));
  await runChannel("email", event.type, () => notifyEmail(event, recipients));
  await runChannel("slack", event.type, () => notifySlack(event));
}

/** Ejecuta un canal aislado: éxito → metric sent; fallo → log + metric failed. Nunca lanza. */
async function runChannel(
  channel: string,
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
```

**Garantía best-effort:** cada canal va en su propio `runChannel`; un fallo de
uno no impide los demás ni propaga al llamante. `notify` nunca lanza.

## Cableado en los puntos de emisión

Cada sitio añade una llamada `await notify({...})` **tras** persistir su evento
de dominio (nunca antes: la notificación describe algo ya ocurrido).

| Evento               | Fichero                                  | Detonante                                   |
| -------------------- | ---------------------------------------- | ------------------------------------------- |
| `approval_requested` | `src/app/api/agent/actions/route.ts`     | acción ingerida entra en `needs_approval`   |
| `action_escalated`   | `src/app/api/cron/escalate/route.ts`     | acción escalada en el loop del barrido      |
| `agent_error`        | `src/lib/execution/runner.ts`            | fallo **terminal** (`nextRetryAt` nulo)     |
| `emergency_stop`     | `src/lib/runtime-actions.ts`             | `engageEmergencyStop` activa la parada      |

Notas de cableado:

- **escalate:** el `notify` va **fuera** de la `$transaction` (una llamada por
  acción escalada, tras confirmar el commit), para no alargar la transacción con
  I/O de red.
- **runner:** solo notifica en la rama terminal `agent_error`, no en cada
  reintento programado (evita ruido; el reintento no es un error definitivo).
- El `message` se redacta en cada punto de emisión, en castellano; el `actionId`
  es el de la acción implicada (nulo en `emergency_stop`, que no tiene acción).

## Testing

- **`recipients.ts`** (puro): un test por tipo verificando el filtrado por rol,
  más el caso de org sin usuarios de ese rol → lista vacía.
- **Canal Slack:** `fetch` mockeado — payload correcto; `SLACK_WEBHOOK_URL`
  ausente → no llama a `fetch`; respuesta no-ok → lanza.
- **Canal email:** transporte mockeado — un `send` por destinatario con email;
  se saltan destinatarios sin email.
- **Canal in-app:** `prisma.notification.createMany` mockeado — datos por
  destinatario; lista vacía → no llama.
- **Dispatcher:** best-effort — un canal lanza → los otros dos corren y `notify`
  no propaga; métricas `sent`/`failed` emitidas por canal.
- **Wiring:** aserción ligera con spy de que `notify` se invoca en cada punto
  (no re-testeo del flujo entero de cada ruta).

## Fuera de alcance

- Preferencias de notificación por usuario (opt-in/out por tipo/canal).
- Slack vía OAuth o webhook por-organización (multi-tenant): coherente con la
  deuda multi-org ya documentada en los crons `escalate`/`retry` — se cierra
  junto con ella, no en una hoja aislada.
- Digest/batching, deduplicación entre eventos.
- Reintento de notificaciones fallidas (best-effort puro; los eventos de dominio
  ya quedan persistidos y auditados).
- Sincronización de estado «leído» entre canales.

## Variables de entorno

- `SLACK_WEBHOOK_URL` (opcional): incoming webhook. Ausente → canal Slack se
  salta sin error.
- Email reutiliza `RESEND_API_KEY` + `EMAIL_FROM` (ya existentes).

Se añade `SLACK_WEBHOOK_URL` a `.env.example` con comentario.

## Consistencia con el resto del sistema

- Reutiliza `resolveTransport()` (no duplica proveedor de email).
- Reutiliza el patrón de `metric()`/`logger` de la tarea 112.
- Best-effort: las notificaciones no deben bloquear rutas de negocio.
- Single-tenant como el resto de la app hoy (los crons no filtran por org);
  el salto multi-org es trabajo aparte ya diferido.
