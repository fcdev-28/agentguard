# Integraciones reales (Fase 12) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el pipeline de extremo a extremo — un agente externo envía acciones por API (autenticado con API key), las políticas se evalúan sobre BD real, las acciones aprobadas se ejecutan contra un transporte de email real (o logging en dev) y las acciones vencidas se auto-escalan.

**Architecture:** Endpoint de ingesta (`POST /api/agent/actions`) autentica al agente por API key hasheada, valida el contrato, reutiliza `evaluatePolicy` para decidir el estado y persiste la acción. La ejecución (`executeAction`) usa una interfaz `EmailTransport` con implementación real opcional. Un endpoint de barrido (`POST /api/cron/escalate`) protegido por secreto escala las acciones vencidas. Lógica pura aislada y testeada; el I/O de Prisma y de red vive en módulos server-only finos.

**Tech Stack:** Next.js App Router (route handlers), TypeScript estricto, Prisma (`src/generated/prisma`), Vitest. Sin dependencias nuevas: hashing y aleatoriedad con `node:crypto`, HTTP saliente con `fetch` nativo.

## Global Constraints

- TypeScript estricto; sin `any` sin justificar.
- Sin dependencias nuevas: usar `node:crypto` y `fetch` nativos.
- Cliente Prisma se importa de `@/lib/prisma`; tipos generados de `@/generated/prisma/client`.
- Rutas en inglés; copy visible y mensajes de error en castellano.
- Resultado uniforme de funciones server de mutación: `{ ok: true } | { error: string }` (o `{ ok, value }` en validadores).
- Commits pequeños, tipo convencional + texto en español (`feat:`, `test:`, `docs:`).
- Tests con `npx vitest run <ruta>`; suite completa `npm test`.
- Lógica pura sin `server-only`/Prisma en su propio módulo (patrón `session.ts`/`session-db.ts`); el I/O aislado en módulos `*-db`/`runner`.
- Estados de `AgentAction` ya existen (`escalated`, `executed`, `failed`); no se añaden estados nuevos.
- Enums Prisma relevantes ya existen: `AuditEventType` incluye `action_proposed`, `action_allowed`, `action_blocked`, `action_escalated`, `action_executed`, `action_failed`.

---

## Estructura de ficheros

**Nuevos:**
- `src/lib/auth/agent-keys.ts` — puro: `parseBearer`, `hashApiKey`, `generateApiKeyToken`.
- `src/lib/auth/agent-keys-db.ts` — server-only: `createAgentKey`, `authenticateAgent` (Prisma).
- `src/lib/ingest/contract.ts` — puro: tipo `IngestActionInput` + `validateIngestInput`.
- `src/lib/ingest/status.ts` — puro: `effectToStatus`.
- `src/app/api/agent/actions/route.ts` — endpoint de ingesta.
- `src/lib/execution.ts` — puro: `applyExecutionResult`, `toEmailMessage`.
- `src/lib/execution/transport.ts` — `EmailTransport`, `LoggingTransport`, `SmtpTransport`, `resolveTransport`.
- `src/lib/execution/runner.ts` — server-only: `executeAction`.
- `src/app/api/cron/escalate/route.ts` — endpoint de barrido SLA.
- Tests: `agent-keys.test.ts`, `ingest/contract.test.ts`, `ingest/status.test.ts`, `execution.test.ts`, `execution/transport.test.ts`, `sla.test.ts` (ampliado).

**Modificados:**
- `prisma/schema.prisma` — `AgentApiKey`, `IntegrationLog`, `AgentAction.externalId`, relaciones inversas.
- `src/lib/sla.ts` — añade `findOverdue`.
- `src/lib/review-actions.ts` — `decideAction` dispara `executeAction` al aprobar.
- `.env.example` — `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.
- `docs/DATA_MODEL.md`, `kanban.html`.

---

## Task 1: Migración de esquema (AgentApiKey, IntegrationLog, externalId)

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: modelos Prisma `AgentApiKey`, `IntegrationLog`; campo `AgentAction.externalId String?` con `@@unique([agentId, externalId])`. Tipos generados disponibles en `@/generated/prisma/client`.

- [ ] **Step 1: Añadir el enum de estado de ejecución**

En `prisma/schema.prisma`, junto al resto de enums (tras `enum ActionStatus { ... }`), añadir:

```prisma
enum IntegrationLogStatus {
  succeeded
  failed
}
```

- [ ] **Step 2: Añadir el campo `externalId` a `AgentAction`**

En `model AgentAction`, añadir el campo tras `executedAt`:

```prisma
  executedAt     DateTime?
  externalId     String?
```

Añadir la relación inversa junto a las demás (`approval`, `comments`, …):

```prisma
  integrationLogs IntegrationLog[]
```

Y en la zona de índices del modelo:

```prisma
  // Idempotencia de ingesta: un agente no duplica la misma acción externa.
  @@unique([agentId, externalId])
```

- [ ] **Step 3: Añadir la relación inversa de API keys en `Agent`**

En `model Agent`, junto a `actions AgentAction[]`:

```prisma
  apiKeys     AgentApiKey[]
```

- [ ] **Step 4: Añadir los modelos nuevos**

Al final de la sección de modelos:

```prisma
model AgentApiKey {
  id         String    @id @default(cuid())
  agentId    String
  prefix     String
  keyHash    String    @unique
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@index([agentId])
}

model IntegrationLog {
  id        String               @id @default(cuid())
  actionId  String
  toolType  ToolType
  transport String
  status    IntegrationLogStatus
  detail    String?
  createdAt DateTime             @default(now())

  action AgentAction @relation(fields: [actionId], references: [id], onDelete: Cascade)

  @@index([actionId])
}
```

- [ ] **Step 5: Validar el esquema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 6: Crear la migración y regenerar el cliente**

Run: `npm run db:migrate -- --name fase12_integraciones`
Expected: migración aplicada y `Generated Prisma Client`. Aparece `prisma/migrations/<timestamp>_fase12_integraciones/`.

> Si no hay BD disponible en el entorno, ejecutar al menos `npx prisma generate` para regenerar los tipos y anotarlo; la migración se aplica cuando haya BD.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: esquema de fase 12 (AgentApiKey, IntegrationLog, externalId)"
```

---

## Task 2: Auth de agentes (helpers puros)

**Files:**
- Create: `src/lib/auth/agent-keys.ts`
- Test: `src/lib/auth/agent-keys.test.ts`

**Interfaces:**
- Produces:
  - `parseBearer(header: string | null): string | null`
  - `hashApiKey(token: string): string` (sha256 hex)
  - `generateApiKeyToken(): { token: string; prefix: string; keyHash: string }`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/auth/agent-keys.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  generateApiKeyToken,
  hashApiKey,
  parseBearer,
} from "@/lib/auth/agent-keys";

describe("parseBearer", () => {
  it("extrae el token de un header Bearer", () => {
    expect(parseBearer("Bearer ag_live_abc")).toBe("ag_live_abc");
  });

  it("devuelve null si falta el header o el esquema", () => {
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer("ag_live_abc")).toBeNull();
    expect(parseBearer("Basic xyz")).toBeNull();
  });
});

describe("hashApiKey", () => {
  it("es determinista y devuelve sha256 hex de 64 chars", () => {
    const h = hashApiKey("ag_live_abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey("ag_live_abc")).toBe(h);
  });

  it("cambia con la entrada", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});

describe("generateApiKeyToken", () => {
  it("genera token con prefijo ag_live_, prefix visible y hash coherente", () => {
    const { token, prefix, keyHash } = generateApiKeyToken();
    expect(token.startsWith("ag_live_")).toBe(true);
    expect(prefix).toBe(token.slice(0, 12));
    expect(keyHash).toBe(hashApiKey(token));
  });

  it("genera tokens distintos en cada llamada", () => {
    expect(generateApiKeyToken().token).not.toBe(generateApiKeyToken().token);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/auth/agent-keys.test.ts`
Expected: FAIL — no existe `@/lib/auth/agent-keys`.

- [ ] **Step 3: Implementar**

`src/lib/auth/agent-keys.ts`:

```typescript
/**
 * Helpers puros de API keys de agente (sin Prisma, testeables). El I/O contra
 * BD vive en `agent-keys-db.ts` (patrón session.ts / session-db.ts).
 *
 * La key se muestra en claro una sola vez al crearla; en BD solo se guarda su
 * hash sha256. El `prefix` (primeros chars) se guarda aparte para mostrarla en
 * la UI sin revelar el secreto.
 */
import { createHash, randomBytes } from "node:crypto";

/** Extrae el token de un header `Authorization: Bearer <token>`. */
export function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/** sha256 hex del token: lo que se guarda y se compara en BD. */
export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Genera una key nueva: el secreto en claro, su prefijo visible y su hash. */
export function generateApiKeyToken(): {
  token: string;
  prefix: string;
  keyHash: string;
} {
  const token = `ag_live_${randomBytes(24).toString("hex")}`;
  return { token, prefix: token.slice(0, 12), keyHash: hashApiKey(token) };
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/auth/agent-keys.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/agent-keys.ts src/lib/auth/agent-keys.test.ts
git commit -m "feat: helpers puros de API key de agente"
```

---

## Task 3: Auth de agentes (I/O Prisma)

**Files:**
- Create: `src/lib/auth/agent-keys-db.ts`

**Interfaces:**
- Consumes: `parseBearer`, `hashApiKey`, `generateApiKeyToken` (Task 2); `prisma` de `@/lib/prisma`.
- Produces:
  - `createAgentKey(agentId: string): Promise<{ token: string; prefix: string }>`
  - `authenticateAgent(header: string | null): Promise<{ agentId: string; organizationId: string } | null>`

- [ ] **Step 1: Implementar (sin test unitario — toca Prisma, se verifica en la ingesta)**

`src/lib/auth/agent-keys-db.ts`:

```typescript
import "server-only";

/**
 * I/O de API keys de agente contra BD. La autenticación identifica al agente
 * por el hash de su key (nunca compara el secreto en claro) y descarta las
 * revocadas. `createAgentKey` devuelve el secreto en claro una única vez.
 */
import { prisma } from "@/lib/prisma";
import {
  generateApiKeyToken,
  hashApiKey,
  parseBearer,
} from "@/lib/auth/agent-keys";

/** Crea y persiste una API key para un agente; devuelve el secreto una sola vez. */
export async function createAgentKey(
  agentId: string,
): Promise<{ token: string; prefix: string }> {
  const { token, prefix, keyHash } = generateApiKeyToken();
  await prisma.agentApiKey.create({ data: { agentId, prefix, keyHash } });
  return { token, prefix };
}

/**
 * Autentica una petición de agente por su header `Authorization`. Devuelve el
 * agente y su organización, o `null` si el token falta, no casa o está revocado.
 */
export async function authenticateAgent(
  header: string | null,
): Promise<{ agentId: string; organizationId: string } | null> {
  const token = parseBearer(header);
  if (!token) return null;

  const key = await prisma.agentApiKey.findUnique({
    where: { keyHash: hashApiKey(token) },
    include: { agent: { select: { id: true, organizationId: true } } },
  });
  if (!key || key.revokedAt) return null;

  await prisma.agentApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    agentId: key.agent.id,
    organizationId: key.agent.organizationId,
  };
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/agent-keys-db.ts
git commit -m "feat: autenticación de agente por API key contra BD"
```

---

## Task 4: Contrato de ingesta (validador puro)

**Files:**
- Create: `src/lib/ingest/contract.ts`
- Test: `src/lib/ingest/contract.test.ts`

**Interfaces:**
- Produces:
  - `interface IngestActionInput { actionType: ActionType; toolId: string; title: string; summary: string; riskLevel?: RiskLevel; payload: Record<string, unknown>; externalId?: string }`
  - `validateIngestInput(raw: unknown): { ok: true; value: IngestActionInput } | { ok: false; error: string }`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/ingest/contract.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { validateIngestInput } from "@/lib/ingest/contract";

const base = {
  actionType: "send_email",
  toolId: "tool_email",
  title: "Enviar respuesta al ticket",
  summary: "Responder al cliente sobre el reembolso",
  payload: { to: "cliente@example.com" },
};

describe("validateIngestInput", () => {
  it("acepta un input mínimo válido", () => {
    const r = validateIngestInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.actionType).toBe("send_email");
      expect(r.value.riskLevel).toBeUndefined();
    }
  });

  it("acepta riskLevel y externalId opcionales", () => {
    const r = validateIngestInput({
      ...base,
      riskLevel: "high",
      externalId: "ext-1",
    });
    expect(r.ok && r.value.riskLevel).toBe("high");
    expect(r.ok && r.value.externalId).toBe("ext-1");
  });

  it("rechaza un body que no es objeto", () => {
    expect(validateIngestInput(null)).toEqual({
      ok: false,
      error: expect.any(String),
    });
  });

  it("rechaza actionType desconocido", () => {
    const r = validateIngestInput({ ...base, actionType: "hack" });
    expect(r.ok).toBe(false);
  });

  it("rechaza riskLevel inválido", () => {
    const r = validateIngestInput({ ...base, riskLevel: "extreme" });
    expect(r.ok).toBe(false);
  });

  it("rechaza si falta toolId, title, summary o payload", () => {
    for (const key of ["toolId", "title", "summary", "payload"]) {
      const bad = { ...base };
      delete (bad as Record<string, unknown>)[key];
      expect(validateIngestInput(bad).ok).toBe(false);
    }
  });

  it("rechaza payload que no es objeto", () => {
    expect(validateIngestInput({ ...base, payload: "x" }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/ingest/contract.test.ts`
Expected: FAIL — no existe el módulo.

- [ ] **Step 3: Implementar**

`src/lib/ingest/contract.ts`:

```typescript
/**
 * Contrato de ingesta de acciones de agente: valida el body de
 * `POST /api/agent/actions` antes de tocar BD. Fail-closed — cualquier campo
 * ausente o con valor no reconocido rechaza la acción entera. Validación manual
 * (sin dependencia nueva), mismo estilo que `auth/credentials.ts`.
 */
import type { ActionType, RiskLevel } from "@/domain";

const ACTION_TYPES: ReadonlySet<string> = new Set<ActionType>([
  "send_email",
  "update_record",
  "issue_refund",
  "create_task",
  "change_permission",
]);

const RISK_LEVELS: ReadonlySet<string> = new Set<RiskLevel>([
  "low",
  "medium",
  "high",
  "critical",
]);

export interface IngestActionInput {
  actionType: ActionType;
  toolId: string;
  title: string;
  summary: string;
  riskLevel?: RiskLevel;
  payload: Record<string, unknown>;
  externalId?: string;
}

export type IngestValidation =
  | { ok: true; value: IngestActionInput }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Valida y normaliza el body de ingesta. */
export function validateIngestInput(raw: unknown): IngestValidation {
  if (!isRecord(raw)) {
    return { ok: false, error: "El cuerpo debe ser un objeto JSON." };
  }
  if (!nonEmptyString(raw.actionType) || !ACTION_TYPES.has(raw.actionType)) {
    return { ok: false, error: "actionType no reconocido." };
  }
  if (!nonEmptyString(raw.toolId)) {
    return { ok: false, error: "toolId es obligatorio." };
  }
  if (!nonEmptyString(raw.title)) {
    return { ok: false, error: "title es obligatorio." };
  }
  if (!nonEmptyString(raw.summary)) {
    return { ok: false, error: "summary es obligatorio." };
  }
  if (!isRecord(raw.payload)) {
    return { ok: false, error: "payload debe ser un objeto." };
  }
  if (raw.riskLevel !== undefined && !RISK_LEVELS.has(raw.riskLevel as string)) {
    return { ok: false, error: "riskLevel no válido." };
  }
  if (raw.externalId !== undefined && !nonEmptyString(raw.externalId)) {
    return {
      ok: false,
      error: "externalId, si se envía, no puede estar vacío.",
    };
  }

  return {
    ok: true,
    value: {
      actionType: raw.actionType as ActionType,
      toolId: raw.toolId,
      title: raw.title,
      summary: raw.summary,
      riskLevel: raw.riskLevel as RiskLevel | undefined,
      payload: raw.payload,
      externalId: raw.externalId as string | undefined,
    },
  };
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/ingest/contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/contract.ts src/lib/ingest/contract.test.ts
git commit -m "feat: validador del contrato de ingesta de acciones"
```

---

## Task 5: Mapeo efecto de política → estado de acción (puro)

**Files:**
- Create: `src/lib/ingest/status.ts`
- Test: `src/lib/ingest/status.test.ts`

**Interfaces:**
- Consumes: `PolicyEffect` de `@/domain`.
- Produces: `effectToStatus(effect: PolicyEffect): ActionStatus`, mapeo
  `allow→allowed`, `block→blocked`, `require_approval→needs_approval`,
  `escalate→needs_approval`.

- [ ] **Step 1: Escribir el test que falla**

`src/lib/ingest/status.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { effectToStatus } from "@/lib/ingest/status";

describe("effectToStatus", () => {
  it("mapea cada efecto de política a su estado de acción", () => {
    expect(effectToStatus("allow")).toBe("allowed");
    expect(effectToStatus("block")).toBe("blocked");
    expect(effectToStatus("require_approval")).toBe("needs_approval");
    expect(effectToStatus("escalate")).toBe("needs_approval");
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/ingest/status.test.ts`
Expected: FAIL — no existe el módulo.

- [ ] **Step 3: Implementar**

`src/lib/ingest/status.ts`:

```typescript
/**
 * Traduce el efecto que decide `evaluatePolicy` al estado inicial de la
 * `AgentAction` recién ingerida. `escalate` entra como `needs_approval`: se
 * escalará automáticamente al vencer su SLA (ver `/api/cron/escalate`).
 */
import type { ActionStatus, PolicyEffect } from "@/domain";

const EFFECT_STATUS: Record<PolicyEffect, ActionStatus> = {
  allow: "allowed",
  block: "blocked",
  require_approval: "needs_approval",
  escalate: "needs_approval",
};

export function effectToStatus(effect: PolicyEffect): ActionStatus {
  return EFFECT_STATUS[effect];
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/ingest/status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/status.ts src/lib/ingest/status.test.ts
git commit -m "feat: mapeo efecto de política a estado de acción"
```

---

## Task 6: Ejecución — transición pura y construcción del mensaje

**Files:**
- Create: `src/lib/execution.ts`
- Test: `src/lib/execution.test.ts`

**Interfaces:**
- Consumes: `AgentAction`, `ActionStatus` de `@/domain`.
- Produces:
  - `interface EmailMessage { to: string; subject: string; body: string }`
  - `interface SendResult { ok: boolean; providerId?: string; error?: string }`
  - `toEmailMessage(action: AgentAction): EmailMessage`
  - `applyExecutionResult(currentStatus: ActionStatus, result: SendResult): { status: ActionStatus } | { error: string }`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/execution.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { applyExecutionResult, toEmailMessage } from "@/lib/execution";
import type { AgentAction } from "@/domain";

function action(overrides: Partial<AgentAction> = {}): AgentAction {
  return {
    id: "act_1",
    organizationId: "org_1",
    agentId: "agt_1",
    toolId: "tool_email",
    policyId: null,
    title: "Responder ticket 42",
    summary: "Responder al cliente sobre el reembolso",
    actionType: "send_email",
    status: "approved",
    riskLevel: "medium",
    payload: { to: "cliente@example.com", subject: "Tu reembolso" },
    policyResult: null,
    approvalDueAt: null,
    createdAt: "2026-07-17T09:00:00.000Z",
    updatedAt: "2026-07-17T09:00:00.000Z",
    executedAt: null,
    ...overrides,
  };
}

describe("toEmailMessage", () => {
  it("usa los campos del payload cuando existen", () => {
    expect(toEmailMessage(action())).toEqual({
      to: "cliente@example.com",
      subject: "Tu reembolso",
      body: "Responder al cliente sobre el reembolso",
    });
  });

  it("cae al título como asunto y al summary como cuerpo si faltan", () => {
    const msg = toEmailMessage(action({ payload: { to: "x@example.com" } }));
    expect(msg.subject).toBe("Responder ticket 42");
    expect(msg.body).toBe("Responder al cliente sobre el reembolso");
  });
});

describe("applyExecutionResult", () => {
  it("transiciona a executed cuando el envío tuvo éxito", () => {
    expect(applyExecutionResult("approved", { ok: true })).toEqual({
      status: "executed",
    });
    expect(applyExecutionResult("allowed", { ok: true })).toEqual({
      status: "executed",
    });
  });

  it("transiciona a failed cuando el envío falló", () => {
    expect(
      applyExecutionResult("approved", { ok: false, error: "smtp" }),
    ).toEqual({ status: "failed" });
  });

  it("rechaza ejecutar una acción que no está approved ni allowed", () => {
    const r = applyExecutionResult("needs_approval", { ok: true });
    expect("error" in r).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/execution.test.ts`
Expected: FAIL — no existe el módulo.

- [ ] **Step 3: Implementar**

`src/lib/execution.ts`:

```typescript
/**
 * Lógica pura de ejecución de acciones: qué mensaje de email produce una acción
 * y a qué estado transiciona según el resultado del envío. Sin I/O (el envío
 * real y la persistencia viven en `execution/runner.ts`). Solo se ejecutan
 * acciones que ya pasaron el control: `allowed` (política permitió) o
 * `approved` (revisor aprobó).
 */
import type { ActionStatus, AgentAction } from "@/domain";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

const EXECUTABLE: ReadonlySet<ActionStatus> = new Set<ActionStatus>([
  "allowed",
  "approved",
]);

/** Construye el email a partir de la acción, con fallbacks al título/summary. */
export function toEmailMessage(action: AgentAction): EmailMessage {
  const p = action.payload;
  const str = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.trim().length > 0 ? v : fallback;
  return {
    to: str(p.to, ""),
    subject: str(p.subject, action.title),
    body: str(p.body, action.summary),
  };
}

/** Estado resultante de ejecutar, o motivo por el que no procede. */
export function applyExecutionResult(
  currentStatus: ActionStatus,
  result: SendResult,
): { status: ActionStatus } | { error: string } {
  if (!EXECUTABLE.has(currentStatus)) {
    return { error: "La acción no está en un estado ejecutable." };
  }
  return { status: result.ok ? "executed" : "failed" };
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/execution.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/execution.ts src/lib/execution.test.ts
git commit -m "feat: transición pura de ejecución y construcción del email"
```

---

## Task 7: Transporte de email (interfaz + implementaciones)

**Files:**
- Create: `src/lib/execution/transport.ts`
- Test: `src/lib/execution/transport.test.ts`

**Interfaces:**
- Consumes: `EmailMessage`, `SendResult` (Task 6).
- Produces:
  - `interface EmailTransport { readonly name: string; send(msg: EmailMessage): Promise<SendResult> }`
  - `class LoggingTransport implements EmailTransport`
  - `class SmtpTransport implements EmailTransport` (Resend HTTP API)
  - `resolveTransport(): EmailTransport`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/execution/transport.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { LoggingTransport } from "@/lib/execution/transport";

describe("LoggingTransport", () => {
  it("acepta el envío y se identifica como 'logging'", async () => {
    const t = new LoggingTransport();
    expect(t.name).toBe("logging");
    const r = await t.send({
      to: "x@example.com",
      subject: "Hola",
      body: "Cuerpo",
    });
    expect(r.ok).toBe(true);
    expect(r.providerId).toBe("logged");
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/execution/transport.test.ts`
Expected: FAIL — no existe el módulo.

- [ ] **Step 3: Implementar**

`src/lib/execution/transport.ts`:

```typescript
/**
 * Transporte de email: interfaz de integración real y sus implementaciones.
 * `resolveTransport` elige por entorno — si hay `RESEND_API_KEY` (+ `EMAIL_FROM`)
 * envía de verdad (Resend), si no cae a `LoggingTransport` (dev: registra, no
 * envía). Los transportes no tocan Prisma; la evidencia (`IntegrationLog`) la
 * persiste el runner, para que sean intercambiables y testeables sin BD.
 */
import type { EmailMessage, SendResult } from "@/lib/execution";

export interface EmailTransport {
  readonly name: string;
  send(msg: EmailMessage): Promise<SendResult>;
}

/** Dev/fallback: registra el email por consola y lo da por enviado. */
export class LoggingTransport implements EmailTransport {
  readonly name = "logging";

  async send(msg: EmailMessage): Promise<SendResult> {
    console.info("[email:logging]", { to: msg.to, subject: msg.subject });
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
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/execution/transport.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/execution/transport.ts src/lib/execution/transport.test.ts
git commit -m "feat: transporte de email (logging + Resend real)"
```

---

## Task 8: Runner de ejecución (I/O)

**Files:**
- Create: `src/lib/execution/runner.ts`

**Interfaces:**
- Consumes: `applyExecutionResult`, `toEmailMessage` (Task 6); `resolveTransport` (Task 7); `getActionById` (`@/data/actions`); `prisma`.
- Produces: `executeAction(actionId: string): Promise<{ ok: true; status: ActionStatus } | { error: string }>`

- [ ] **Step 1: Implementar (sin test unitario — toca Prisma/red; se verifica end-to-end en Task 9)**

`src/lib/execution/runner.ts`:

```typescript
import "server-only";

/**
 * Ejecuta una acción `allowed` o `approved` contra la herramienta real y
 * persiste el desenlace: estado (`executed`/`failed`), `IntegrationLog` como
 * evidencia y `AuditEvent`. Nunca deja la acción colgada: cualquier fallo del
 * transporte se registra como `failed` (reintentos = fase 13).
 */
import type { ActionStatus, ToolType } from "@/domain";
import { prisma } from "@/lib/prisma";
import { getActionById } from "@/data/actions";
import { applyExecutionResult, toEmailMessage } from "@/lib/execution";
import { resolveTransport } from "@/lib/execution/transport";

export async function executeAction(
  actionId: string,
): Promise<{ ok: true; status: ActionStatus } | { error: string }> {
  const action = await getActionById(actionId);
  if (!action) return { error: "La acción no existe." };

  // Verifica el estado antes de gastar el envío.
  const guard = applyExecutionResult(action.status, { ok: true });
  if ("error" in guard) return guard;

  const transport = resolveTransport();
  const result = await transport.send(toEmailMessage(action));
  const final = applyExecutionResult(action.status, result);
  if ("error" in final) return final;

  const succeeded = final.status === "executed";
  const tool = await prisma.tool.findUnique({
    where: { id: action.toolId },
    select: { type: true },
  });

  await prisma.$transaction([
    prisma.agentAction.update({
      where: { id: actionId },
      data: {
        status: final.status,
        executedAt: succeeded ? new Date() : null,
      },
    }),
    prisma.integrationLog.create({
      data: {
        actionId,
        toolType: (tool?.type ?? "email") as ToolType,
        transport: transport.name,
        status: succeeded ? "succeeded" : "failed",
        detail: succeeded
          ? (result.providerId ?? null)
          : (result.error ?? null),
      },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: action.organizationId,
        agentId: action.agentId,
        actionId,
        eventType: succeeded ? "action_executed" : "action_failed",
        message: succeeded
          ? "Acción ejecutada contra la herramienta."
          : "La ejecución de la acción falló.",
        metadata: { transport: transport.name },
      },
    }),
  ]);

  return { ok: true, status: final.status };
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/execution/runner.ts
git commit -m "feat: runner de ejecución con evidencia y auditoría"
```

---

## Task 9: Endpoint de ingesta

**Files:**
- Create: `src/app/api/agent/actions/route.ts`

**Interfaces:**
- Consumes: `authenticateAgent` (Task 3); `validateIngestInput` (Task 4); `effectToStatus` (Task 5); `executeAction` (Task 8); `evaluatePolicy` (`@/lib/policy-eval`); `computeApprovalDueAt` (`@/lib/sla`); repos `getPolicies`, `getTools`, `getAgents`, `getPermissions`; `prisma`.
- Produces: `POST /api/agent/actions` → `201 { actionId, status }`.

- [ ] **Step 1: Implementar**

`src/app/api/agent/actions/route.ts`:

```typescript
/**
 * Ingesta de acciones de agente. Autentica por API key, valida el contrato,
 * evalúa las políticas activas de la org y persiste la acción con el estado
 * resultante. Si la política la permite (`allowed`), se ejecuta de inmediato.
 * Idempotente por `(agentId, externalId)`.
 */
import { NextResponse } from "next/server";
import type { AgentAction } from "@/domain";
import { prisma } from "@/lib/prisma";
import { authenticateAgent } from "@/lib/auth/agent-keys-db";
import { validateIngestInput } from "@/lib/ingest/contract";
import { effectToStatus } from "@/lib/ingest/status";
import { evaluatePolicy } from "@/lib/policy-eval";
import { computeApprovalDueAt } from "@/lib/sla";
import { executeAction } from "@/lib/execution/runner";
import { getPolicies } from "@/data/policies";
import { getTools } from "@/data/tools";
import { getAgents } from "@/data/agents";
import { getPermissions } from "@/data/permissions";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateAgent(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 422 });
  }

  const parsed = validateIngestInput(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }
  const input = parsed.value;

  const [tools, agents, permissions, policies] = await Promise.all([
    getTools(),
    getAgents(),
    getPermissions(),
    getPolicies(),
  ]);

  const tool = tools.find(
    (t) => t.id === input.toolId && t.organizationId === auth.organizationId,
  );
  if (!tool) {
    return NextResponse.json(
      { error: "toolId no pertenece a la organización." },
      { status: 422 },
    );
  }

  // Acción candidata (sin persistir) para evaluar políticas.
  const now = new Date().toISOString();
  const candidate: AgentAction = {
    id: "pending",
    organizationId: auth.organizationId,
    agentId: auth.agentId,
    toolId: input.toolId,
    policyId: null,
    title: input.title,
    summary: input.summary,
    actionType: input.actionType,
    status: "proposed",
    riskLevel: input.riskLevel ?? tool.riskLevel,
    payload: input.payload,
    policyResult: null,
    approvalDueAt: null,
    createdAt: now,
    updatedAt: now,
    executedAt: null,
  };

  const evaluation = evaluatePolicy(candidate, policies, {
    tools,
    agents,
    permissions,
  });
  const status = effectToStatus(evaluation.effect);

  const slaMinutes =
    evaluation.policyId != null
      ? (policies.find((p) => p.id === evaluation.policyId)
          ?.approvalSlaMinutes ?? null)
      : null;
  const approvalDueAt =
    status === "needs_approval" ? computeApprovalDueAt(now, slaMinutes) : null;

  let created;
  try {
    created = await prisma.agentAction.create({
      data: {
        organizationId: auth.organizationId,
        agentId: auth.agentId,
        toolId: input.toolId,
        policyId: evaluation.policyId,
        title: input.title,
        summary: input.summary,
        actionType: input.actionType,
        status,
        riskLevel: candidate.riskLevel,
        payload: input.payload,
        policyResult: { effect: evaluation.effect, reason: evaluation.reason },
        approvalDueAt: approvalDueAt ? new Date(approvalDueAt) : null,
        externalId: input.externalId ?? null,
      },
    });
  } catch {
    // Colisión del unique (agentId, externalId): reintento idempotente.
    return NextResponse.json(
      { error: "Acción duplicada (externalId ya registrado)." },
      { status: 409 },
    );
  }

  await prisma.auditEvent.create({
    data: {
      organizationId: auth.organizationId,
      agentId: auth.agentId,
      actionId: created.id,
      eventType: status === "blocked" ? "action_blocked" : "action_proposed",
      message: `Acción ingerida: ${evaluation.reason}`,
      metadata: { effect: evaluation.effect },
    },
  });

  if (status === "allowed") {
    await executeAction(created.id);
  }

  const fresh = await prisma.agentAction.findUnique({
    where: { id: created.id },
    select: { status: true },
  });
  return NextResponse.json(
    { actionId: created.id, status: fresh?.status ?? status },
    { status: 201 },
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación end-to-end manual (requiere BD + `npm run dev`)**

Generar una API key para un agente del seed (temporalmente vía `createAgentKey` en un script o en el seed). Luego:

```bash
curl -sS -X POST http://localhost:3000/api/agent/actions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"actionType":"send_email","toolId":"<TOOL_ID>","title":"Prueba","summary":"Prueba de ingesta","payload":{"to":"x@example.com"}}'
```

Expected: `201 { "actionId": "...", "status": "allowed|needs_approval|blocked" }`. Sin token → `401`. Body inválido → `422`. Repetir con el mismo `externalId` → `409`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agent/actions/route.ts
git commit -m "feat: endpoint de ingesta de acciones de agente"
```

---

## Task 10: Conectar la aprobación del revisor con la ejecución

**Files:**
- Modify: `src/lib/review-actions.ts`

**Interfaces:**
- Consumes: `executeAction` (Task 8).
- Produces: `decideAction` ejecuta la acción tras aprobarla.

- [ ] **Step 1: Importar el runner**

En `src/lib/review-actions.ts`, junto a los imports existentes:

```typescript
import { executeAction } from "@/lib/execution/runner";
```

- [ ] **Step 2: Ejecutar al aprobar dentro de `decideAction`**

En `decideAction`, tras el `await prisma.$transaction([...])` y antes de `revalidateReview()`, añadir:

```typescript
  if (decision === "approved") {
    await executeAction(actionId);
  }
```

(Se deja `decideManyActions` sin ejecución automática: el lote es una decisión de cola; la ejecución masiva queda fuera de alcance de esta fase.)

- [ ] **Step 3: Verificar que la suite sigue verde**

Run: `npm test`
Expected: PASS (incluye `review-actions.test.ts` existente).

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/review-actions.ts
git commit -m "feat: ejecutar la acción automáticamente al aprobarla"
```

---

## Task 11: Auto-escalado por SLA (función pura)

**Files:**
- Modify: `src/lib/sla.ts`
- Test: `src/lib/sla.test.ts`

**Interfaces:**
- Consumes: `AgentAction` de `@/domain`.
- Produces: `findOverdue(actions: AgentAction[], now: Date): string[]` — ids de
  acciones `needs_approval` con `approvalDueAt` no nulo y anterior a `now`.

- [ ] **Step 1: Escribir el test que falla (añadir al fichero existente)**

Añadir a `src/lib/sla.test.ts` (importar `findOverdue` y `AgentAction` en la cabecera del fichero):

```typescript
import { findOverdue } from "@/lib/sla";
import type { AgentAction } from "@/domain";

function pending(overrides: Partial<AgentAction>): AgentAction {
  return {
    id: "a",
    organizationId: "org",
    agentId: "agt",
    toolId: "tool",
    policyId: null,
    title: "t",
    summary: "s",
    actionType: "send_email",
    status: "needs_approval",
    riskLevel: "low",
    payload: {},
    policyResult: null,
    approvalDueAt: null,
    createdAt: "2026-07-17T09:00:00.000Z",
    updatedAt: "2026-07-17T09:00:00.000Z",
    executedAt: null,
    ...overrides,
  };
}

describe("findOverdue", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");

  it("devuelve las needs_approval vencidas", () => {
    const overdue = pending({
      id: "vencida",
      approvalDueAt: "2026-07-17T11:00:00.000Z",
    });
    expect(findOverdue([overdue], now)).toEqual(["vencida"]);
  });

  it("ignora las no vencidas y las sin approvalDueAt", () => {
    const future = pending({
      id: "futura",
      approvalDueAt: "2026-07-17T13:00:00.000Z",
    });
    const noSla = pending({ id: "sin-sla", approvalDueAt: null });
    expect(findOverdue([future, noSla], now)).toEqual([]);
  });

  it("ignora las que no están en needs_approval aunque estén vencidas", () => {
    const approved = pending({
      id: "aprobada",
      status: "approved",
      approvalDueAt: "2026-07-17T11:00:00.000Z",
    });
    expect(findOverdue([approved], now)).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/sla.test.ts`
Expected: FAIL — `findOverdue` no existe.

- [ ] **Step 3: Implementar (añadir a `src/lib/sla.ts`)**

Al inicio de `src/lib/sla.ts`, añadir el import de tipo:

```typescript
import type { AgentAction } from "@/domain";
```

Al final del fichero:

```typescript
/**
 * Ids de acciones vencidas: en `needs_approval`, con `approvalDueAt` poblado y
 * anterior a `now`. Pura; el barrido que las escala vive en
 * `/api/cron/escalate`.
 */
export function findOverdue(actions: AgentAction[], now: Date): string[] {
  return actions
    .filter(
      (a) =>
        a.status === "needs_approval" &&
        a.approvalDueAt !== null &&
        new Date(a.approvalDueAt).getTime() < now.getTime(),
    )
    .map((a) => a.id);
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/sla.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sla.ts src/lib/sla.test.ts
git commit -m "feat: findOverdue para el auto-escalado por SLA"
```

---

## Task 12: Endpoint de barrido de escalado

**Files:**
- Create: `src/app/api/cron/escalate/route.ts`

**Interfaces:**
- Consumes: `findOverdue` (Task 11); `getActions` (`@/data/actions`); `prisma`; `process.env.CRON_SECRET`.
- Produces: `POST /api/cron/escalate` → `200 { escalated: number }`.

- [ ] **Step 1: Implementar**

`src/app/api/cron/escalate/route.ts`:

```typescript
/**
 * Barrido de auto-escalado por SLA. Un scheduler externo (Vercel Cron, GitHub
 * Actions o curl) lo invoca periódicamente con `Authorization: Bearer
 * $CRON_SECRET`. Escala las acciones `needs_approval` vencidas a `escalated` y
 * registra un `AuditEvent`. Idempotente: solo mira `needs_approval`.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getActions } from "@/data/actions";
import { findOverdue } from "@/lib/sla";

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

  const actions = await getActions();
  const overdue = findOverdue(actions, new Date());
  if (overdue.length === 0) {
    return NextResponse.json({ escalated: 0 });
  }

  const byId = new Map(actions.map((a) => [a.id, a]));
  await prisma.$transaction([
    prisma.agentAction.updateMany({
      where: { id: { in: overdue }, status: "needs_approval" },
      data: { status: "escalated" },
    }),
    ...overdue.map((id) => {
      const a = byId.get(id)!;
      return prisma.auditEvent.create({
        data: {
          organizationId: a.organizationId,
          agentId: a.agentId,
          actionId: id,
          eventType: "action_escalated",
          message: "Acción escalada automáticamente por vencimiento de SLA.",
          metadata: { reason: "sla_overdue" },
        },
      });
    }),
  ]);

  return NextResponse.json({ escalated: overdue.length });
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual (requiere BD + `npm run dev` + `CRON_SECRET` en `.env`)**

```bash
curl -sS -X POST http://localhost:3000/api/cron/escalate \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `200 { "escalated": N }`. Sin secreto o incorrecto → `401`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/escalate/route.ts
git commit -m "feat: endpoint de barrido de auto-escalado por SLA"
```

---

## Task 13: Documentación, entorno y kanban

**Files:**
- Modify: `.env.example`, `docs/DATA_MODEL.md`, `kanban.html`

**Interfaces:**
- Produces: variables de entorno documentadas; entidades nuevas en el modelo de datos; fase 12 marcada en kanban.

- [ ] **Step 1: Documentar variables de entorno**

Añadir a `.env.example` (con comentario en castellano):

```bash
# Secreto del barrido de auto-escalado (POST /api/cron/escalate)
CRON_SECRET=
# Envío de email real (Resend). Sin estas dos, se usa el transporte de logging.
RESEND_API_KEY=
EMAIL_FROM=
```

- [ ] **Step 2: Documentar las entidades nuevas en `docs/DATA_MODEL.md`**

Añadir `AgentApiKey`, `IntegrationLog` y el campo `AgentAction.externalId` (con su unique `(agentId, externalId)`), siguiendo el formato de las entidades existentes del documento.

- [ ] **Step 3: Marcar la fase 12 en `kanban.html`**

En el bloque `"12 · Integraciones reales"`, marcar como completadas las tareas implementadas (contrato, endpoint de ingesta, integración de email real, ejecución, auto-escalado SLA), siguiendo el mismo mecanismo que las fases anteriores.

- [ ] **Step 4: Verificación final de toda la suite y formato**

Run: `npm test && npm run lint && npm run format:check`
Expected: todo verde. Si `format:check` falla, ejecutar `npm run format` y commitear el reajuste.

- [ ] **Step 5: Commit**

```bash
git add .env.example docs/DATA_MODEL.md kanban.html
git commit -m "docs: entorno, modelo de datos y kanban de la fase 12"
```

---

## Notas de cierre

- **Revisión de arquitecto (antes del merge):** superficie sensible — endpoint público de ingesta, credenciales M2M, secreto de cron. Verificar: keys solo hasheadas, comparación del cron en tiempo constante (ya con `timingSafeEqual`), `CRON_SECRET`/credenciales fuera de logs, y decidir si el rate-limit de ingesta entra ahora o se difiere explícitamente a fase 13.
- **Rate-limit:** no incluido en esta fase; difiérase a fase 13 (paso 110, manejo de errores y reintentos) salvo indicación contraria.
- **Alta de API keys en la UI:** `createAgentKey` queda disponible para que `/agents/[agentId]` la exponga; el flujo de UI para generar/rotar/revocar keys es trabajo de pulido posterior, no de esta fase (el pipeline funciona generando la key por seed/script).
```
