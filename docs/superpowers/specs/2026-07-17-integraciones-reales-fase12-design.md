# Fase 12 — Integraciones reales (diseño)

**Fecha:** 2026-07-17
**Roadmap:** pasos 103–107 (`docs/ROADMAP.md`)
**Cierra:** funcionalidad 3 de `docs/FEATURES.md` (auto-escalado por SLA)

## Objetivo

Cerrar el pipeline de extremo a extremo: un agente externo envía acciones por
API, las políticas se evalúan sobre persistencia real, las acciones aprobadas se
ejecutan contra una herramienta real (email) y las acciones vencidas se escalan
solas. Es el salto de "datos simulados" a "integración real".

## Decisiones tomadas

1. **Email real** → interfaz `EmailTransport` con dos implementaciones: real
   (SMTP/Resend, activa si hay credenciales en ENV) y `LoggingTransport` de dev
   (persiste el correo, no envía). Arquitectura de integración real sin depender
   de una cuenta ahora.
2. **Auth de agente** → API key por agente (`Bearer ag_live_xxx`), guardada solo
   como hash en una tabla nueva. Revocable y rotable, independiente de la sesión
   de usuario.
3. **Auto-escalado SLA** → endpoint de barrido protegido `POST /api/cron/escalate`
   (secreto `CRON_SECRET`), disparado por un scheduler externo (Vercel Cron,
   GitHub Actions o curl). Funciona en serverless, testeable sin proceso vivo.

## Arquitectura (pipeline)

```
Agente externo
   │  POST /api/agent/actions   (Bearer ag_live_xxx)
   ▼
[auth agente] → [validar contrato] → [evaluatePolicy] → [computeApprovalDueAt]
   │
   ├─ effect allow           → status=allowed          → executeAction (ya)
   ├─ effect require_approval → status=needs_approval   → espera revisor
   ├─ effect escalate         → status=needs_approval   → espera (marcada para escalar)
   └─ effect block            → status=blocked          → nunca ejecuta
   │
Revisor aprueba (src/lib/review-actions.ts) → status=approved
   ▼
[executeAction] → EmailTransport.send() → executed | failed  + AuditEvent + IntegrationLog

Scheduler externo → POST /api/cron/escalate   (Bearer CRON_SECRET)
   → needs_approval vencidas (approvalDueAt < now) → escalated + AuditEvent(action_escalated)
```

## Reutilización de código existente

- `src/lib/policy-eval.ts` → `evaluatePolicy(action, policies, ctx)` devuelve
  `effect: block | escalate | require_approval | allow`. La ingesta lo usa tal
  cual; solo añade el mapeo effect → `ActionStatus`.
- `src/lib/sla.ts` → `computeApprovalDueAt(...)` para el vencimiento en ingesta;
  se le añade `findOverdue(actions, now)` (pura) para el cron.
- `src/lib/review-actions.ts` → la aprobación por revisor ya existe; se conecta
  su salida (`approved`) a `executeAction`.
- Estados de `AgentAction` (`escalated`, `executed`, `failed`) ya existen en el
  schema; no se añaden estados nuevos.

## Componentes (unidades aisladas)

### 1. Auth de agentes — `src/lib/auth/agent-keys.ts`

- Tabla Prisma nueva:
  `AgentApiKey { id, agentId, prefix, keyHash, lastUsedAt?, revokedAt?, createdAt }`.
- `generateAgentKey(agentId)` → devuelve el secreto en claro `ag_live_<random>`
  **una sola vez**; persiste `sha256(secreto)` en `keyHash` y los primeros 8
  chars en `prefix` (para mostrar en UI sin revelar el secreto).
- `authenticateAgent(bearer)` → `sha256(bearer)` → busca key con ese hash y
  `revokedAt = null` → devuelve `{ agent, organizationId }` o `null`. Actualiza
  `lastUsedAt`. Comparación por hash (no por string en claro).
- Lógica de hashing/verificación en funciones puras testeables; el I/O Prisma
  aislado en las funciones que consultan la tabla.

### 2. Contrato de ingesta — `src/lib/ingest/contract.ts`

- Tipo `IngestActionInput` + validador (mismo estilo manual que
  `src/lib/auth/credentials.ts`, sin dependencia nueva):
  `{ actionType: string, toolId: string, riskLevel?: RiskLevel, payload: object, externalId?: string }`.
- `externalId` → idempotencia: reintento del agente no duplica la acción.
  Unique `(agentId, externalId)` en `AgentAction`.
- Devuelve `{ ok, value }` o `{ ok: false, errors }` (fail-closed).

### 3. Endpoint de ingesta — `src/app/api/agent/actions/route.ts`

`POST`:
1. `authenticateAgent(Authorization)` → 401 si falla.
2. Validar contrato → 422 si inválido.
3. Verificar que `toolId` pertenece a la org del agente → 422 si no.
4. Construir `AgentAction` en `proposed`.
5. `evaluatePolicy` con el contexto (tools/agents/permissions de la org).
6. Mapear `effect` → `status`:
   - `allow` → `allowed`
   - `require_approval` → `needs_approval` (+ `computeApprovalDueAt`)
   - `escalate` → `needs_approval` (+ `computeApprovalDueAt`; se escalará al vencer)
   - `block` → `blocked`
7. Persistir acción + `AuditEvent(action_proposed)`; si `externalId` duplicado → 409.
8. Si `status = allowed` → `executeAction(actionId)` (fire-and-persist).
9. Responder `201 { actionId, status }`.

### 4. Ejecución real — `src/lib/execution.ts` + `src/lib/execution/`

- `src/lib/execution/transport.ts`:
  `interface EmailTransport { send(msg): Promise<{ ok: boolean; providerId?: string; error?: string }> }`.
- `SmtpTransport` (real; activo si ENV `RESEND_API_KEY` o `SMTP_*` presentes) y
  `LoggingTransport` (dev; persiste el correo, no envía).
- `resolveTransport()` elige por ENV (real si hay credenciales, si no logging).
- `src/lib/execution.ts` → transición pura `applyExecutionResult(action, result)`
  → `executed` (con `executedAt`) | `failed`. Testeable sin I/O.
- `executeAction(actionId)` (server, con I/O): carga acción `approved | allowed`
  → `resolveTransport().send(payload)` → `applyExecutionResult` → persiste
  estado + `IntegrationLog` + `AuditEvent(action_executed | action_failed)`.

### 5. Auto-escalado SLA — `src/app/api/cron/escalate/route.ts`

- `src/lib/sla.ts` gana `findOverdue(actions, now)` → ids de acciones
  `needs_approval` con `approvalDueAt < now` (pura).
- `POST`: auth por `CRON_SECRET` (Bearer) → 401 si falla → cargar
  `needs_approval` de todas las orgs → `findOverdue` → transición a `escalated`
  + `AuditEvent(action_escalated)` por cada una → responder `{ escalated: n }`.
- Idempotente: reejecutar no re-escala lo ya escalado (solo mira `needs_approval`).

## Esquema (migración Prisma)

- **Nueva** `AgentApiKey { id, agentId (FK Agent), prefix, keyHash @unique,
  lastUsedAt?, revokedAt?, createdAt }`.
- **Nueva** `IntegrationLog { id, actionId (FK AgentAction), toolType, transport,
  status, detail?, createdAt }` → evidencia real de ejecución (alimenta
  auditoría/detalle de acción). Añadir la entidad a `docs/DATA_MODEL.md`.
- `AgentAction`: `externalId String?` + `@@unique([agentId, externalId])`.
- Sin estados nuevos.

## Manejo de errores

- **Ingesta** fail-closed: contrato inválido → 422 sin persistir; auth inválida →
  401; `externalId` duplicado → 409.
- **Ejecución**: cualquier excepción del transport → `failed` + detalle en
  `IntegrationLog`; nunca deja la acción colgada en `approved`. Reintentos =
  Fase 13 (paso 110); aquí solo captura limpia y registro.
- **Cron**: secreto inválido → 401; idempotente.

## Seguridad (revisión de `arquitecto` antes del merge)

Endpoint público nuevo + credenciales M2M + secreto de cron = superficie
sensible. Requisitos:
- API keys solo hasheadas en reposo (nunca en claro salvo el retorno único).
- Comparación por hash, no por string; evitar filtrar por timing.
- `CRON_SECRET` y credenciales de email fuera de logs.
- Rate-limit básico en la ingesta o nota explícita difiriéndolo a Fase 13.

## Tests (Vitest, patrón existente)

- `agent-keys.test.ts` → hash/verify, revocación.
- `ingest-contract.test.ts` → validación del body.
- mapeo `effect → status` → cada effect al status correcto.
- `execution.test.ts` → `executed`/`failed`, `LoggingTransport`.
- `sla.test.ts` → `findOverdue` (vencidas vs no vencidas).

## Alcance

Los 5 pasos forman un pipeline coherente → **un solo spec**. El plan de
implementación lo trocea en commits atómicos, uno por paso del roadmap
(103→107), en orden.

## Entregables de scaffolding

- Variables ENV nuevas documentadas en `.env.example`: `CRON_SECRET`,
  `RESEND_API_KEY` (o `SMTP_HOST/PORT/USER/PASS`).
- Actualizar `kanban.html` (fase 12) y `docs/DATA_MODEL.md` (`IntegrationLog`,
  `AgentApiKey`, `AgentAction.externalId`).
