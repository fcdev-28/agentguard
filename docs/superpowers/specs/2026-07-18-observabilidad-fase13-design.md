# Diseño — Fase 13 · Tarea 112: Observabilidad (logs estructurados + métricas)

**Fecha:** 2026-07-18
**Fase:** 13 (Preparación para producción)
**Tarea del roadmap:** 112 — «Añadir observabilidad básica: logs estructurados y métricas.»

## Contexto

Segunda tarea de la fase 13 (tras 111 CI). Hoy la app no tiene logging estructurado ni
métricas: solo dos `console.*` ad-hoc:

- `src/lib/execution/transport.ts:20` — `console.info("[email:logging]", …)` en el
  transporte de dev.
- `src/app/api/agent/actions/route.ts:156` — `console.error("[ingesta] fallo al ejecutar la acción", created.id, err)` cuando la ejecución post-ingesta lanza.

No hay ninguna dependencia de logging/telemetría en `package.json`.

**Runtime:** Next.js App Router, previsiblemente desplegado en serverless (Vercel) sobre
Neon. En serverless el estado en memoria no persiste entre invocaciones, así que un
registro de métricas en memoria expuesto por un endpoint tipo Prometheus no agregaría
nada útil. Por eso las **métricas se modelan como eventos de log**: cada ocurrencia
relevante emite una línea JSON con un campo `metric` + labels, y el destino de logs
(Vercel/Datadog/consulta) hace la agregación. Cero infraestructura extra.

### Decisiones tomadas en brainstorming

- **Métricas = eventos de métrica en los logs** (no endpoint Prometheus, no tabla en
  Postgres). Un counter = una línea de log por ocurrencia.
- **Logger propio mínimo**, sin librería (pino descartado por dependencia y fricción de
  transports/worker-threads en serverless/edge). El alcance es "observabilidad básica".

## Objetivo

Un módulo de logging estructurado propio (un único sink) y la instrumentación de los
hot paths (ingesta, ejecución, cron de escalado, transporte) para que cada acción
relevante deje: (a) logs JSON consultables y (b) eventos de métrica (counters) sobre el
flujo de acciones. Sin exponer payloads sensibles.

**Fuera de alcance:** OpenTelemetry / tracing distribuido, `AsyncLocalStorage` para
propagar contexto de request, endpoint de métricas, dashboards, alertas.

## Diseño

### 1. Módulo `src/lib/observability/logger.ts`

Núcleo puro + finas funciones de escritura. Edge-safe (usa `console.log`/`console.error`,
no `process.stdout`).

**Tipos y niveles:**

```ts
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface LogRecord {
  ts: string; // ISO 8601
  level: LogLevel;
  msg: string;
  [key: string]: unknown; // fields
}
```

**Núcleo puro (testeable sin I/O):**

- `buildLogRecord(level, msg, fields, now?)`: devuelve `{ ts: (now ?? new Date()).toISOString(), level, msg, ...fields }`. `msg`, `level` y `ts` no son sobreescribibles por `fields` (se aplican después del spread para que un `fields.level` no rompa el registro; ver test).
- `LEVEL_ORDER: Record<LogLevel, number>` = `{ debug: 10, info: 20, warn: 30, error: 40 }`.
- `shouldLog(configLevel, recordLevel)`: `LEVEL_ORDER[recordLevel] >= LEVEL_ORDER[configLevel]`.

**Escritura:**

- Nivel configurado: `LOG_LEVEL` de entorno (default `"info"`); si el valor no es un
  `LogLevel` válido → `"info"`. Se resuelve por llamada (no se cachea en módulo, para
  que sea testeable y respete cambios de entorno).
- `write(level, msg, fields?)`: si `!shouldLog(config, level)` no hace nada; si no,
  serializa `JSON.stringify(buildLogRecord(...))` y lo manda a `console.error` cuando
  `level` es `warn`/`error` (stderr), o a `console.log` en `debug`/`info` (stdout).
- API de conveniencia `logger`:
  ```ts
  export const logger = {
    debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
    info:  (msg: string, fields?: LogFields) => write("info", msg, fields),
    warn:  (msg: string, fields?: LogFields) => write("warn", msg, fields),
    error: (msg: string, fields?: LogFields) => write("error", msg, fields),
  };
  ```
- `metric(name, labels?)`: emite un record de nivel `info` con `msg: name` y campos
  `{ metric: name, ...labels }`. Cada llamada representa `+1` al counter `name`. Se
  apoya en `write`, así que respeta el filtrado por nivel.

**Regla de datos sensibles:** en labels solo IDs y tipos/estados. Nunca payloads,
cuerpos de email, destinatarios, secretos ni tokens.

### 2. Instrumentación de hot paths

Reemplaza los dos `console.*` ad-hoc y añade eventos de métrica. Ninguna consulta extra
a la BD: se usan solo datos ya disponibles en cada sitio.

**`src/app/api/agent/actions/route.ts`:**

- Al inicio del `POST`, generar `const requestId = crypto.randomUUID();` (de
  `node:crypto`) para correlación dentro del handler.
- Tras crear la acción y su `AuditEvent`, emitir
  `metric("action.ingested", { organizationId: auth.organizationId, agentId: auth.agentId, status, effect: evaluation.effect })`.
- El `console.error` de la línea 156 pasa a
  `logger.error("Fallo al ejecutar la acción tras la ingesta", { requestId, actionId: created.id, err: String(err) })`.
  (Se serializa `err` a string; no se vuelca el objeto entero.)

**`src/lib/execution/runner.ts`:**

- Cuando la parada de emergencia bloquea: antes de devolver el error,
  `metric("execution.blocked_emergency", { organizationId: action.organizationId })`.
- Tras persistir el desenlace, emitir según resultado:
  - éxito → `metric("action.executed", { toolType: "email", transport: transport.name })`
  - fallo → `metric("action.failed", { toolType: "email", transport: transport.name, reason: result.error ?? "unknown" })`
    (Emitido solo cuando `persisted === true`, para no contar ejecuciones que perdieron la
    carrera de idempotencia.)

**`src/app/api/cron/escalate/route.ts`:**

- Antes del `return NextResponse.json({ escalated })` final, emitir
  `metric("action.escalated", { count: escalated })`. (Un único evento con el conteo del
  barrido; suficiente para "básica".)

**`src/lib/execution/transport.ts`:**

- `console.info("[email:logging]", …)` de la línea 20 pasa a
  `logger.info("email enviado (logging transport)", { to: msg.to, subject: msg.subject })`.
  Nota: `to`/`subject` ya se registraban antes; se mantienen porque este transporte es
  solo de dev/fallback y no envía de verdad. En el transporte real (Resend) no se
  registran cuerpo ni destinatario.

## Testing (TDD)

Fichero `src/lib/observability/logger.test.ts`:

1. `buildLogRecord` produce `{ ts, level, msg }` con `ts` ISO (inyectando `now`) y
   mezcla `fields`.
2. `buildLogRecord` no deja que `fields` sobreescriba `level`/`msg`/`ts`.
3. `shouldLog`: `warn` pasa con config `info`; `debug` no pasa con config `info`;
   `error` pasa con config `error`.
4. `write`/`logger`: con `LOG_LEVEL=warn`, `logger.info(...)` no llama a `console.log`;
   `logger.error(...)` sí llama a `console.error` con una cadena que parsea a JSON con el
   nivel y msg esperados (spies de `console`, restaurados en `afterEach`).
5. `metric`: emite un record con `metric: name` y los labels dados, a nivel info.

Instrumentación:

- El build (`npm run build`) y la suite existente (251 tests) siguen en verde.
- Añadir en `src/lib/execution/*.test.ts` (o donde ya se testee el runner) **una**
  aserción con spy: al ejecutar con éxito, `metric` (o `console.log`) recibe un evento
  `action.executed`. No duplicar la cobertura del runner; solo comprobar que el hook de
  métrica se dispara.

## Riesgos y mitigaciones

- **Ruido de logs / coste** → filtrado por `LOG_LEVEL` (default `info`); `debug`
  silenciado en prod salvo que se active.
- **Fuga de datos sensibles** → regla explícita: labels solo con IDs/tipos; `err`
  serializado a string; en la ruta real no se registran cuerpos.
- **Fricción edge** → el logger usa `console.*`, disponible en node y edge; no importa
  `node:*` en el propio módulo (el `randomUUID` vive en la ruta, que es runtime node).
- **Sobre-serialización de errores** → `String(err)` en vez de volcar el objeto o el
  stack completo.

## Entregable

Una PR con:

- `src/lib/observability/logger.ts` (nuevo) + `src/lib/observability/logger.test.ts` (nuevo)
- Instrumentación en `api/agent/actions/route.ts`, `execution/runner.ts`,
  `api/cron/escalate/route.ts`, `execution/transport.ts`
- `.env.example` (+ `LOG_LEVEL`)
- Actualización del Kanban marcando la tarea 112 de la fase 13.
