# Diseño — Fase 13 · Tarea 110: Error handling y reintentos en la ejecución

**Fecha:** 2026-07-18
**Fase:** 13 (Preparación para producción)
**Tarea del roadmap:** 110 — «Añadir manejo de errores y reintentos en la ejecución de acciones.»

## Contexto

Tercera tarea de la fase 13 (tras 111 CI y 112 observabilidad). Hoy el runner
(`src/lib/execution/runner.ts`) ejecuta **un solo intento**: si el transporte falla,
transiciona la acción a `failed` de forma **terminal**, escribe un `IntegrationLog`
`failed` y un `AuditEvent` `action_failed`. No hay reintentos ni distinción entre un
fallo transitorio (proveedor caído, timeout) y uno permanente (email sin destinatario).

La fase 12 dejó esto explícitamente diferido a la fase 13 (ver comentario de cabecera de
`runner.ts`: «reintentos = fase 13» y «la idempotencia del envío … outbox/claim … queda
para fase 13»).

`executeAction` se invoca inline desde dos sitios: la ingesta
(`src/app/api/agent/actions/route.ts:164`, en try/catch) y la aprobación
(`src/lib/review-actions.ts:66`).

### Modelo actual relevante

- `AgentAction`: `status`, `executedAt`, `payload`, `toolId`, … (sin campos de reintento).
- `IntegrationLog`: `actionId`, `toolType`, `transport`, `status`, `detail` — una fila por intento.
- `SendResult` (`src/lib/execution.ts`): `{ ok: boolean; providerId?: string; error?: string }`.
- Transportes (`transport.ts`): `LoggingTransport` (dev, siempre ok) y `SmtpTransport`
  (Resend real; devuelve `error` string en fallo HTTP o de red).
- Cron existente `escalate` (`api/cron/escalate/route.ts`): patrón a replicar —
  `CRON_SECRET` con `timingSafeEqual`, `$transaction` interactiva, claim por-id con
  `updateMany` guardado (`if (res.count === 0) continue`).

### Decisiones de brainstorming

- **Mecanismo: cron de reintentos async** (no reintento síncrono en el request). Correcto
  en serverless (sin latencia ni timeout), sobrevive a caídas largas, reutiliza el patrón
  del cron `escalate`, el `CRON_SECRET` y las métricas de la tarea 112.
- **Sin nuevo estado en el enum `ActionStatus`.** "Fallo con reintento pendiente" =
  `status=failed` + `nextRetryAt` no nulo + `attempts < MAX_RETRIES`. "Fallo terminal" =
  `status=failed` + `nextRetryAt` nulo. Así no se toca la UI (badges, filtros) ni el
  `DATA_MODEL` de estados.
- **MAX_RETRIES = 5** reintentos tras la ejecución inicial. Backoff antes del reintento
  `k` (1-indexado) = `[1m, 5m, 30m, 2h, 6h][k-1]`.

## Objetivo

Que un fallo transitorio de ejecución se reintente automáticamente con backoff hasta 5
veces antes de darse por terminal, y que un fallo permanente termine de inmediato. Sin
reenviar el email dos veces por el mismo reintento (claim idempotente en el cron). Todo
observable con métricas.

**Fuera de alcance:**
- El double-send concurrente del **camino inline inicial** (dos `executeAction` en
  paralelo enviando antes de que la BD arbitre) — ya documentado en fase 12; el claim del
  cron cubre el reintento, no se empeora el inline. Cerrar con outbox/claim-before-send
  en trabajo futuro.
- Nuevo estado `retrying` visible en UI.
- Dead-letter queue, alertas, notificación al usuario del fallo terminal.

## Diseño

### 1. `SendResult` con señal de reintentabilidad

En `src/lib/execution.ts`, extender `SendResult`:

```ts
export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
  retryable?: boolean; // solo relevante cuando ok === false
}
```

Los transportes marcan `retryable` (estrecha además la deuda que dejó la tarea 112 sobre
`error` como string libre):

- `SmtpTransport`: en fallo HTTP → `retryable = isRetryableHttpStatus(res.status)`; en
  `catch` (fallo de red / fetch lanza) → `retryable = true`.
- `LoggingTransport`: nunca falla (no aplica).

### 2. Módulo puro `src/lib/execution/retry.ts`

Lógica pura, testeable sin I/O:

```ts
export const MAX_RETRIES = 5;

/** HTTP reintentable: 429 (rate limit) o 5xx (fallo del proveedor). */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Backoff antes del reintento `k` (1-indexado, 1..MAX_RETRIES), en ms.
 * Tramos: 1m, 5m, 30m, 2h, 6h. Para k fuera de rango, devuelve el último tramo.
 */
const BACKOFF_MS: readonly number[] = [
  60_000, // 1m
  300_000, // 5m
  1_800_000, // 30m
  7_200_000, // 2h
  21_600_000, // 6h
];
export function backoffMs(retryNumber: number): number {
  const idx = Math.min(Math.max(retryNumber, 1), BACKOFF_MS.length) - 1;
  return BACKOFF_MS[idx];
}

/**
 * Dado el nº de reintentos ya hechos (`attempts`, 0..MAX_RETRIES) y si el error es
 * reintentable, decide el siguiente paso tras un fallo de envío.
 *   - `{ kind: "retry", nextRetryAt }` — reprogramar (el reintento nº attempts+1).
 *   - `{ kind: "terminal" }` — agotado o no reintentable.
 */
export function planNextAttempt(
  attempts: number,
  retryable: boolean,
  now: Date,
): { kind: "retry"; nextRetryAt: Date } | { kind: "terminal" } {
  const nextRetryNumber = attempts + 1;
  if (!retryable || nextRetryNumber > MAX_RETRIES) return { kind: "terminal" };
  return {
    kind: "retry",
    nextRetryAt: new Date(now.getTime() + backoffMs(nextRetryNumber)),
  };
}
```

Semántica de `attempts`: cuenta **reintentos hechos** (0 = solo ejecución inicial).
- Ejecución inicial falla (attempts=0), reintentable → `planNextAttempt(0, true)` →
  `nextRetryAt = now + 1m` (reintento 1). Se persiste con `attempts=0` aún (el cron lo
  sube a 1 al reclamar).
- Reintento que hizo `attempts=k` falla → `planNextAttempt(k, …)`: si `k+1 ≤ 5`
  reprograma con `backoffMs(k+1)`; si `k=5` → terminal.

### 3. Esquema (migración Prisma)

`AgentAction +=`:

```prisma
  attempts    Int       @default(0)
  nextRetryAt DateTime?
  lastError   String?
```

Índice para el barrido del cron (acciones con reintento pendiente):

```prisma
  @@index([status, nextRetryAt])
```

`lastError` guarda `String(result.error)` del último fallo (acotado; nunca payload ni
destinatario). Migración generada con `prisma migrate dev` y aplicada a Neon.

### 4. Runner: extraer núcleo + reprogramar/terminalizar

Refactor de `runner.ts`. Extraer el envío + persistencia del desenlace en un helper
compartido por la ejecución inicial y el reintento:

```ts
// Reintenta el envío de una acción ya autorizada (allowed/approved) y persiste el
// desenlace, aplicando la política de reintentos. Usado por executeAction (intento
// inicial) y por retryExecution (barrido del cron).
async function runAttempt(action, currentAttempts): Promise<...>
```

Al fallar el envío:
- `plan = planNextAttempt(currentAttempts, result.retryable ?? false, new Date())`.
- Dentro de la `$transaction` guardada:
  - si `plan.kind === "retry"`: `status = "failed"`, `nextRetryAt = plan.nextRetryAt`,
    `lastError = String(result.error)`, `executedAt = null`. `AuditEvent`
    `action_failed` con `metadata.retryScheduledFor`. `metric("action.retry_scheduled",
    { toolType: "email", transport, attempt: currentAttempts + 1 })`.
  - si `plan.kind === "terminal"`: `status = "failed"`, `nextRetryAt = null`,
    `lastError = String(result.error)`. `AuditEvent` `action_failed`.
    `metric("action.failed", …)` (como hoy).
- En éxito: `status = "executed"`, `executedAt = now`, `nextRetryAt = null`.
  `metric("action.executed", …)`. (Sin cambios respecto a hoy salvo limpiar `nextRetryAt`.)

`executeAction(actionId)` mantiene su guard `status IN (allowed, approved)` para el
intento inicial y delega en `runAttempt(action, 0)`.

### 5. `retryExecution` + cron `POST /api/cron/retry-executions`

**`retryExecution(actionId)`** (en `runner.ts`): re-ejecuta una acción **ya reclamada**
por el cron. No aplica el guard allowed/approved (la acción está en `failed` pendiente);
opera sobre la acción reclamada y delega en `runAttempt(action, attempts)` con los
`attempts` ya incrementados por el claim.

**Ruta `src/app/api/cron/retry-executions/route.ts`** (replica `escalate`):
- Auth con `CRON_SECRET` (`timingSafeEqual`), idéntico helper que `escalate`.
- Selecciona candidatas: `status = "failed"`, `nextRetryAt <= now`, `attempts < MAX_RETRIES`.
- **Claim por-id** (evita doble reintento entre barridos concurrentes): para cada id,
  `updateMany where { id, status: "failed", nextRetryAt: { lte: now }, attempts: { lt: MAX_RETRIES } } data { attempts: { increment: 1 }, nextRetryAt: null }`. Si `count === 1`,
  la acción queda reclamada (attempts subido, nextRetryAt limpiado) → invocar
  `retryExecution(id)`. Si `count === 0`, otra ejecución la reclamó → `continue`.
- Cada `retryExecution` en su propio try/catch (un fallo no aborta el barrido; se registra
  con `logger.error`). Emergency-stop: `retryExecution` respeta `canExecute` igual que
  `executeAction` (no reintenta con parada activa; deja la acción reclamada — quedará con
  `nextRetryAt=null`, es decir terminal hasta nueva intervención; **documentar este
  matiz**: una parada de emergencia durante un reintento lo terminaliza).
- Devuelve `{ retried: n }` y emite `metric("action.retry_swept", { count })`.

**Nota de idempotencia:** el claim sube `attempts` y limpia `nextRetryAt` **antes** de
enviar. Si el envío del reintento falla de nuevo, `runAttempt` vuelve a fijar
`nextRetryAt` (o terminaliza). Si el proceso muere entre claim y envío, la acción queda
`failed` con `nextRetryAt=null` (terminal) sin haber reenviado — se prefiere no reenviar
(riesgo de duplicado) a reintentar a ciegas. Es el compromiso consciente de "básica".

### 6. `.env.example` / scheduler

No añade variables (reutiliza `CRON_SECRET`). Documentar en el comentario de la ruta que
un scheduler externo debe invocarla periódicamente (p. ej. cada minuto), como el
`escalate`.

## Testing (TDD)

- **`retry.test.ts`** (puro): `isRetryableHttpStatus` (429/500/503 sí; 400/404/200 no);
  `backoffMs` (1→1m, 3→30m, 5→6h, fuera de rango → 6h); `planNextAttempt` (attempts=0
  reintentable → retry con nextRetryAt=+1m; attempts=4 reintentable → retry +6h;
  attempts=5 → terminal; no reintentable a cualquier attempts → terminal).
- **`transport.test.ts`**: `SmtpTransport` marca `retryable` correctamente por status
  (mock de `fetch`): 500 → retryable true; 400 → false; fetch lanza → true. (LoggingTransport ok, ya cubierto.)
- **Cron `retry-executions`**: con prisma mockeado (patrón de los tests de rutas
  existentes) — 401 sin secret; claim guardado (si `updateMany.count===0`, no invoca
  `retryExecution`); happy path invoca `retryExecution` por cada id reclamado.
- **Runner**: `review-actions.test.ts` (mockea el runner) sigue verde; añadir cobertura de
  que el intento inicial fallido reintentable reprograma (`nextRetryAt` seteado, attempts
  sin cambiar) vs. no reintentable/agotado terminaliza — con prisma + transport mockeados.
- Suite completa + `npm run build` verdes.

## Riesgos y mitigaciones

- **Doble envío en reintento** → claim por-id (updateMany guardado) antes de enviar.
- **Barrido que se cuelga en una acción** → cada `retryExecution` en try/catch; el resto
  del lote continúa.
- **Backoff mal indexado** → `planNextAttempt`/`backoffMs` puros y testeados en los bordes.
- **Fuga de datos** → `lastError` = `String(result.error)` (mensajes acotados de
  transporte, sin destinatario ni cuerpo); labels de métrica solo tipos/ids/contadores.
- **Parada de emergencia durante reintento** → terminaliza (documentado); no reintenta a
  ciegas.

## Entregable

Una PR con:
- `src/lib/execution/retry.ts` + `retry.test.ts` (nuevos).
- `SendResult.retryable` en `src/lib/execution.ts`; `SmtpTransport` marcándolo; test.
- Migración Prisma (`attempts`, `nextRetryAt`, `lastError`, índice) aplicada.
- Refactor de `runner.ts` (`runAttempt`, `retryExecution`, reprogramar/terminalizar).
- Ruta `api/cron/retry-executions/route.ts` + test.
- Actualización del Kanban marcando la tarea 110 de la fase 13.
