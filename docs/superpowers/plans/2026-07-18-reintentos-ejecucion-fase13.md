# Reintentos en ejecución (Fase 13 · Tarea 110) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reintentar automáticamente con backoff los fallos transitorios de ejecución (hasta 5 veces) vía un cron async, terminalizando los fallos permanentes, sin reenviar el email por el mismo reintento.

**Architecture:** Un módulo puro `retry.ts` (clasificación + backoff + planificación), `SendResult.retryable` que los transportes marcan, una migración que añade `attempts`/`nextRetryAt`/`lastError` a `AgentAction`, un runner refactorizado con núcleo compartido (`runAttempt`) usado por `executeAction` (inicial) y `retryExecution` (reintento), y un cron `retry-executions` que reclama por-id y re-ejecuta. Sin nuevo estado en el enum: `failed` + `nextRetryAt` distingue pendiente de terminal.

**Tech Stack:** TypeScript estricto, Prisma (Neon), Next.js App Router, Vitest.

## Global Constraints

- **MAX_RETRIES = 5** reintentos tras la ejecución inicial. Backoff antes del reintento `k` (1-indexado) = `[1m, 5m, 30m, 2h, 6h][k-1]` en ms: `[60_000, 300_000, 1_800_000, 7_200_000, 21_600_000]`.
- **`attempts` = reintentos hechos** (0 = solo ejecución inicial). Se incrementa **solo** en el claim del cron, nunca en `runAttempt`.
- **Sin nuevo estado** en `ActionStatus`. Pendiente de reintento = `status=failed` + `nextRetryAt` no nulo. Terminal = `nextRetryAt` nulo.
- **Idempotencia**: el claim del cron (`updateMany` guardado por `status`/`nextRetryAt`/`attempts`) sube `attempts` y limpia `nextRetryAt` antes de enviar; solo `count===1` procede.
- **Datos sensibles**: `lastError` = `String(result.error)` (mensajes acotados de transporte); nunca payload, cuerpo ni destinatario. Labels de métrica solo tipos/ids/contadores.
- **Nombres de métrica exactos**: `action.executed`, `action.failed`, `action.retry_scheduled`, `action.retry_swept`, `execution.blocked_emergency`.
- **No tocar el dominio** (`src/domain/action.ts`) ni `mapAgentAction`: el runner lee `attempts` directo por Prisma.
- **Copy visible en castellano, tipos/rutas en inglés.** TypeScript estricto, sin `any` implícito.
- **Commits en español tras tipo convencional**, terminando con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Rama** `feature/reintentos-ejecucion` (ya creada). Sin commits directos a `main`.

---

### Task 1: Módulo puro `retry.ts`

**Files:**
- Create: `src/lib/execution/retry.ts`
- Test: `src/lib/execution/retry.test.ts`

**Interfaces:**
- Produces: `MAX_RETRIES`, `isRetryableHttpStatus(status)`, `backoffMs(retryNumber)`, `planNextAttempt(attempts, retryable, now)`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/execution/retry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MAX_RETRIES,
  backoffMs,
  isRetryableHttpStatus,
  planNextAttempt,
} from "./retry";

describe("isRetryableHttpStatus", () => {
  it("reintenta 429 y 5xx", () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
  });
  it("no reintenta 4xx (salvo 429) ni 2xx", () => {
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(200)).toBe(false);
  });
});

describe("backoffMs", () => {
  it("mapea el reintento k a su tramo", () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(3)).toBe(1_800_000);
    expect(backoffMs(5)).toBe(21_600_000);
  });
  it("clampa fuera de rango al primer/último tramo", () => {
    expect(backoffMs(0)).toBe(60_000);
    expect(backoffMs(99)).toBe(21_600_000);
  });
});

describe("planNextAttempt", () => {
  const now = new Date("2026-07-18T10:00:00.000Z");

  it("reprograma el reintento 1 tras el fallo inicial reintentable", () => {
    const plan = planNextAttempt(0, true, now);
    expect(plan.kind).toBe("retry");
    if (plan.kind === "retry") {
      expect(plan.nextRetryAt.getTime()).toBe(now.getTime() + 60_000);
    }
  });

  it("reprograma el reintento 5 (6h) cuando attempts=4", () => {
    const plan = planNextAttempt(4, true, now);
    expect(plan.kind).toBe("retry");
    if (plan.kind === "retry") {
      expect(plan.nextRetryAt.getTime()).toBe(now.getTime() + 21_600_000);
    }
  });

  it("terminaliza cuando se agotaron los reintentos (attempts=5)", () => {
    expect(planNextAttempt(5, true, now).kind).toBe("terminal");
  });

  it("terminaliza si el error no es reintentable", () => {
    expect(planNextAttempt(0, false, now).kind).toBe("terminal");
  });

  it("MAX_RETRIES es 5", () => {
    expect(MAX_RETRIES).toBe(5);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/lib/execution/retry.test.ts`
Esperado: FAIL — no existe `./retry`.

- [ ] **Step 3: Implementar el módulo**

Crear `src/lib/execution/retry.ts`:

```ts
/**
 * Política de reintentos de ejecución (pura, sin I/O). Clasifica errores como
 * reintentables o permanentes y calcula el backoff. La persistencia y el barrido
 * viven en el runner y el cron `retry-executions`.
 */
export const MAX_RETRIES = 5;

/** HTTP reintentable: 429 (rate limit) o 5xx (fallo del proveedor). */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Tramos de backoff antes del reintento k (1-indexado): 1m, 5m, 30m, 2h, 6h. */
const BACKOFF_MS: readonly number[] = [
  60_000, // 1m — reintento 1
  300_000, // 5m — reintento 2
  1_800_000, // 30m — reintento 3
  7_200_000, // 2h — reintento 4
  21_600_000, // 6h — reintento 5
];

/** Backoff en ms antes del reintento `retryNumber`; clampa fuera de rango. */
export function backoffMs(retryNumber: number): number {
  const idx = Math.min(Math.max(retryNumber, 1), BACKOFF_MS.length) - 1;
  return BACKOFF_MS[idx];
}

export type NextAttempt =
  | { kind: "retry"; nextRetryAt: Date }
  | { kind: "terminal" };

/**
 * Decide el siguiente paso tras un fallo de envío, dados los reintentos ya
 * hechos (`attempts`, 0..MAX_RETRIES) y si el error es reintentable.
 */
export function planNextAttempt(
  attempts: number,
  retryable: boolean,
  now: Date,
): NextAttempt {
  const nextRetryNumber = attempts + 1;
  if (!retryable || nextRetryNumber > MAX_RETRIES) return { kind: "terminal" };
  return {
    kind: "retry",
    nextRetryAt: new Date(now.getTime() + backoffMs(nextRetryNumber)),
  };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/execution/retry.test.ts`
Esperado: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/execution/retry.ts src/lib/execution/retry.test.ts
git commit -m "feat: política pura de reintentos de ejecución (fase 13, tarea 110)

retry.ts: clasificación reintentable/permanente (isRetryableHttpStatus),
backoff por tramos (1m/5m/30m/2h/6h) y planNextAttempt. MAX_RETRIES=5.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `SendResult.retryable` + transporte lo marca

**Files:**
- Modify: `src/lib/execution.ts` (interface `SendResult`)
- Modify: `src/lib/execution/transport.ts` (`SmtpTransport`)
- Modify: `src/lib/execution/transport.test.ts` (tests de `retryable`)

**Interfaces:**
- Consumes de Task 1: `isRetryableHttpStatus`.
- Produces: `SendResult` con campo opcional `retryable`.

- [ ] **Step 1: Añadir el campo a `SendResult`**

En `src/lib/execution.ts`, la interfaz `SendResult` pasa de:

```ts
export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}
```

a:

```ts
export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
  retryable?: boolean; // solo relevante cuando ok === false
}
```

- [ ] **Step 2: Escribir los tests que fallan (SmtpTransport marca retryable)**

En `src/lib/execution/transport.test.ts`, añadir `SmtpTransport` al import existente de
`./transport` y añadir este `describe` al final del fichero:

```ts
describe("SmtpTransport retryable", () => {
  afterEach(() => vi.restoreAllMocks());

  const msg = { to: "x@example.com", subject: "Hola", body: "b" };

  it("marca retryable en un 500 del proveedor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const res = await new SmtpTransport("k", "from@x.com").send(msg);
    expect(res.ok).toBe(false);
    expect(res.retryable).toBe(true);
  });

  it("no marca retryable en un 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    );
    const res = await new SmtpTransport("k", "from@x.com").send(msg);
    expect(res.ok).toBe(false);
    expect(res.retryable).toBe(false);
  });

  it("marca retryable cuando fetch lanza (fallo de red)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red caída")));
    const res = await new SmtpTransport("k", "from@x.com").send(msg);
    expect(res.ok).toBe(false);
    expect(res.retryable).toBe(true);
  });
});
```

Verificar que el import de vitest del fichero incluye `afterEach` y `vi` (tras la tarea
112 es `import { afterEach, describe, expect, it, vi } from "vitest";`) y que el import de
transporte trae también `SmtpTransport` (p. ej. `import { LoggingTransport, SmtpTransport } from "./transport";`).

Run: `npx vitest run src/lib/execution/transport.test.ts`
Esperado: FAIL en el nuevo `describe` — hoy `SmtpTransport` no pone `retryable`.

- [ ] **Step 3: Marcar `retryable` en `SmtpTransport`**

En `src/lib/execution/transport.ts`, añadir el import:

```ts
import { isRetryableHttpStatus } from "@/lib/execution/retry";
```

El bloque de fallo HTTP:

```ts
      if (!res.ok) {
        return { ok: false, error: `Resend respondió ${res.status}` };
      }
```

pasa a:

```ts
      if (!res.ok) {
        return {
          ok: false,
          error: `Resend respondió ${res.status}`,
          retryable: isRetryableHttpStatus(res.status),
        };
      }
```

Y el `catch` (fallo de red):

```ts
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "error de red",
      };
    }
```

pasa a:

```ts
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "error de red",
        retryable: true,
      };
    }
```

Run: `npx vitest run src/lib/execution/transport.test.ts`
Esperado: PASS (todos).

- [ ] **Step 4: Commit**

```bash
git add src/lib/execution.ts src/lib/execution/transport.ts src/lib/execution/transport.test.ts
git commit -m "feat: SendResult.retryable y clasificación en SmtpTransport (fase 13, tarea 110)

Añade retryable a SendResult; SmtpTransport lo marca según el status HTTP
(429/5xx y fallos de red son reintentables). Cierra la deuda de tipo que
dejó la tarea 112 sobre error como string libre.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Migración Prisma (attempts, nextRetryAt, lastError)

**Files:**
- Modify: `prisma/schema.prisma` (modelo `AgentAction`)
- Create: `prisma/migrations/<timestamp>_reintentos_ejecucion/migration.sql` (generado)

**Interfaces:**
- Produces: columnas `attempts`/`nextRetryAt`/`lastError` e índice `[status, nextRetryAt]` en `AgentAction`, consumidas por Task 4 y Task 5.

- [ ] **Step 1: Editar el esquema**

En `prisma/schema.prisma`, modelo `AgentAction`, tras el campo `externalId String?` (antes de las relaciones), añadir:

```prisma
  attempts    Int       @default(0)
  nextRetryAt DateTime?
  lastError   String?
```

Y en el bloque de índices del mismo modelo, tras el índice existente
`@@index([organizationId, status, approvalDueAt])`, añadir:

```prisma
  // Barrido de reintentos: acciones failed con reintento pendiente.
  @@index([status, nextRetryAt])
```

- [ ] **Step 2: Generar y aplicar la migración**

Run: `npx prisma migrate dev --name reintentos_ejecucion`
Esperado: crea `prisma/migrations/<timestamp>_reintentos_ejecucion/migration.sql`, la aplica a Neon (`DATABASE_URL`) y regenera el cliente. La migración debe ser aditiva (ADD COLUMN con defaults / nullable + CREATE INDEX), sin pérdida de datos.

Verificar que el cliente compila con los nuevos campos:

Run: `npx tsc --noEmit`
Esperado: sin errores nuevos (puede haber los 2 fixtures de test preexistentes ajenos, documentados en fase 12).

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: migración de campos de reintento en AgentAction (fase 13, tarea 110)

Añade attempts, nextRetryAt y lastError, más índice [status, nextRetryAt]
para el barrido del cron de reintentos.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Refactor del runner (runAttempt, executeAction, retryExecution)

**Files:**
- Modify: `src/lib/execution/runner.ts`
- Create: `src/lib/execution/runner.test.ts`

**Interfaces:**
- Consumes: `planNextAttempt` (Task 1), `SendResult.retryable` (Task 2), campos de esquema (Task 3), `metric` (`@/lib/observability/logger`).
- Produces: `executeAction(actionId): Promise<{ ok: true; status: ActionStatus } | { error: string }>` (firma preservada) y `retryExecution(actionId): Promise<{ ok: true; status: ActionStatus } | { error: string }>` (nuevo, para el cron).

- [ ] **Step 1: Reescribir `runner.ts`**

Reemplazar el contenido completo de `src/lib/execution/runner.ts` por:

```ts
import "server-only";

/**
 * Ejecuta acciones `allowed`/`approved` contra la herramienta real y persiste el
 * desenlace (estado, `IntegrationLog`, `AuditEvent`), aplicando la política de
 * reintentos (`retry.ts`). Núcleo compartido `runAttempt` usado por:
 *   - `executeAction`: intento inicial (guard status IN allowed/approved).
 *   - `retryExecution`: reintento de una acción ya reclamada por el cron
 *     `retry-executions` (guard status = failed).
 *
 * Fallo reintentable con reintentos disponibles → `failed` + `nextRetryAt` (el
 * cron lo recogerá). Fallo permanente o agotado → `failed` terminal
 * (`nextRetryAt` nulo). `attempts` solo lo incrementa el claim del cron.
 *
 * Gates: parada de emergencia (`canExecute`) y solo herramientas `email`.
 * Idempotencia del persist: `updateMany` guardado por estado dentro de una
 * transacción interactiva; solo una ejecución concurrente transiciona.
 */
import type { ActionStatus, AgentAction } from "@/domain";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getActionById } from "@/data/actions";
import { applyExecutionResult, toEmailMessage } from "@/lib/execution";
import type { SendResult } from "@/lib/execution";
import { resolveTransport } from "@/lib/execution/transport";
import { canExecute } from "@/lib/emergency";
import { planNextAttempt } from "@/lib/execution/retry";
import { metric } from "@/lib/observability/logger";

type RunResult = { ok: true; status: ActionStatus } | { error: string };

/**
 * Envía la acción y persiste el desenlace. `whereGuard` acota el updateMany
 * terminal (allowed/approved en el inicial, failed en el reintento) para que dos
 * ejecuciones concurrentes no persistan ambas. `currentAttempts` = reintentos ya
 * hechos (0 en el inicial; el valor post-claim en el reintento).
 */
async function runAttempt(
  action: AgentAction,
  currentAttempts: number,
  whereGuard: Prisma.AgentActionWhereInput,
): Promise<RunResult> {
  const org = await prisma.organization.findUnique({
    where: { id: action.organizationId },
    select: { emergencyStop: true },
  });
  if (org && !canExecute(org.emergencyStop)) {
    metric("execution.blocked_emergency", {
      organizationId: action.organizationId,
    });
    return { error: "Parada de emergencia activa: ejecución bloqueada." };
  }

  const tool = await prisma.tool.findUnique({
    where: { id: action.toolId },
    select: { type: true },
  });
  if (tool?.type !== "email") {
    return {
      error: "La herramienta no soporta ejecución real todavía (solo email).",
    };
  }

  const transport = resolveTransport();
  const message = toEmailMessage(action);
  const result: SendResult = message.to
    ? await transport.send(message)
    : {
        ok: false,
        error: "El email no tiene destinatario (payload.to).",
        retryable: false,
      };

  const succeeded = result.ok;
  const plan = succeeded
    ? null
    : planNextAttempt(currentAttempts, result.retryable ?? false, new Date());
  const nextRetryAt = plan && plan.kind === "retry" ? plan.nextRetryAt : null;

  const persisted = await prisma.$transaction(async (tx) => {
    const res = await tx.agentAction.updateMany({
      where: { id: action.id, ...whereGuard },
      data: {
        status: succeeded ? "executed" : "failed",
        executedAt: succeeded ? new Date() : null,
        nextRetryAt,
        lastError: succeeded ? null : (result.error ?? "unknown"),
      },
    });
    if (res.count === 0) return false;

    await tx.integrationLog.create({
      data: {
        actionId: action.id,
        toolType: "email",
        transport: transport.name,
        status: succeeded ? "succeeded" : "failed",
        detail: succeeded
          ? (result.providerId ?? null)
          : (result.error ?? null),
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: action.organizationId,
        agentId: action.agentId,
        actionId: action.id,
        eventType: succeeded ? "action_executed" : "action_failed",
        message: succeeded
          ? "Acción ejecutada contra la herramienta."
          : nextRetryAt
            ? "La ejecución falló; reintento programado."
            : "La ejecución de la acción falló definitivamente.",
        metadata: {
          transport: transport.name,
          ...(nextRetryAt
            ? { retryScheduledFor: nextRetryAt.toISOString() }
            : {}),
        },
      },
    });
    return true;
  });

  if (!persisted) {
    return { error: "La acción ya fue procesada por otra ejecución." };
  }

  if (succeeded) {
    metric("action.executed", { toolType: "email", transport: transport.name });
  } else if (nextRetryAt) {
    metric("action.retry_scheduled", {
      toolType: "email",
      transport: transport.name,
      attempt: currentAttempts + 1,
    });
  } else {
    metric("action.failed", {
      toolType: "email",
      transport: transport.name,
      reason: result.error ?? "unknown",
    });
  }

  return { ok: true, status: succeeded ? "executed" : "failed" };
}

/** Intento inicial de ejecución de una acción `allowed`/`approved`. */
export async function executeAction(actionId: string): Promise<RunResult> {
  const action = await getActionById(actionId);
  if (!action) return { error: "La acción no existe." };

  // Verifica el estado antes de gastar el envío.
  const guard = applyExecutionResult(action.status, { ok: true });
  if ("error" in guard) return guard;

  return runAttempt(action, 0, { status: { in: ["allowed", "approved"] } });
}

/**
 * Reintenta una acción ya reclamada por el cron `retry-executions` (status=failed,
 * attempts ya incrementado, nextRetryAt limpiado). No aplica el guard
 * allowed/approved; el guard del persist es status=failed.
 */
export async function retryExecution(actionId: string): Promise<RunResult> {
  const action = await getActionById(actionId);
  if (!action) return { error: "La acción no existe." };

  const row = await prisma.agentAction.findUnique({
    where: { id: actionId },
    select: { attempts: true },
  });
  if (!row) return { error: "La acción no existe." };

  return runAttempt(action, row.attempts, { status: "failed" });
}
```

- [ ] **Step 2: Escribir el test del runner**

Crear `src/lib/execution/runner.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();
const integrationLogCreate = vi.fn();
const auditEventCreate = vi.fn();
const orgFindUnique = vi.fn();
const toolFindUnique = vi.fn();
const send = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: (...a: unknown[]) => orgFindUnique(...a) },
    tool: { findUnique: (...a: unknown[]) => toolFindUnique(...a) },
    agentAction: {
      findUnique: vi.fn().mockResolvedValue({ attempts: 0 }),
    },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        agentAction: { updateMany: (...a: unknown[]) => updateMany(...a) },
        integrationLog: {
          create: (...a: unknown[]) => integrationLogCreate(...a),
        },
        auditEvent: { create: (...a: unknown[]) => auditEventCreate(...a) },
      }),
  },
}));

vi.mock("@/data/actions", () => ({ getActionById: vi.fn() }));
vi.mock("@/lib/execution/transport", () => ({
  resolveTransport: () => ({ name: "resend", send }),
}));
vi.mock("@/lib/emergency", () => ({ canExecute: () => true }));

import { getActionById } from "@/data/actions";
import { executeAction } from "./runner";

const action = {
  id: "a1",
  organizationId: "org1",
  agentId: "ag1",
  toolId: "t1",
  status: "allowed",
  payload: { to: "x@example.com", subject: "S", body: "B" },
  title: "T",
  summary: "R",
};

beforeEach(() => {
  vi.mocked(getActionById).mockResolvedValue(action as never);
  orgFindUnique.mockResolvedValue({ emergencyStop: false });
  toolFindUnique.mockResolvedValue({ type: "email" });
  updateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => vi.clearAllMocks());

describe("executeAction — reintentos", () => {
  it("reprograma (nextRetryAt seteado) ante un fallo reintentable", async () => {
    send.mockResolvedValue({ ok: false, error: "500", retryable: true });
    const out = await executeAction("a1");
    expect(out).toEqual({ ok: true, status: "failed" });
    const data = updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("failed");
    expect(data.nextRetryAt).toBeInstanceOf(Date);
  });

  it("terminaliza (nextRetryAt null) ante un fallo no reintentable", async () => {
    send.mockResolvedValue({ ok: false, error: "400", retryable: false });
    await executeAction("a1");
    const data = updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("failed");
    expect(data.nextRetryAt).toBeNull();
  });

  it("marca executed y limpia nextRetryAt en éxito", async () => {
    send.mockResolvedValue({ ok: true, providerId: "p1" });
    const out = await executeAction("a1");
    expect(out).toEqual({ ok: true, status: "executed" });
    const data = updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("executed");
    expect(data.nextRetryAt).toBeNull();
  });
});
```

- [ ] **Step 3: Correr el test del runner**

Run: `npx vitest run src/lib/execution/runner.test.ts`
Esperado: PASS (3 tests).

- [ ] **Step 4: Verificar que no se rompió lo existente**

Run: `npx vitest run src/lib/review-actions.test.ts`
Esperado: PASS (mockea el runner; la firma de `executeAction` se preservó).

- [ ] **Step 5: Commit**

```bash
git add src/lib/execution/runner.ts src/lib/execution/runner.test.ts
git commit -m "feat: runner con reintentos (runAttempt, retryExecution) (fase 13, tarea 110)

Extrae runAttempt compartido; fallo reintentable con cupo programa
nextRetryAt, fallo permanente/agotado terminaliza. Añade retryExecution
para el barrido del cron (guard status=failed, sin allowed/approved).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Cron `retry-executions` + kanban

**Files:**
- Create: `src/app/api/cron/retry-executions/route.ts`
- Create: `src/app/api/cron/retry-executions/route.test.ts`
- Modify: `kanban.html`

**Interfaces:**
- Consumes: `retryExecution` (Task 4), `MAX_RETRIES` (Task 1), `metric`/`logger`.

- [ ] **Step 1: Escribir el test del cron**

Crear `src/app/api/cron/retry-executions/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const updateMany = vi.fn();
const retryExecution = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentAction: {
      findMany: (...a: unknown[]) => findMany(...a),
      updateMany: (...a: unknown[]) => updateMany(...a),
    },
  },
}));
vi.mock("@/lib/execution/runner", () => ({
  retryExecution: (...a: unknown[]) => retryExecution(...a),
}));

import { POST } from "./route";

function req(auth?: string): Request {
  return new Request("http://x/api/cron/retry-executions", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "secreto";
  retryExecution.mockResolvedValue({ ok: true, status: "executed" });
});
afterEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("POST /api/cron/retry-executions", () => {
  it("401 sin secret válido", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
  });

  it("reintenta las acciones reclamadas", async () => {
    findMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    updateMany.mockResolvedValue({ count: 1 });
    const res = await POST(req("Bearer secreto"));
    expect(await res.json()).toEqual({ retried: 2 });
    expect(retryExecution).toHaveBeenCalledTimes(2);
  });

  it("no reintenta la acción que otro barrido ya reclamó (claim count=0)", async () => {
    findMany.mockResolvedValue([{ id: "a1" }]);
    updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(req("Bearer secreto"));
    expect(await res.json()).toEqual({ retried: 0 });
    expect(retryExecution).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run src/app/api/cron/retry-executions/route.test.ts`
Esperado: FAIL — no existe `./route`.

- [ ] **Step 2: Implementar la ruta**

Crear `src/app/api/cron/retry-executions/route.ts`:

```ts
/**
 * Barrido de reintentos de ejecución. Un scheduler externo (Vercel Cron, GitHub
 * Actions o curl) lo invoca periódicamente (p. ej. cada minuto) con
 * `Authorization: Bearer $CRON_SECRET`. Reclama por-id las acciones `failed` con
 * `nextRetryAt` vencido y reintenta su ejecución. El claim (updateMany guardado)
 * sube `attempts` y limpia `nextRetryAt` antes de reenviar, así dos barridos
 * concurrentes no reintentan la misma acción (idempotencia del reintento).
 *
 * Single-tenant: no filtra por organización (misma deuda documentada que el cron
 * `escalate`; cerrar con auth multi-org).
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { retryExecution } from "@/lib/execution/runner";
import { MAX_RETRIES } from "@/lib/execution/retry";
import { logger, metric } from "@/lib/observability/logger";

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const now = new Date();
  const candidates = await prisma.agentAction.findMany({
    where: {
      status: "failed",
      nextRetryAt: { lte: now },
      attempts: { lt: MAX_RETRIES },
    },
    select: { id: true },
  });
  if (candidates.length === 0) {
    return NextResponse.json({ retried: 0 });
  }

  let retried = 0;
  for (const { id } of candidates) {
    // Claim por-id: solo un barrido reclama cada acción.
    const claim = await prisma.agentAction.updateMany({
      where: {
        id,
        status: "failed",
        nextRetryAt: { lte: now },
        attempts: { lt: MAX_RETRIES },
      },
      data: { attempts: { increment: 1 }, nextRetryAt: null },
    });
    if (claim.count === 0) continue; // otra ejecución la reclamó
    retried += 1;
    try {
      await retryExecution(id);
    } catch (err) {
      logger.error("Fallo al reintentar la ejecución", {
        actionId: id,
        err: String(err),
      });
    }
  }

  metric("action.retry_swept", { count: retried });
  return NextResponse.json({ retried });
}
```

Run: `npx vitest run src/app/api/cron/retry-executions/route.test.ts`
Esperado: PASS (3 tests).

- [ ] **Step 3: Verificación completa (lint + suite + build)**

```bash
npm run lint
npm test
npm run build
```

Esperado: lint limpio; toda la suite verde (incl. retry, transport, runner, cron nuevos);
build OK con la ruta `/api/cron/retry-executions` presente.

- [ ] **Step 4: Marcar la tarea 110 en el Kanban**

Localizar en `kanban.html` la tarea 110 de la fase 13 y marcarla como hecha replicando el
patrón de la 111/112:

```bash
grep -n "110\|112\|reintent\|manejo de errores" kanban.html | head
```

Aplicar el marcado replicando el de la 112.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/retry-executions/route.ts \
  src/app/api/cron/retry-executions/route.test.ts kanban.html
git commit -m "feat: cron de reintentos de ejecución con claim idempotente (fase 13, tarea 110)

POST /api/cron/retry-executions barre acciones failed con nextRetryAt
vencido, reclama por-id (updateMany guardado, sube attempts y limpia
nextRetryAt) y reintenta. Reutiliza CRON_SECRET. Marca la tarea 110.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Cierre (fuera de los tasks, requiere al usuario)

1. **Abrir la PR** — mostrar mensaje y confirmar antes de `gh pr create` (sin atribución a Claude Code).
2. **Scheduler**: recordar al usuario que debe apuntar un scheduler externo a `/api/cron/retry-executions` (como el `escalate`) para que los reintentos ocurran en producción.
3. **Churn de Prettier**: confirmar que no quedan cambios de formato sin commitear (el nuevo CI `verify` bloquearía la PR si `format:check` falla).
4. **URL pooled**: recordatorio general al desplegar (DATABASE_URL pooled + DIRECT_URL) — no de esta PR, pero la migración toca la BD.

## Self-Review

- **Cobertura del spec:** `retry.ts` puro (Task 1) ✓; `SendResult.retryable` + transporte (Task 2) ✓; migración (Task 3) ✓; runner `runAttempt`/`retryExecution` reprogramar/terminalizar (Task 4) ✓; cron con claim idempotente (Task 5) ✓; kanban (Task 5) ✓; testing puro + transporte + runner + cron ✓. El matiz de emergency-stop-terminaliza está en el código (runAttempt devuelve error sin persistir cuando hay parada; el claim ya limpió nextRetryAt, por lo que queda terminal) — documentado en el spec. Sin lagunas.
- **Placeholders:** ninguno — todo el código es literal, incluida la reescritura completa del runner y los tests con mocks.
- **Consistencia de nombres:** `runAttempt`, `executeAction`, `retryExecution`, `planNextAttempt`, `backoffMs`, `isRetryableHttpStatus`, `MAX_RETRIES` idénticos entre tasks. Métricas y campos de esquema idénticos entre definición y uso.
