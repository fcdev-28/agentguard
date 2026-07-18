# Observabilidad (Fase 13 · Tarea 112) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un logger propio de logs estructurados JSON y métricas como eventos de log (counters), e instrumentar los hot paths del flujo de acciones.

**Architecture:** Un módulo `src/lib/observability/logger.ts` con núcleo puro (build/filtrado, testeable sin I/O) y finas funciones de escritura sobre `console.*` (edge-safe). Las métricas son registros de log con campo `metric`. Se instrumentan cuatro sitios (ingesta, runner de ejecución, cron de escalado, transporte) reemplazando dos `console.*` ad-hoc.

**Tech Stack:** TypeScript estricto, Vitest, Next.js App Router. Sin dependencias nuevas.

## Global Constraints

- **Sin dependencias nuevas** — logger propio, no pino.
- **Edge-safe** — el módulo logger usa `console.log`/`console.error`, nunca `process.stdout` ni imports `node:*`.
- **Niveles**: `debug < info < warn < error`; `LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 }`. `warn`/`error` → `console.error`; `debug`/`info` → `console.log`.
- **Nivel configurado** por `LOG_LEVEL` de entorno (default `info`); valor inválido → `info`; resuelto **por llamada**, no cacheado en módulo.
- **Datos sensibles**: en labels solo IDs y tipos/estados. Nunca payloads, cuerpos de email, destinatarios, secretos ni tokens. Errores serializados con `String(err)`.
- **Nombres de métrica exactos**: `action.ingested`, `action.executed`, `action.failed`, `action.escalated`, `execution.blocked_emergency`.
- **Copy visible en castellano, tipos/rutas en inglés.**
- **Commits en español tras el tipo convencional**, terminando con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Rama** `feature/observabilidad` (ya creada). Sin commits directos a `main`.

---

### Task 1: Módulo logger (núcleo puro + escritura + métricas)

**Files:**
- Create: `src/lib/observability/logger.ts`
- Test: `src/lib/observability/logger.test.ts`

**Interfaces:**
- Produces (lo consume Task 2):
  - `type LogLevel = "debug" | "info" | "warn" | "error"`
  - `type LogFields = Record<string, unknown>`
  - `interface LogRecord { ts: string; level: LogLevel; msg: string; [key: string]: unknown }`
  - `buildLogRecord(level: LogLevel, msg: string, fields?: LogFields, now?: Date): LogRecord`
  - `shouldLog(configLevel: LogLevel, recordLevel: LogLevel): boolean`
  - `logger.{debug,info,warn,error}(msg: string, fields?: LogFields): void`
  - `metric(name: string, labels?: LogFields): void`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/observability/logger.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLogRecord, logger, metric, shouldLog } from "./logger";

describe("buildLogRecord", () => {
  it("produce ts ISO, level y msg, y mezcla los fields", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    const r = buildLogRecord("info", "hola", { a: 1 }, now);
    expect(r).toEqual({
      ts: "2026-07-18T10:00:00.000Z",
      level: "info",
      msg: "hola",
      a: 1,
    });
  });

  it("no deja que fields sobreescriba level, msg ni ts", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    const r = buildLogRecord(
      "info",
      "real",
      { level: "error", msg: "fake", ts: "fake" },
      now,
    );
    expect(r.level).toBe("info");
    expect(r.msg).toBe("real");
    expect(r.ts).toBe("2026-07-18T10:00:00.000Z");
  });
});

describe("shouldLog", () => {
  it("warn pasa con config info", () => {
    expect(shouldLog("info", "warn")).toBe(true);
  });
  it("debug no pasa con config info", () => {
    expect(shouldLog("info", "debug")).toBe(false);
  });
  it("error pasa con config error", () => {
    expect(shouldLog("error", "error")).toBe(true);
  });
});

describe("logger / write", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it("con LOG_LEVEL=warn, logger.info no escribe", () => {
    process.env.LOG_LEVEL = "warn";
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("silenciado");
    expect(spy).not.toHaveBeenCalled();
  });

  it("logger.error escribe JSON parseable a console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("boom", { a: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("boom");
    expect(parsed.a).toBe(1);
  });
});

describe("metric", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emite un record con metric:name y los labels, a nivel info", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    metric("action.executed", { transport: "resend" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.metric).toBe("action.executed");
    expect(parsed.msg).toBe("action.executed");
    expect(parsed.transport).toBe("resend");
    expect(parsed.level).toBe("info");
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/lib/observability/logger.test.ts`
Esperado: FAIL — no existe `./logger`.

- [ ] **Step 3: Implementar el módulo**

Crear `src/lib/observability/logger.ts`:

```ts
/**
 * Logging estructurado propio: registros JSON a stdout/stderr. Las métricas
 * son registros de log con campo `metric` (un counter = una línea por
 * ocurrencia); el destino de logs agrega. Núcleo puro (`buildLogRecord`,
 * `shouldLog`) testeable sin I/O. Edge-safe: usa `console.*`, no `process.stdout`.
 * Regla: en labels solo IDs y tipos/estados; nunca payloads, cuerpos, secretos.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface LogRecord {
  ts: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const VALID_LEVELS: ReadonlySet<string> = new Set(Object.keys(LEVEL_ORDER));

/** Construye el registro. `ts`/`level`/`msg` van tras el spread: `fields` no los pisa. */
export function buildLogRecord(
  level: LogLevel,
  msg: string,
  fields?: LogFields,
  now: Date = new Date(),
): LogRecord {
  return { ...fields, ts: now.toISOString(), level, msg };
}

export function shouldLog(configLevel: LogLevel, recordLevel: LogLevel): boolean {
  return LEVEL_ORDER[recordLevel] >= LEVEL_ORDER[configLevel];
}

/** Nivel de entorno, resuelto por llamada. Inválido/ausente → "info". */
function configuredLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  return raw && VALID_LEVELS.has(raw) ? (raw as LogLevel) : "info";
}

function write(level: LogLevel, msg: string, fields?: LogFields): void {
  if (!shouldLog(configuredLevel(), level)) return;
  const line = JSON.stringify(buildLogRecord(level, msg, fields));
  if (level === "warn" || level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};

/** Evento de métrica: record nivel info con `metric: name` + labels. +1 al counter. */
export function metric(name: string, labels?: LogFields): void {
  write("info", name, { metric: name, ...labels });
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/observability/logger.test.ts`
Esperado: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/observability/logger.ts src/lib/observability/logger.test.ts
git commit -m "feat: logger estructurado y métricas como eventos de log (fase 13, tarea 112)

Módulo observability/logger.ts: núcleo puro (buildLogRecord, shouldLog)
testeable sin I/O, logger.{debug,info,warn,error} sobre console.*
(edge-safe) y metric(name, labels) para counters. Nivel por LOG_LEVEL.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Instrumentar hot paths + LOG_LEVEL + kanban

**Files:**
- Modify: `src/app/api/agent/actions/route.ts`
- Modify: `src/lib/execution/runner.ts`
- Modify: `src/app/api/cron/escalate/route.ts`
- Modify: `src/lib/execution/transport.ts`
- Modify: `src/lib/execution/transport.test.ts` (aserción de instrumentación)
- Modify: `.env.example`
- Modify: `kanban.html`

**Interfaces:**
- Consumes de Task 1: `logger` y `metric` desde `@/lib/observability/logger`.

**Nota de diseño (desviación consciente del spec):** el spec pedía la aserción de
instrumentación sobre el runner (`action.executed`). No existe un test del runner real
(`review-actions.test.ts` lo mockea), y crear uno exige mockear prisma + `getActionById`
+ transport + emergency — sobredimensionado para "básica". En su lugar la aserción con
spy va en `transport.test.ts`, que ya ejercita `LoggingTransport` real: comprueba que el
envío emite un log estructurado vía `console.log`. Las métricas del runner quedan
cubiertas por (a) los tests puros de `metric()` en Task 1 y (b) build + suite verdes.

- [ ] **Step 1: Instrumentar `transport.ts` y añadir la aserción con spy (TDD del cambio)**

Primero actualizar el test `src/lib/execution/transport.test.ts`. Reemplazar su
contenido por (añade la aserción de que el envío emite log estructurado):

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoggingTransport } from "./transport";

describe("LoggingTransport", () => {
  afterEach(() => vi.restoreAllMocks());

  it("acepta el envío y se identifica como 'logging'", async () => {
    const t = new LoggingTransport();
    expect(t.name).toBe("logging");
    const res = await t.send({ to: "x@example.com", subject: "Hola", body: "b" });
    expect(res).toEqual({ ok: true, providerId: "logged" });
  });

  it("emite un log estructurado JSON al enviar", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await new LoggingTransport().send({
      to: "x@example.com",
      subject: "Hola",
      body: "b",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("info");
    expect(parsed.to).toBe("x@example.com");
    expect(parsed.subject).toBe("Hola");
  });
});
```

Run: `npx vitest run src/lib/execution/transport.test.ts`
Esperado: FAIL en el segundo test — hoy `transport.ts` usa `console.info`, no `console.log`, así que el spy de `console.log` no se llama.

Ahora editar `src/lib/execution/transport.ts`. Añadir el import al inicio (junto a los imports existentes):

```ts
import { logger } from "@/lib/observability/logger";
```

Y reemplazar el cuerpo de `LoggingTransport.send` (la línea `console.info(...)`) por:

```ts
    logger.info("email enviado (logging transport)", {
      to: msg.to,
      subject: msg.subject,
    });
```

Run: `npx vitest run src/lib/execution/transport.test.ts`
Esperado: PASS (ambos tests).

- [ ] **Step 2: Instrumentar `runner.ts`**

Editar `src/lib/execution/runner.ts`. Añadir el import (junto a los existentes):

```ts
import { metric } from "@/lib/observability/logger";
```

En el gate de parada de emergencia, justo antes de
`return { error: "Parada de emergencia activa: ejecución bloqueada." };`, añadir:

```ts
    metric("execution.blocked_emergency", {
      organizationId: action.organizationId,
    });
```

Tras el bloque `$transaction` que calcula `persisted`, justo después de la guarda
`if (!persisted) { return ...; }` y antes del `return { ok: true, status: final.status };`
final, añadir:

```ts
  if (succeeded) {
    metric("action.executed", { toolType: "email", transport: transport.name });
  } else {
    metric("action.failed", {
      toolType: "email",
      transport: transport.name,
      reason: result.error ?? "unknown",
    });
  }
```

(Se emite solo cuando `persisted === true`, por eso va tras esa guarda: no cuenta
ejecuciones que perdieron la carrera de idempotencia.)

Run: `npx vitest run src/lib/review-actions.test.ts src/lib/execution.test.ts`
Esperado: PASS (siguen verdes; `review-actions` mockea el runner, `execution` prueba lógica pura).

- [ ] **Step 3: Instrumentar la ruta de ingesta `api/agent/actions/route.ts`**

Editar `src/app/api/agent/actions/route.ts`. Añadir imports:

```ts
import { randomUUID } from "node:crypto";
import { logger, metric } from "@/lib/observability/logger";
```

Al inicio del handler `POST`, como primera línea del cuerpo, añadir:

```ts
  const requestId = randomUUID();
```

Tras crear la acción y su `AuditEvent` (después del bloque
`await prisma.auditEvent.create({ ... })` de la ingesta, antes del `if (status === "allowed")`),
añadir:

```ts
  metric("action.ingested", {
    organizationId: auth.organizationId,
    agentId: auth.agentId,
    status,
    effect: evaluation.effect,
  });
```

Reemplazar la línea `console.error("[ingesta] fallo al ejecutar la acción", created.id, err);`
por:

```ts
      logger.error("Fallo al ejecutar la acción tras la ingesta", {
        requestId,
        actionId: created.id,
        err: String(err),
      });
```

Run: `npx vitest run src/lib/review-actions.test.ts`
Esperado: PASS. (No hay test directo de esta ruta; la verificación fuerte es el build en Step 6.)

- [ ] **Step 4: Instrumentar el cron `api/cron/escalate/route.ts`**

Editar `src/app/api/cron/escalate/route.ts`. Añadir import:

```ts
import { metric } from "@/lib/observability/logger";
```

Antes del `return NextResponse.json({ escalated });` final (el que está tras el
`$transaction`), añadir:

```ts
  metric("action.escalated", { count: escalated });
```

(No instrumentar el `return NextResponse.json({ escalated: 0 })` del early-return: cuando
no hay vencidas no hay nada que contar.)

- [ ] **Step 5: Añadir `LOG_LEVEL` a `.env.example`**

Editar `.env.example`, añadir tras las variables existentes:

```
# Nivel de log estructurado: debug | info | warn | error (default: info)
LOG_LEVEL=info
```

- [ ] **Step 6: Verificación completa (lint + suite + build)**

```bash
npm run lint
npm test
npm run build
```

Esperado: lint limpio; los 251 tests previos + los nuevos de logger y transport en
verde; build OK (confirma que las cuatro instrumentaciones tipan y compilan, incl. la
ruta de ingesta que no tiene test directo).

- [ ] **Step 7: Marcar la tarea 112 en el Kanban**

Localizar en `kanban.html` la tarea 112 de la fase 13 y marcarla como hecha replicando el
patrón exacto de la 111 (misma fase, misma convención de marcado de tarea suelta):

```bash
grep -n "112\|111\|observab" kanban.html | head
```

Aplicar el marcado replicando el de la tarea 111.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/agent/actions/route.ts src/lib/execution/runner.ts \
  src/app/api/cron/escalate/route.ts src/lib/execution/transport.ts \
  src/lib/execution/transport.test.ts .env.example kanban.html
git commit -m "feat: instrumentar hot paths con logs y métricas (fase 13, tarea 112)

Emite counters action.ingested/executed/failed/escalated y
execution.blocked_emergency en ingesta, runner, cron y transporte.
Reemplaza los dos console.* ad-hoc por el logger estructurado. Añade
LOG_LEVEL a .env.example.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Cierre (fuera de los tasks, requiere al usuario)

1. **Abrir la PR** — mostrar mensaje y confirmar antes de `gh pr create` (sin atribución a Claude Code en el cuerpo).
2. **Churn de Prettier:** confirmar que no quedan cambios de formato sin commitear antes de cerrar.

## Self-Review

- **Cobertura del spec:** módulo logger (Task 1) ✓; instrumentación de los 4 sitios (Task 2 Steps 1-4) ✓; `.env.example` LOG_LEVEL (Step 5) ✓; kanban (Step 7) ✓; testing del módulo (Task 1) ✓; aserción de instrumentación (Step 1, en transport.test.ts) ✓ con desviación documentada respecto al spec (runner→transport) y su motivo; build + suite verdes (Step 6) ✓. Sin lagunas.
- **Placeholders:** ninguno — todo el código es literal (módulo completo, tests completos, ediciones con anclas exactas).
- **Consistencia de nombres:** `buildLogRecord`, `shouldLog`, `logger`, `metric` idénticos entre Task 1 (definición) y Task 2 (uso). Nombres de métrica idénticos entre spec, constraints y Steps: `action.ingested`, `action.executed`, `action.failed`, `action.escalated`, `execution.blocked_emergency`.
