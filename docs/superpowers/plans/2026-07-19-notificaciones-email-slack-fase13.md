# Notificaciones email/Slack (Fase 13 · Tarea 109) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emitir notificaciones multicanal (in-app, email, Slack) ante los eventos de dominio, con un único punto `notify()` best-effort que nunca rompe el flujo que lo dispara.

**Architecture:** Un directorio nuevo `src/lib/notify/` con un dispatcher `notify()` que resuelve destinatarios por rol (función pura) y hace fan-out a tres canales aislados (cada uno en su try/catch). Se cablea en cuatro puntos de emisión existentes. No se toca la lectura in-app (`notifications.ts`).

**Tech Stack:** Next.js (App Router), TypeScript estricto, Prisma, Vitest. Reutiliza `resolveTransport()` (email) y `metric()`/`logger` (observabilidad, tarea 112).

## Global Constraints

- TypeScript estricto; sin `any`.
- Copy visible en castellano; tipos de dominio en inglés.
- Commits en español tras el tipo convencional (`feat:`, `test:`, etc.).
- Sin datos sensibles en labels de métrica ni en logs (solo IDs/tipos/canales).
- `notify()` y el dispatcher son **best-effort**: nunca lanzan al llamante. Los canales individuales sí lanzan; el aislamiento lo pone el dispatcher.
- Prettier: correr `npx prettier --write` sobre los ficheros tocados antes de cada commit; el CI corre `format:check`.
- Tests: mockear `@/lib/prisma`, `@/lib/execution/transport` y `global.fetch` con `vi.mock`/`vi.fn` (patrón de `retry-executions/route.test.ts` y `transport.test.ts`).

---

### Task 1: Eventos y resolución de destinatarios (núcleo puro)

**Files:**
- Create: `src/lib/notify/events.ts`
- Create: `src/lib/notify/recipients.ts`
- Test: `src/lib/notify/recipients.test.ts`

**Interfaces:**
- Consumes: `NotificationType`, `User`, `UserRole` de `@/domain`.
- Produces:
  - `interface NotificationEvent { type: NotificationType; organizationId: string; actionId: string | null; message: string; }`
  - `const RECIPIENT_ROLES: Record<NotificationType, readonly UserRole[]>`
  - `function recipientsFor(type: NotificationType, orgUsers: User[]): User[]`

- [ ] **Step 1: Escribir `events.ts`**

```ts
import type { NotificationType, UserRole } from "@/domain";

/** Evento de dominio que dispara una notificación multicanal. */
export interface NotificationEvent {
  type: NotificationType;
  organizationId: string;
  /** Acción implicada, o `null` si el evento no tiene una (p. ej. parada de emergencia). */
  actionId: string | null;
  /** Texto ya redactado en castellano, listo para mostrar/enviar. */
  message: string;
}

/**
 * Roles que reciben cada tipo de evento por in-app y email. Slack no usa esto:
 * publica un único mensaje por evento en el canal de operaciones.
 */
export const RECIPIENT_ROLES: Record<NotificationType, readonly UserRole[]> = {
  approval_requested: ["reviewer", "admin"],
  action_escalated: ["admin"],
  agent_error: ["developer", "admin"],
  emergency_stop: ["admin"],
};
```

- [ ] **Step 2: Escribir el test de `recipientsFor` (falla primero)**

Verifica antes la forma real de `User` en `src/domain/user.ts` y ajusta los campos del helper si difieren.

```ts
import { describe, expect, it } from "vitest";
import type { User } from "@/domain";
import { recipientsFor } from "./recipients";

function user(id: string, role: User["role"]): User {
  return {
    id,
    organizationId: "org-1",
    name: `User ${id}`,
    email: `${id}@example.com`,
    role,
    createdAt: "2026-07-19T00:00:00.000Z",
  };
}

const org: User[] = [
  user("a", "admin"),
  user("r", "reviewer"),
  user("d", "developer"),
  user("u", "auditor"),
];

describe("recipientsFor", () => {
  it("approval_requested → reviewer + admin", () => {
    const ids = recipientsFor("approval_requested", org).map((u) => u.id);
    expect(ids.sort()).toEqual(["a", "r"]);
  });

  it("action_escalated → solo admin", () => {
    expect(recipientsFor("action_escalated", org).map((u) => u.id)).toEqual([
      "a",
    ]);
  });

  it("agent_error → developer + admin", () => {
    const ids = recipientsFor("agent_error", org).map((u) => u.id);
    expect(ids.sort()).toEqual(["a", "d"]);
  });

  it("emergency_stop → solo admin", () => {
    expect(recipientsFor("emergency_stop", org).map((u) => u.id)).toEqual([
      "a",
    ]);
  });

  it("org sin usuarios del rol → lista vacía", () => {
    const onlyAuditors = [user("x", "auditor")];
    expect(recipientsFor("action_escalated", onlyAuditors)).toEqual([]);
  });
});
```

- [ ] **Step 3: Verificar que el test falla**

Run: `npx vitest run src/lib/notify/recipients.test.ts`
Expected: FAIL — `recipients` module not found.

- [ ] **Step 4: Escribir `recipients.ts`**

```ts
import type { NotificationType, User } from "@/domain";
import { RECIPIENT_ROLES } from "./events";

/** Usuarios de la organización cuyo rol recibe este tipo de evento. */
export function recipientsFor(
  type: NotificationType,
  orgUsers: User[],
): User[] {
  const roles = RECIPIENT_ROLES[type];
  return orgUsers.filter((u) => roles.includes(u.role));
}
```

- [ ] **Step 5: Verificar que el test pasa**

Run: `npx vitest run src/lib/notify/recipients.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Formato y commit**

```bash
npx prettier --write src/lib/notify/events.ts src/lib/notify/recipients.ts src/lib/notify/recipients.test.ts
git add src/lib/notify/events.ts src/lib/notify/recipients.ts src/lib/notify/recipients.test.ts
git commit -m "feat: eventos de notificación y resolución de destinatarios por rol (fase 13, tarea 109)"
```

---

### Task 2: Los tres canales (in-app, email, Slack)

**Files:**
- Create: `src/lib/notify/channels/in-app.ts`
- Create: `src/lib/notify/channels/email.ts`
- Create: `src/lib/notify/channels/slack.ts`
- Test: `src/lib/notify/channels/in-app.test.ts`
- Test: `src/lib/notify/channels/email.test.ts`
- Test: `src/lib/notify/channels/slack.test.ts`

**Interfaces:**
- Consumes: `NotificationEvent` (Task 1), `User`/`notificationTypeLabel` de `@/domain`, `resolveTransport` de `@/lib/execution/transport`, `logger` de `@/lib/observability/logger`, `prisma` de `@/lib/prisma`.
- Produces:
  - `function notifyInApp(event: NotificationEvent, recipients: User[]): Promise<void>`
  - `function notifyEmail(event: NotificationEvent, recipients: User[]): Promise<void>`
  - `function notifySlack(event: NotificationEvent): Promise<void>`

  Estas funciones **sí lanzan** ante error (el aislamiento best-effort lo pone el dispatcher en Task 3).

- [ ] **Step 1: Escribir el test del canal in-app (falla primero)**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationEvent } from "../events";

const createMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { createMany: (...a: unknown[]) => createMany(...a) },
  },
}));

import { notifyInApp } from "./in-app";

const event: NotificationEvent = {
  type: "approval_requested",
  organizationId: "org-1",
  actionId: "act-1",
  message: "Nueva acción pendiente de aprobación.",
};

function user(id: string) {
  return {
    id,
    organizationId: "org-1",
    name: id,
    email: `${id}@x.com`,
    role: "admin" as const,
    createdAt: "2026-07-19T00:00:00.000Z",
  };
}

beforeEach(() => createMany.mockReset());

describe("notifyInApp", () => {
  it("crea una fila por destinatario", async () => {
    await notifyInApp(event, [user("a"), user("b")]);
    expect(createMany).toHaveBeenCalledTimes(1);
    const arg = createMany.mock.calls[0][0] as { data: unknown[] };
    expect(arg.data).toHaveLength(2);
  });

  it("sin destinatarios → no llama a createMany", async () => {
    await notifyInApp(event, []);
    expect(createMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/notify/channels/in-app.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Escribir `channels/in-app.ts`**

```ts
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
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/notify/channels/in-app.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Escribir el test del canal email (falla primero)**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationEvent } from "../events";

const send = vi.fn();
vi.mock("@/lib/execution/transport", () => ({
  resolveTransport: () => ({
    name: "test",
    send: (...a: unknown[]) => send(...a),
  }),
}));

import { notifyEmail } from "./email";

const event: NotificationEvent = {
  type: "agent_error",
  organizationId: "org-1",
  actionId: "act-1",
  message: "El agente falló al ejecutar la acción.",
};

function user(id: string, email: string) {
  return {
    id,
    organizationId: "org-1",
    name: id,
    email,
    role: "admin" as const,
    createdAt: "2026-07-19T00:00:00.000Z",
  };
}

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ ok: true, providerId: "x" });
});

describe("notifyEmail", () => {
  it("envía un email por destinatario con email", async () => {
    await notifyEmail(event, [user("a", "a@x.com"), user("b", "b@x.com")]);
    expect(send).toHaveBeenCalledTimes(2);
    const msg = send.mock.calls[0][0] as {
      to: string;
      subject: string;
      body: string;
    };
    expect(msg.to).toBe("a@x.com");
    expect(msg.subject).toContain("AgentGuard");
    expect(msg.body).toBe(event.message);
  });

  it("se salta destinatarios sin email", async () => {
    await notifyEmail(event, [user("a", "")]);
    expect(send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Verificar que falla**

Run: `npx vitest run src/lib/notify/channels/email.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Escribir `channels/email.ts`**

```ts
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
```

- [ ] **Step 8: Verificar que pasa**

Run: `npx vitest run src/lib/notify/channels/email.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Escribir el test del canal Slack (falla primero)**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationEvent } from "../events";
import { notifySlack } from "./slack";

const event: NotificationEvent = {
  type: "emergency_stop",
  organizationId: "org-1",
  actionId: null,
  message: "Parada de emergencia activada.",
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SLACK_WEBHOOK_URL;
});

describe("notifySlack", () => {
  it("sin SLACK_WEBHOOK_URL → no llama a fetch", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    await notifySlack(event);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("con webhook → POST con text que incluye el mensaje", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/abc";
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    await notifySlack(event);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://hooks.slack.test/abc");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.text).toContain(event.message);
  });

  it("respuesta no-ok → lanza", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/abc";
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 500 }),
    );
    await expect(notifySlack(event)).rejects.toThrow();
  });
});
```

- [ ] **Step 10: Verificar que falla**

Run: `npx vitest run src/lib/notify/channels/slack.test.ts`
Expected: FAIL — module not found (o falla la aserción).

- [ ] **Step 11: Escribir `channels/slack.ts`**

```ts
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
  if (!res.ok) {
    throw new Error(`Slack respondió ${res.status}`);
  }
}
```

- [ ] **Step 12: Verificar que pasa**

Run: `npx vitest run src/lib/notify/channels/slack.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 13: Formato y commit**

```bash
npx prettier --write src/lib/notify/channels/*.ts
git add src/lib/notify/channels/
git commit -m "feat: canales de notificación in-app, email y Slack (fase 13, tarea 109)"
```

---

### Task 3: Dispatcher `notify()` best-effort

**Files:**
- Create: `src/lib/notify/notify.ts`
- Test: `src/lib/notify/notify.test.ts`

**Interfaces:**
- Consumes: `notifyInApp`/`notifyEmail`/`notifySlack` (Task 2), `recipientsFor` (Task 1), `NotificationEvent` (Task 1), `prisma` (`user.findMany`), `metric`/`logger`.
- Produces: `function notify(event: NotificationEvent): Promise<void>` — nunca lanza.

- [ ] **Step 1: Escribir el test del dispatcher (falla primero)**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationEvent } from "./events";

const findMany = vi.fn();
const notifyInApp = vi.fn();
const notifyEmail = vi.fn();
const notifySlack = vi.fn();
const metric = vi.fn();
const loggerError = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: (...a: unknown[]) => findMany(...a) } },
}));
vi.mock("./channels/in-app", () => ({
  notifyInApp: (...a: unknown[]) => notifyInApp(...a),
}));
vi.mock("./channels/email", () => ({
  notifyEmail: (...a: unknown[]) => notifyEmail(...a),
}));
vi.mock("./channels/slack", () => ({
  notifySlack: (...a: unknown[]) => notifySlack(...a),
}));
vi.mock("@/lib/observability/logger", () => ({
  metric: (...a: unknown[]) => metric(...a),
  logger: { error: (...a: unknown[]) => loggerError(...a), info: vi.fn() },
}));

import { notify } from "./notify";

const event: NotificationEvent = {
  type: "action_escalated",
  organizationId: "org-1",
  actionId: "act-1",
  message: "Acción escalada por SLA.",
};

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([
    {
      id: "a",
      organizationId: "org-1",
      name: "A",
      email: "a@x.com",
      role: "admin",
      createdAt: "2026-07-19T00:00:00.000Z",
    },
  ]);
  notifyInApp.mockReset().mockResolvedValue(undefined);
  notifyEmail.mockReset().mockResolvedValue(undefined);
  notifySlack.mockReset().mockResolvedValue(undefined);
  metric.mockReset();
  loggerError.mockReset();
});

describe("notify", () => {
  it("llama a los tres canales y emite metric sent por canal", async () => {
    await notify(event);
    expect(notifyInApp).toHaveBeenCalledTimes(1);
    expect(notifyEmail).toHaveBeenCalledTimes(1);
    expect(notifySlack).toHaveBeenCalledTimes(1);
    const sent = metric.mock.calls.filter((c) => c[0] === "notification.sent");
    expect(sent).toHaveLength(3);
  });

  it("un canal que lanza no impide los demás y no propaga", async () => {
    notifyEmail.mockRejectedValue(new Error("boom"));
    await expect(notify(event)).resolves.toBeUndefined();
    expect(notifyInApp).toHaveBeenCalled();
    expect(notifySlack).toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalled();
    expect(metric.mock.calls).toContainEqual([
      "notification.failed",
      { channel: "email", type: "action_escalated" },
    ]);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/notify/notify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Escribir `notify.ts`**

```ts
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

> **Nota sobre `prisma.user.findMany`:** devuelve filas Prisma, no el tipo de dominio `User`. `recipientsFor` solo lee `.role`/`.id`/`.email`, que coinciden por nombre. Si el compilador estricto se queja, tipa el parámetro de `recipientsFor` como `Pick<User, "id" | "email" | "role">[]` en Task 1 (ajusta también su test) en vez de `User[]`. Prefiere el `Pick` si hay fricción de tipos.

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/notify/notify.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Formato y commit**

```bash
npx prettier --write src/lib/notify/notify.ts src/lib/notify/notify.test.ts
git add src/lib/notify/notify.ts src/lib/notify/notify.test.ts
git commit -m "feat: dispatcher notify best-effort con fan-out a los tres canales (fase 13, tarea 109)"
```

---

### Task 4: Cableado en los puntos de emisión + env + kanban

**Files:**
- Modify: `src/app/api/agent/actions/route.ts` (tras `metric("action.ingested")`, ~línea 155)
- Modify: `src/app/api/cron/escalate/route.ts` (recolectar ids escalados; notificar tras el `$transaction`)
- Modify: `src/lib/execution/runner.ts` (rama terminal `agent_error`, ~línea 143)
- Modify: `src/lib/runtime-actions.ts` (`engageEmergencyStop`, tras el `$transaction`)
- Modify: `.env.example` (añadir `SLACK_WEBHOOK_URL`)
- Modify: `kanban.html` (marcar tarea 109)
- Test: `src/app/api/cron/escalate/route.test.ts` (aserción de que `notify` se invoca)

**Interfaces:**
- Consumes: `notify` de `@/lib/notify/notify` (Task 3).

> `notify` no propaga, así que `await notify(...)` es seguro dentro de cualquier flujo. En rutas HTTP colócalo antes del `return` de respuesta.

- [ ] **Step 1: Cablear ingesta (`approval_requested`)**

En `src/app/api/agent/actions/route.ts`, tras el bloque `metric("action.ingested", {...})` (~línea 155-162) y **antes** de la ejecución inline `executeAction`, añade:

```ts
if (created.status === "needs_approval") {
  await notify({
    type: "approval_requested",
    organizationId: created.organizationId,
    actionId: created.id,
    message: `Nueva acción pendiente de aprobación: ${created.title}.`,
  });
}
```

Import al principio del fichero (junto a los demás `@/lib`):

```ts
import { notify } from "@/lib/notify/notify";
```

- [ ] **Step 2: Cablear la parada de emergencia**

En `src/lib/runtime-actions.ts`, dentro de `engageEmergencyStop`, tras el `await prisma.$transaction([...])` y **antes** de `revalidateEmergencyStop()`:

```ts
await notify({
  type: "emergency_stop",
  organizationId: user.organizationId,
  actionId: null,
  message:
    "Parada de emergencia activada: todas las ejecuciones quedan bloqueadas.",
});
```

Import al principio del fichero:

```ts
import { notify } from "@/lib/notify/notify";
```

- [ ] **Step 3: Cablear el runner (`agent_error` terminal)**

En `src/lib/execution/runner.ts`, en la rama terminal `else` que emite `metric("action.failed", {...})` (~línea 143-148), añade **después** del `metric`:

```ts
await notify({
  type: "agent_error",
  organizationId: action.organizationId,
  actionId: action.id,
  message: `La ejecución de la acción falló definitivamente: ${result.error ?? "error desconocido"}.`,
});
```

Import junto a los demás en `runner.ts`:

```ts
import { notify } from "@/lib/notify/notify";
```

- [ ] **Step 4: Cablear el cron escalate (`action_escalated`)**

En `src/app/api/cron/escalate/route.ts`, recolecta los ids escalados dentro del loop y notifica **tras** el `$transaction`. Sustituye el contador `escalated` por una lista:

```ts
const escalatedIds: string[] = [];
await prisma.$transaction(async (tx) => {
  for (const id of overdue) {
    const res = await tx.agentAction.updateMany({
      where: { id, status: "needs_approval" },
      data: { status: "escalated" },
    });
    if (res.count === 0) continue;
    escalatedIds.push(id);
    const a = byId.get(id)!;
    await tx.auditEvent.create({
      data: {
        organizationId: a.organizationId,
        agentId: a.agentId,
        actionId: id,
        eventType: "action_escalated",
        message: "Acción escalada automáticamente por vencimiento de SLA.",
        metadata: { reason: "sla_overdue" },
      },
    });
  }
});

metric("action.escalated", { count: escalatedIds.length });

// Notificar fuera de la transacción (I/O de red no debe alargar el commit).
for (const id of escalatedIds) {
  const a = byId.get(id)!;
  await notify({
    type: "action_escalated",
    organizationId: a.organizationId,
    actionId: id,
    message: `Acción escalada automáticamente por vencimiento de SLA: ${a.title}.`,
  });
}

return NextResponse.json({ escalated: escalatedIds.length });
```

Elimina el `return NextResponse.json({ escalated })` antiguo (ahora se deriva de `escalatedIds.length`). Import:

```ts
import { notify } from "@/lib/notify/notify";
```

- [ ] **Step 5: Actualizar el test del cron escalate**

En `src/app/api/cron/escalate/route.test.ts`, añade el mock de `notify` junto a los demás `vi.mock`:

```ts
const notify = vi.fn();
vi.mock("@/lib/notify/notify", () => ({
  notify: (...a: unknown[]) => notify(...a),
}));
```

En `beforeEach`: `notify.mockReset().mockResolvedValue(undefined);`. En el test que escala una acción, tras el `POST`:

```ts
expect(notify).toHaveBeenCalledTimes(1);
expect(notify.mock.calls[0][0]).toMatchObject({ type: "action_escalated" });
```

> **Nota:** los tests existentes que importan indirectamente `notify` (p. ej. si alguno ejercita el runner o la ruta de ingesta reales) arrastrarían prisma/transport; añade el mismo `vi.mock("@/lib/notify/notify", ...)` en esos ficheros de test si tras el cableado se vuelven rojos. Verifica con la suite completa en el Step 9.

- [ ] **Step 6: Verificar los tests del cron**

Run: `npx vitest run src/app/api/cron/escalate/route.test.ts`
Expected: PASS (incluida la nueva aserción de `notify`).

- [ ] **Step 7: Añadir `SLACK_WEBHOOK_URL` a `.env.example`**

Añade al final:

```bash
# Notificaciones — Slack (opcional)
# Incoming webhook al que se publican los avisos de sistema (aprobaciones,
# escalados, errores, parada de emergencia). Sin definir → el canal Slack se
# salta sin error. El email reutiliza RESEND_API_KEY/EMAIL_FROM.
SLACK_WEBHOOK_URL=
```

- [ ] **Step 8: Marcar la tarea 109 en el kanban**

En `kanban.html`, añade `109` a la lista de tareas hechas de la Fase 13 (mismo patrón que `110`, `111`, `112`):

```
109, // Fase 13 (tarea 109 ✔ notificaciones por email y Slack)
```

- [ ] **Step 9: Suite completa + build + formato**

```bash
npx prettier --write src/app/api/agent/actions/route.ts src/app/api/cron/escalate/route.ts src/lib/execution/runner.ts src/lib/runtime-actions.ts src/app/api/cron/escalate/route.test.ts
npm test
npm run build
npx prettier --check "src/**/*.ts"
```
Expected: tests verde, build OK, prettier limpio. Si algún test preexistente rompe por arrastrar `notify` real, añade el `vi.mock` del Step 5 en ese fichero.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/agent/actions/route.ts src/app/api/cron/escalate/route.ts src/lib/execution/runner.ts src/lib/runtime-actions.ts src/app/api/cron/escalate/route.test.ts .env.example kanban.html
git commit -m "feat: emitir notificaciones en ingesta, escalado, fallo terminal y parada de emergencia (fase 13, tarea 109)"
```

---

## Self-Review (cobertura del spec)

- **Capa de emisión `notify()`** → Task 3. ✅
- **Destinatarios por rol/evento** → Task 1 (`recipientsFor` + `RECIPIENT_ROLES`). ✅
- **Canal in-app / email / Slack** → Task 2 (los tres, reutilizando `resolveTransport`). ✅
- **Best-effort (ningún canal rompe el flujo)** → Task 3 (`runChannel` + test de canal que lanza). ✅
- **4 puntos de cableado** → Task 4 (ingesta, emergencia, runner terminal, cron escalate). ✅
- **Slack env-webhook, skip sin env** → Task 2 (`notifySlack` + test sin env). ✅
- **`SLACK_WEBHOOK_URL` en `.env.example`** → Task 4 Step 7. ✅
- **Métricas `notification.sent`/`failed`** → Task 3. ✅
- **Fuera de alcance (preferencias, OAuth, digest, retry, multi-org)** → sin tareas: correcto. ✅

## Desviaciones conscientes del spec

- El spec tipa `recipientsFor` con `User[]`; el plan permite degradar a
  `Pick<User, "id" | "email" | "role">[]` si el tipo Prisma de `user.findMany`
  genera fricción con el `User` de dominio (Task 3 nota). Estrechamiento de
  tipo, no cambio de comportamiento.
- El cron escalate pasa de un contador `escalated` a una lista `escalatedIds`
  para poder notificar por-acción; el valor de respuesta (`escalated`) no cambia
  (= `escalatedIds.length`).
