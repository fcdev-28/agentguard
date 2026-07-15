# Cableado UI→Prisma · Slice 1 (infraestructura + lectura) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir `demo-data.ts` por Prisma como fuente de lectura en `/agents`, `/audit`, `/settings` y el dashboard, a través de una capa de repositorios en `src/data/` que traduce filas de Prisma a tipos de `src/domain`.

**Architecture:** Cada entidad tiene un módulo `src/data/<entidad>.ts` con un mapper puro (`mapX: PrismaX -> X`) y funciones `getX()`/`getXById()` que llaman a `prisma` y aplican el mapper. Las páginas server (`src/app/**/page.tsx`) hacen `await getX()` y pasan los datos por props a los componentes existentes (server o cliente), que no cambian su forma de tipar (siguen esperando `Agent[]`, `AuditEvent[]`, etc. de `@/domain`). `src/lib/session.ts` gana `getCurrentUser()`/`getCurrentOrganization()` asíncronos sobre BD, sin tocar los `currentUser`/`currentOrganization` síncronos que aún consumen componentes cliente no migrados en este slice.

**Tech Stack:** Next.js App Router (Server Components), Prisma 7 (`prisma-client` generator, cliente en `src/lib/prisma.ts`), TypeScript estricto, Vitest.

## Global Constraints
- Comentarios de código y mensajes de commit en español.
- Tipos de dominio en inglés.
- Rutas en inglés.
- El dominio de `src/domain` es el contrato: los componentes nunca reciben tipos de Prisma, solo tipos de `@/domain`.
- Cada feature con estado vacío, de carga y de error (los componentes de UI ya los tienen; este slice no los toca, solo cambia el origen de los datos).
- No tocar `src/lib/format.ts`.
- El cliente Prisma (`src/lib/prisma.ts`) solo se importa desde `src/data/*.ts` (repositorios) y desde páginas/módulos server; nunca desde un componente marcado `"use client"`.
---

## File Structure

Ficheros nuevos (repositorios + mappers, uno por entidad; cada uno exporta el mapper puro y las funciones `getX()`/`getXById()` que sí tocan BD):

- `src/data/organizations.ts` / `src/data/organizations.test.ts` — `mapOrganization`, `getOrganization()`.
- `src/data/users.ts` / `src/data/users.test.ts` — `mapUser`, `getUsers()`.
- `src/data/agents.ts` / `src/data/agents.test.ts` — `mapAgent`, `getAgents()`, `getAgentById(id)`.
- `src/data/tools.ts` / `src/data/tools.test.ts` — `mapTool`, `getTools()`.
- `src/data/permissions.ts` / `src/data/permissions.test.ts` — `mapPermission`, `getPermissions()`.
- `src/data/policies.ts` / `src/data/policies.test.ts` — `mapPolicy`, `getPolicies()`.
- `src/data/actions.ts` / `src/data/actions.test.ts` — `mapAgentAction`, `getActions()`.
- `src/data/audit.ts` / `src/data/audit.test.ts` — `mapAuditEvent`, `getAuditEvents()`, `getAuditEventById(id)`.

**Nota sobre nombres duplicados (a propósito):** ya existen `src/lib/agents.ts`, `src/lib/audit.ts`, `src/lib/users.ts`, `src/lib/tools.ts`, `src/lib/policies.ts` con funciones puras `getX(xs)`/`getXById(xs, id)` que ordenan/filtran arrays ya cargados (se usan dentro de componentes cliente como `AgentsList`, `AuditTimeline`, `UsersSection`, `ToolsSection`). Los nuevos módulos en `src/data/` tienen el mismo nombre de función pero **sin argumentos** (`getX()`) porque consultan la BD. En este slice ningún fichero importa las dos versiones a la vez (las páginas server solo llaman a `@/data/*`; los componentes cliente solo llaman a `@/lib/*` sobre los props ya recibidos), así que no hace falta alias. Si un slice futuro necesita ambas en el mismo fichero, hay que importar la de `@/data` con alias (`import { getAgents as getAgentsDb } from "@/data/agents"`).

Ficheros modificados (repositorio de sesión + páginas + bloques de dashboard):

- `src/lib/session.ts` — añade `getCurrentUser()`/`getCurrentOrganization()` async sobre BD; conserva `currentUser`/`currentOrganization` síncronos sobre `demo-data` (documentado como deuda temporal, ver Task 9).
- `src/lib/session.test.ts` (nuevo).
- `src/app/agents/page.tsx` — lee de `@/data/agents`, `@/data/actions`, `@/data/users`.
- `src/app/agents/[agentId]/page.tsx` — lee de `@/data/agents` (`getAgentById`), `@/data/actions`, `@/data/permissions`, `@/data/tools`, `@/data/users`.
- `src/app/audit/page.tsx` — lee de `@/data/audit`, `@/data/agents`, `@/data/users`.
- `src/app/audit/[eventId]/page.tsx` — lee de `@/data/audit` (`getAuditEventById`), `@/data/agents`, `@/data/users`.
- `src/app/settings/page.tsx` — lee de `@/data/users`, `@/data/tools`.
- `src/app/page.tsx` (dashboard) — lee de `@/data/agents`, `@/data/actions`, `@/data/policies`; pasa los datos por props a los bloques.
- `src/components/dashboard/active-agents-block.tsx` — recibe `agents: Agent[]` por props en vez de importar `demo-data`.
- `src/components/dashboard/pending-actions-block.tsx` — recibe `actions: AgentAction[]`, `agents: Agent[]` por props.
- `src/components/dashboard/risk-block.tsx` — recibe `actions: AgentAction[]` por props.
- `src/components/dashboard/recent-policies-block.tsx` — recibe `policies: Policy[]` por props.

No se toca `src/data/demo-data.ts` (sigue siendo la fuente del seed y de `src/domain/action.test.ts`), ni `src/components/dashboard/emergency-stop-block.tsx` (depende de `runtime-store`, fuera de alcance hasta el slice de runtime).

---

### Task 1: Repositorio de organizaciones

**Files:**
- Create: `src/data/organizations.ts`
- Test: `src/data/organizations.test.ts`

**Interfaces:**
- Consumes: `prisma.organization.findFirstOrThrow()` (tipo de retorno `Prisma.OrganizationModel`, ver `src/generated/prisma/client.ts`).
- Produces: `mapOrganization(row: PrismaOrganization): Organization`, `getOrganization(): Promise<Organization>`.

- [ ] **Step 1: Test en rojo para `mapOrganization`**
  Crear `src/data/organizations.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { mapOrganization } from "./organizations";

  describe("mapOrganization", () => {
    it("traduce una fila de Prisma a la Organization de dominio", () => {
      const row = {
        id: "org_acme",
        name: "Acme Operations",
        slug: "acme",
        emergencyStop: false,
        emergencyStopById: null,
        emergencyStopAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-12T08:30:00.000Z"),
      };

      expect(mapOrganization(row)).toEqual({
        id: "org_acme",
        name: "Acme Operations",
        slug: "acme",
        emergencyStop: false,
        emergencyStopById: null,
        emergencyStopAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-07-12T08:30:00.000Z",
      });
    });

    it("convierte emergencyStopAt a ISO string cuando la parada está activa", () => {
      const row = {
        id: "org_acme",
        name: "Acme Operations",
        slug: "acme",
        emergencyStop: true,
        emergencyStopById: "usr_admin",
        emergencyStopAt: new Date("2026-07-12T08:45:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-12T08:45:00.000Z"),
      };

      const result = mapOrganization(row);
      expect(result.emergencyStop).toBe(true);
      expect(result.emergencyStopById).toBe("usr_admin");
      expect(result.emergencyStopAt).toBe("2026-07-12T08:45:00.000Z");
    });
  });
  ```
  Ejecutar `npx vitest run src/data/organizations.test.ts` y comprobar que falla:
  ```
  Error: Failed to resolve import "./organizations" from "src/data/organizations.test.ts". Does the file exist?
  ```

- [ ] **Step 2: Implementación mínima y verde**
  Crear `src/data/organizations.ts`:
  ```ts
  /**
   * Repositorio de organizaciones: traduce filas de Prisma a la `Organization`
   * de dominio. Sustituye a `organization` de `src/data/demo-data.ts` como
   * fuente de lectura para las páginas server (MVP de un solo tenant).
   */
  import { prisma } from "@/lib/prisma";
  import type { Organization as PrismaOrganization } from "@/generated/prisma/client";
  import type { Organization } from "@/domain";

  /** Traduce una fila `Organization` de Prisma a la `Organization` de dominio. */
  export function mapOrganization(row: PrismaOrganization): Organization {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      emergencyStop: row.emergencyStop,
      emergencyStopById: row.emergencyStopById,
      emergencyStopAt: row.emergencyStopAt
        ? row.emergencyStopAt.toISOString()
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Organización activa. MVP de un solo tenant: siempre la primera (y única)
   * fila sembrada por `prisma/seed.ts`.
   */
  export async function getOrganization(): Promise<Organization> {
    const row = await prisma.organization.findFirstOrThrow();
    return mapOrganization(row);
  }
  ```
  Ejecutar `npx vitest run src/data/organizations.test.ts`:
  ```
  ✓ src/data/organizations.test.ts (2 tests)
  ```
  `getOrganization()` no se testea unitariamente (requiere BD real); se verifica de forma integrada en la Task 9 (sesión) y en las tareas de wiring.

  Commit:
  ```
  git add src/data/organizations.ts src/data/organizations.test.ts
  git commit -m "feat: repositorio de organizaciones con mapper Prisma→dominio"
  ```

---

### Task 2: Repositorio de usuarios

**Files:**
- Create: `src/data/users.ts`
- Test: `src/data/users.test.ts`

**Interfaces:**
- Consumes: `prisma.user.findMany()` (`Prisma.UserModel[]`).
- Produces: `mapUser(row: PrismaUser): User`, `getUsers(): Promise<User[]>`.

- [ ] **Step 1: Test en rojo para `mapUser`**
  Crear `src/data/users.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { mapUser } from "./users";

  describe("mapUser", () => {
    it("traduce una fila de Prisma a la User de dominio", () => {
      const row = {
        id: "usr_admin",
        organizationId: "org_acme",
        name: "Lucía Marín",
        email: "lucia.marin@acme.example",
        role: "admin" as const,
        status: "active" as const,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-01T00:00:00.000Z"),
      };

      expect(mapUser(row)).toEqual({
        id: "usr_admin",
        organizationId: "org_acme",
        name: "Lucía Marín",
        email: "lucia.marin@acme.example",
        role: "admin",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      });
    });

    it("preserva role y status sin traducir (los enums de Prisma coinciden con el dominio)", () => {
      const row = {
        id: "usr_dev",
        organizationId: "org_acme",
        name: "Pablo Nieto",
        email: "pablo.nieto@acme.example",
        role: "developer" as const,
        status: "invited" as const,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      };

      const result = mapUser(row);
      expect(result.role).toBe("developer");
      expect(result.status).toBe("invited");
    });
  });
  ```
  Ejecutar `npx vitest run src/data/users.test.ts` y comprobar que falla:
  ```
  Error: Failed to resolve import "./users" from "src/data/users.test.ts". Does the file exist?
  ```

- [ ] **Step 2: Implementación mínima y verde**
  Crear `src/data/users.ts`:
  ```ts
  /**
   * Repositorio de usuarios: traduce filas de Prisma a la `User` de dominio.
   */
  import { prisma } from "@/lib/prisma";
  import type { User as PrismaUser } from "@/generated/prisma/client";
  import type { User } from "@/domain";

  /** Traduce una fila `User` de Prisma a la `User` de dominio. */
  export function mapUser(row: PrismaUser): User {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Todos los usuarios de la organización, orden estable por alta. */
  export async function getUsers(): Promise<User[]> {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(mapUser);
  }
  ```
  Ejecutar `npx vitest run src/data/users.test.ts`:
  ```
  ✓ src/data/users.test.ts (2 tests)
  ```
  Commit:
  ```
  git add src/data/users.ts src/data/users.test.ts
  git commit -m "feat: repositorio de usuarios con mapper Prisma→dominio"
  ```

---

### Task 3: Repositorio de agentes

**Files:**
- Create: `src/data/agents.ts`
- Test: `src/data/agents.test.ts`

**Interfaces:**
- Consumes: `prisma.agent.findMany()`, `prisma.agent.findUnique({ where: { id } })` (`Prisma.AgentModel`).
- Produces: `mapAgent(row: PrismaAgent): Agent`, `getAgents(): Promise<Agent[]>`, `getAgentById(id: string): Promise<Agent | undefined>`.

- [ ] **Step 1: Test en rojo para `mapAgent`**
  Crear `src/data/agents.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { mapAgent } from "./agents";

  describe("mapAgent", () => {
    it("traduce una fila de Prisma a la Agent de dominio", () => {
      const row = {
        id: "agt_billing",
        organizationId: "org_acme",
        ownerId: "usr_admin",
        name: "Agente de facturación",
        description: "Emite reembolsos y actualiza registros de facturación.",
        environment: "production" as const,
        status: "active" as const,
        mode: "enforce" as const,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-10T00:00:00.000Z"),
      };

      expect(mapAgent(row)).toEqual({
        id: "agt_billing",
        organizationId: "org_acme",
        ownerId: "usr_admin",
        name: "Agente de facturación",
        description: "Emite reembolsos y actualiza registros de facturación.",
        environment: "production",
        status: "active",
        mode: "enforce",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-07-10T00:00:00.000Z",
      });
    });
  });
  ```
  Ejecutar `npx vitest run src/data/agents.test.ts` y comprobar que falla:
  ```
  Error: Failed to resolve import "./agents" from "src/data/agents.test.ts". Does the file exist?
  ```

- [ ] **Step 2: Implementación mínima y verde**
  Crear `src/data/agents.ts`:
  ```ts
  /**
   * Repositorio de agentes: traduce filas de Prisma a la `Agent` de dominio.
   * No confundir con `src/lib/agents.ts` (funciones puras de orden/filtro
   * sobre un array de `Agent[]` ya cargado; se usan dentro de componentes).
   */
  import { prisma } from "@/lib/prisma";
  import type { Agent as PrismaAgent } from "@/generated/prisma/client";
  import type { Agent } from "@/domain";

  /** Traduce una fila `Agent` de Prisma a la `Agent` de dominio. */
  export function mapAgent(row: PrismaAgent): Agent {
    return {
      id: row.id,
      organizationId: row.organizationId,
      ownerId: row.ownerId,
      name: row.name,
      description: row.description,
      environment: row.environment,
      status: row.status,
      mode: row.mode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Todos los agentes de la organización. */
  export async function getAgents(): Promise<Agent[]> {
    const rows = await prisma.agent.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(mapAgent);
  }

  /** Busca un agente por id directamente en BD; `undefined` si no existe. */
  export async function getAgentById(id: string): Promise<Agent | undefined> {
    const row = await prisma.agent.findUnique({ where: { id } });
    return row ? mapAgent(row) : undefined;
  }
  ```
  Ejecutar `npx vitest run src/data/agents.test.ts`:
  ```
  ✓ src/data/agents.test.ts (1 test)
  ```
  Commit:
  ```
  git add src/data/agents.ts src/data/agents.test.ts
  git commit -m "feat: repositorio de agentes con mapper Prisma→dominio"
  ```

---

### Task 4: Repositorio de herramientas

**Files:**
- Create: `src/data/tools.ts`
- Test: `src/data/tools.test.ts`

**Interfaces:**
- Consumes: `prisma.tool.findMany()` (`Prisma.ToolModel[]`).
- Produces: `mapTool(row: PrismaTool): Tool`, `getTools(): Promise<Tool[]>`.

- [ ] **Step 1: Test en rojo para `mapTool`**
  Crear `src/data/tools.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { mapTool } from "./tools";

  describe("mapTool", () => {
    it("traduce una fila de Prisma a la Tool de dominio", () => {
      const row = {
        id: "tool_email",
        organizationId: "org_acme",
        name: "Correo corporativo",
        type: "email" as const,
        status: "active" as const,
        riskLevel: "medium" as const,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      };

      expect(mapTool(row)).toEqual({
        id: "tool_email",
        organizationId: "org_acme",
        name: "Correo corporativo",
        type: "email",
        status: "active",
        riskLevel: "medium",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      });
    });
  });
  ```
  Ejecutar `npx vitest run src/data/tools.test.ts` y comprobar que falla:
  ```
  Error: Failed to resolve import "./tools" from "src/data/tools.test.ts". Does the file exist?
  ```

- [ ] **Step 2: Implementación mínima y verde**
  Crear `src/data/tools.ts`:
  ```ts
  /**
   * Repositorio de herramientas: traduce filas de Prisma a la `Tool` de dominio.
   * No confundir con `src/lib/tools.ts` (orden/filtro puro sobre `Tool[]`).
   */
  import { prisma } from "@/lib/prisma";
  import type { Tool as PrismaTool } from "@/generated/prisma/client";
  import type { Tool } from "@/domain";

  /** Traduce una fila `Tool` de Prisma a la `Tool` de dominio. */
  export function mapTool(row: PrismaTool): Tool {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      type: row.type,
      status: row.status,
      riskLevel: row.riskLevel,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Todas las herramientas de la organización. */
  export async function getTools(): Promise<Tool[]> {
    const rows = await prisma.tool.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(mapTool);
  }
  ```
  Ejecutar `npx vitest run src/data/tools.test.ts`:
  ```
  ✓ src/data/tools.test.ts (1 test)
  ```
  Commit:
  ```
  git add src/data/tools.ts src/data/tools.test.ts
  git commit -m "feat: repositorio de herramientas con mapper Prisma→dominio"
  ```

---

### Task 5: Repositorio de permisos

**Files:**
- Create: `src/data/permissions.ts`
- Test: `src/data/permissions.test.ts`

**Interfaces:**
- Consumes: `prisma.permission.findMany()` (`Prisma.PermissionModel[]`).
- Produces: `mapPermission(row: PrismaPermission): Permission`, `getPermissions(): Promise<Permission[]>`.

- [ ] **Step 1: Test en rojo para `mapPermission`**
  Crear `src/data/permissions.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { mapPermission } from "./permissions";

  describe("mapPermission", () => {
    it("traduce una fila de Prisma a la Permission de dominio", () => {
      const row = {
        id: "perm_1",
        agentId: "agt_billing",
        toolId: "tool_email",
        scope: "write" as const,
        status: "allowed" as const,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      };

      expect(mapPermission(row)).toEqual({
        id: "perm_1",
        agentId: "agt_billing",
        toolId: "tool_email",
        scope: "write",
        status: "allowed",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-05T00:00:00.000Z",
      });
    });
  });
  ```
  Ejecutar `npx vitest run src/data/permissions.test.ts` y comprobar que falla:
  ```
  Error: Failed to resolve import "./permissions" from "src/data/permissions.test.ts". Does the file exist?
  ```

- [ ] **Step 2: Implementación mínima y verde**
  Crear `src/data/permissions.ts`:
  ```ts
  /**
   * Repositorio de permisos: traduce filas de Prisma a la `Permission` de dominio.
   */
  import { prisma } from "@/lib/prisma";
  import type { Permission as PrismaPermission } from "@/generated/prisma/client";
  import type { Permission } from "@/domain";

  /** Traduce una fila `Permission` de Prisma a la `Permission` de dominio. */
  export function mapPermission(row: PrismaPermission): Permission {
    return {
      id: row.id,
      agentId: row.agentId,
      toolId: row.toolId,
      scope: row.scope,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Todos los permisos (agente↔herramienta) de la organización. */
  export async function getPermissions(): Promise<Permission[]> {
    const rows = await prisma.permission.findMany({
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapPermission);
  }
  ```
  Ejecutar `npx vitest run src/data/permissions.test.ts`:
  ```
  ✓ src/data/permissions.test.ts (1 test)
  ```
  Commit:
  ```
  git add src/data/permissions.ts src/data/permissions.test.ts
  git commit -m "feat: repositorio de permisos con mapper Prisma→dominio"
  ```

---

### Task 6: Repositorio de políticas

**Files:**
- Create: `src/data/policies.ts`
- Test: `src/data/policies.test.ts`

**Interfaces:**
- Consumes: `prisma.policy.findMany()` (`Prisma.PolicyModel[]`, campo `conditions: Json`).
- Produces: `mapPolicy(row: PrismaPolicy): Policy`, `getPolicies(): Promise<Policy[]>`.

- [ ] **Step 1: Test en rojo para `mapPolicy`**
  Crear `src/data/policies.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { mapPolicy } from "./policies";

  describe("mapPolicy", () => {
    it("traduce una fila de Prisma a la Policy de dominio, incluido el JSON de condiciones", () => {
      const row = {
        id: "pol_refund_limit",
        organizationId: "org_acme",
        name: "Límite de reembolso",
        description: "Requiere aprobación para reembolsos superiores a 500€.",
        status: "active" as const,
        version: 2,
        conditions: { field: "amount", operator: "gt", value: 500 },
        effect: "require_approval" as const,
        approvalSlaMinutes: 120,
        createdById: "usr_admin",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-15T00:00:00.000Z"),
        publishedAt: new Date("2026-06-15T00:00:00.000Z"),
      };

      expect(mapPolicy(row)).toEqual({
        id: "pol_refund_limit",
        organizationId: "org_acme",
        name: "Límite de reembolso",
        description: "Requiere aprobación para reembolsos superiores a 500€.",
        status: "active",
        version: 2,
        conditions: { field: "amount", operator: "gt", value: 500 },
        effect: "require_approval",
        approvalSlaMinutes: 120,
        createdById: "usr_admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-06-15T00:00:00.000Z",
        publishedAt: "2026-06-15T00:00:00.000Z",
      });
    });

    it("deja publishedAt y approvalSlaMinutes en null cuando la política no está publicada", () => {
      const row = {
        id: "pol_draft",
        organizationId: "org_acme",
        name: "Borrador",
        description: "Política en borrador.",
        status: "draft" as const,
        version: 1,
        conditions: {},
        effect: "block" as const,
        approvalSlaMinutes: null,
        createdById: "usr_admin",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        publishedAt: null,
      };

      const result = mapPolicy(row);
      expect(result.publishedAt).toBeNull();
      expect(result.approvalSlaMinutes).toBeNull();
    });
  });
  ```
  Ejecutar `npx vitest run src/data/policies.test.ts` y comprobar que falla:
  ```
  Error: Failed to resolve import "./policies" from "src/data/policies.test.ts". Does the file exist?
  ```

- [ ] **Step 2: Implementación mínima y verde**
  Crear `src/data/policies.ts`:
  ```ts
  /**
   * Repositorio de políticas: traduce filas de Prisma a la `Policy` de dominio.
   * No confundir con `src/lib/policies.ts` (orden/filtro puro sobre `Policy[]`).
   */
  import { prisma } from "@/lib/prisma";
  import type { Policy as PrismaPolicy } from "@/generated/prisma/client";
  import type { Policy } from "@/domain";

  /** Traduce una fila `Policy` de Prisma a la `Policy` de dominio. */
  export function mapPolicy(row: PrismaPolicy): Policy {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      description: row.description,
      status: row.status,
      version: row.version,
      conditions: row.conditions as Record<string, unknown>,
      effect: row.effect,
      approvalSlaMinutes: row.approvalSlaMinutes,
      createdById: row.createdById,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    };
  }

  /** Todas las políticas de la organización. */
  export async function getPolicies(): Promise<Policy[]> {
    const rows = await prisma.policy.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(mapPolicy);
  }
  ```
  Ejecutar `npx vitest run src/data/policies.test.ts`:
  ```
  ✓ src/data/policies.test.ts (2 tests)
  ```
  Commit:
  ```
  git add src/data/policies.ts src/data/policies.test.ts
  git commit -m "feat: repositorio de políticas con mapper Prisma→dominio"
  ```

---

### Task 7: Repositorio de acciones de agente

**Files:**
- Create: `src/data/actions.ts`
- Test: `src/data/actions.test.ts`

**Interfaces:**
- Consumes: `prisma.agentAction.findMany()` (`Prisma.AgentActionModel[]`, campos `payload: Json`, `policyResult: Json?`).
- Produces: `mapAgentAction(row: PrismaAgentAction): AgentAction`, `getActions(): Promise<AgentAction[]>`.

- [ ] **Step 1: Test en rojo para `mapAgentAction`**
  Crear `src/data/actions.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { mapAgentAction } from "./actions";

  describe("mapAgentAction", () => {
    it("traduce una fila de Prisma a la AgentAction de dominio, con payload y policyResult", () => {
      const row = {
        id: "act_1",
        organizationId: "org_acme",
        agentId: "agt_billing",
        toolId: "tool_billing",
        policyId: "pol_refund_limit",
        title: "Emitir reembolso de 620€",
        summary: "Reembolso solicitado por el cliente tras una incidencia.",
        actionType: "issue_refund" as const,
        status: "needs_approval" as const,
        riskLevel: "high" as const,
        payload: { amount: 620, currency: "EUR" },
        policyResult: {
          policyId: "pol_refund_limit",
          effect: "require_approval",
          reason: "Supera el límite de 500€.",
        },
        approvalDueAt: new Date("2026-07-12T10:00:00.000Z"),
        createdAt: new Date("2026-07-12T08:00:00.000Z"),
        updatedAt: new Date("2026-07-12T08:00:00.000Z"),
        executedAt: null,
      };

      expect(mapAgentAction(row)).toEqual({
        id: "act_1",
        organizationId: "org_acme",
        agentId: "agt_billing",
        toolId: "tool_billing",
        policyId: "pol_refund_limit",
        title: "Emitir reembolso de 620€",
        summary: "Reembolso solicitado por el cliente tras una incidencia.",
        actionType: "issue_refund",
        status: "needs_approval",
        riskLevel: "high",
        payload: { amount: 620, currency: "EUR" },
        policyResult: {
          policyId: "pol_refund_limit",
          effect: "require_approval",
          reason: "Supera el límite de 500€.",
        },
        approvalDueAt: "2026-07-12T10:00:00.000Z",
        createdAt: "2026-07-12T08:00:00.000Z",
        updatedAt: "2026-07-12T08:00:00.000Z",
        executedAt: null,
      });
    });

    it("deja policyId, policyResult, approvalDueAt y executedAt en null cuando la acción no los tiene", () => {
      const row = {
        id: "act_2",
        organizationId: "org_acme",
        agentId: "agt_billing",
        toolId: "tool_billing",
        policyId: null,
        title: "Crear tarea de seguimiento",
        summary: "Tarea creada automáticamente.",
        actionType: "create_task" as const,
        status: "allowed" as const,
        riskLevel: "low" as const,
        payload: {},
        policyResult: null,
        approvalDueAt: null,
        createdAt: new Date("2026-07-12T08:00:00.000Z"),
        updatedAt: new Date("2026-07-12T08:00:00.000Z"),
        executedAt: null,
      };

      const result = mapAgentAction(row);
      expect(result.policyId).toBeNull();
      expect(result.policyResult).toBeNull();
      expect(result.approvalDueAt).toBeNull();
      expect(result.executedAt).toBeNull();
    });
  });
  ```
  Ejecutar `npx vitest run src/data/actions.test.ts` y comprobar que falla:
  ```
  Error: Failed to resolve import "./actions" from "src/data/actions.test.ts". Does the file exist?
  ```

- [ ] **Step 2: Implementación mínima y verde**
  Crear `src/data/actions.ts`:
  ```ts
  /**
   * Repositorio de acciones de agente: traduce filas de Prisma a la
   * `AgentAction` de dominio.
   */
  import { prisma } from "@/lib/prisma";
  import type { AgentAction as PrismaAgentAction } from "@/generated/prisma/client";
  import type { AgentAction, PolicyResult } from "@/domain";

  /** Traduce una fila `AgentAction` de Prisma a la `AgentAction` de dominio. */
  export function mapAgentAction(row: PrismaAgentAction): AgentAction {
    return {
      id: row.id,
      organizationId: row.organizationId,
      agentId: row.agentId,
      toolId: row.toolId,
      policyId: row.policyId,
      title: row.title,
      summary: row.summary,
      actionType: row.actionType,
      status: row.status,
      riskLevel: row.riskLevel,
      payload: row.payload as Record<string, unknown>,
      policyResult: row.policyResult as PolicyResult | null,
      approvalDueAt: row.approvalDueAt ? row.approvalDueAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      executedAt: row.executedAt ? row.executedAt.toISOString() : null,
    };
  }

  /** Todas las acciones de agente de la organización. */
  export async function getActions(): Promise<AgentAction[]> {
    const rows = await prisma.agentAction.findMany({
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapAgentAction);
  }
  ```
  Ejecutar `npx vitest run src/data/actions.test.ts`:
  ```
  ✓ src/data/actions.test.ts (2 tests)
  ```
  Commit:
  ```
  git add src/data/actions.ts src/data/actions.test.ts
  git commit -m "feat: repositorio de acciones de agente con mapper Prisma→dominio"
  ```

---

### Task 8: Repositorio de auditoría

**Files:**
- Create: `src/data/audit.ts`
- Test: `src/data/audit.test.ts`

**Interfaces:**
- Consumes: `prisma.auditEvent.findMany()`, `prisma.auditEvent.findUnique({ where: { id } })` (`Prisma.AuditEventModel`, campo `metadata: Json`).
- Produces: `mapAuditEvent(row: PrismaAuditEvent): AuditEvent`, `getAuditEvents(): Promise<AuditEvent[]>`, `getAuditEventById(id: string): Promise<AuditEvent | undefined>`.

- [ ] **Step 1: Test en rojo para `mapAuditEvent`**
  Crear `src/data/audit.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { mapAuditEvent } from "./audit";

  describe("mapAuditEvent", () => {
    it("traduce una fila de Prisma a la AuditEvent de dominio, con metadata", () => {
      const row = {
        id: "evt_1",
        organizationId: "org_acme",
        actorUserId: "usr_admin",
        agentId: "agt_billing",
        actionId: "act_1",
        eventType: "action_escalated" as const,
        message: "La acción se escaló a un administrador.",
        metadata: { escalatedTo: "usr_admin2" },
        createdAt: new Date("2026-07-12T08:10:00.000Z"),
      };

      expect(mapAuditEvent(row)).toEqual({
        id: "evt_1",
        organizationId: "org_acme",
        actorUserId: "usr_admin",
        agentId: "agt_billing",
        actionId: "act_1",
        eventType: "action_escalated",
        message: "La acción se escaló a un administrador.",
        metadata: { escalatedTo: "usr_admin2" },
        createdAt: "2026-07-12T08:10:00.000Z",
      });
    });

    it("deja actorUserId, agentId y actionId en null cuando el evento no los tiene", () => {
      const row = {
        id: "evt_2",
        organizationId: "org_acme",
        actorUserId: null,
        agentId: null,
        actionId: null,
        eventType: "policy_published" as const,
        message: "Se publicó una política.",
        metadata: {},
        createdAt: new Date("2026-07-12T08:10:00.000Z"),
      };

      const result = mapAuditEvent(row);
      expect(result.actorUserId).toBeNull();
      expect(result.agentId).toBeNull();
      expect(result.actionId).toBeNull();
    });
  });
  ```
  Ejecutar `npx vitest run src/data/audit.test.ts` y comprobar que falla:
  ```
  Error: Failed to resolve import "./audit" from "src/data/audit.test.ts". Does the file exist?
  ```

- [ ] **Step 2: Implementación mínima y verde**
  Crear `src/data/audit.ts`:
  ```ts
  /**
   * Repositorio de auditoría: traduce filas de Prisma a la `AuditEvent` de
   * dominio. No confundir con `src/lib/audit.ts` (orden/filtro puro sobre
   * `AuditEvent[]`, usado dentro de `AuditTimeline`).
   */
  import { prisma } from "@/lib/prisma";
  import type { AuditEvent as PrismaAuditEvent } from "@/generated/prisma/client";
  import type { AuditEvent } from "@/domain";

  /** Traduce una fila `AuditEvent` de Prisma a la `AuditEvent` de dominio. */
  export function mapAuditEvent(row: PrismaAuditEvent): AuditEvent {
    return {
      id: row.id,
      organizationId: row.organizationId,
      actorUserId: row.actorUserId,
      agentId: row.agentId,
      actionId: row.actionId,
      eventType: row.eventType,
      message: row.message,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Todos los eventos de auditoría de la organización. */
  export async function getAuditEvents(): Promise<AuditEvent[]> {
    const rows = await prisma.auditEvent.findMany({
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapAuditEvent);
  }

  /** Busca un evento de auditoría por id directamente en BD; `undefined` si no existe. */
  export async function getAuditEventById(
    id: string,
  ): Promise<AuditEvent | undefined> {
    const row = await prisma.auditEvent.findUnique({ where: { id } });
    return row ? mapAuditEvent(row) : undefined;
  }
  ```
  Ejecutar `npx vitest run src/data/audit.test.ts`:
  ```
  ✓ src/data/audit.test.ts (2 tests)
  ```
  Commit:
  ```
  git add src/data/audit.ts src/data/audit.test.ts
  git commit -m "feat: repositorio de auditoría con mapper Prisma→dominio"
  ```

---

### Task 9: Sesión sobre BD (`getCurrentUser`/`getCurrentOrganization`)

**Decisión fijada en esta tarea (documentada para revisión):** `src/lib/session.ts` hoy exporta `currentUser`/`currentOrganization` **síncronos**, importados directamente por varios componentes cliente (`top-bar.tsx`, `runtime-store.tsx`, `notification-store.tsx`, `review/*`) que quedan **fuera del alcance de este slice**. Sustituir esos exports por algo asíncrono romper铆a esos componentes (Prisma no puede bundlearse en cliente). Por eso este slice **añade** `getCurrentUser()`/`getCurrentOrganization()` asíncronos (para las páginas server ya migradas) y **conserva intactos** los exports síncronos sobre `demo-data` hasta que los slices 2-4 migren esos componentes cliente a Server Components + props. Es una divergencia deliberada del enunciado del spec ("cambio mínimo y aislado" se interpreta aquí como "no romper nada fuera de alcance"); **debe confirmarla el hilo principal / `arquitecto`** antes de fusionar, porque toca un límite de módulo (`session.ts`) compartido entre server y cliente.

**Files:**
- Modify: `src/lib/session.ts`
- Test: `src/lib/session.test.ts`

**Interfaces:**
- Consumes: `getUsers(): Promise<User[]>` de `@/data/users`, `getOrganization(): Promise<Organization>` de `@/data/organizations`.
- Produces: `getCurrentUser(): Promise<User>`, `getCurrentOrganization(): Promise<Organization>` (además de los `currentUser`/`currentOrganization` síncronos ya existentes, sin cambios).

- [ ] **Step 1: Test en rojo para `getCurrentUser`/`getCurrentOrganization`**
  Crear `src/lib/session.test.ts`:
  ```ts
  import { describe, it, expect, vi } from "vitest";

  vi.mock("@/data/users", () => ({
    getUsers: vi.fn(async () => [
      {
        id: "usr_reviewer",
        organizationId: "org_acme",
        name: "Diego Ferrer",
        email: "diego.ferrer@acme.example",
        role: "reviewer",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "usr_admin",
        organizationId: "org_acme",
        name: "Lucía Marín",
        email: "lucia.marin@acme.example",
        role: "admin",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]),
  }));

  vi.mock("@/data/organizations", () => ({
    getOrganization: vi.fn(async () => ({
      id: "org_acme",
      name: "Acme Operations",
      slug: "acme",
      emergencyStop: false,
      emergencyStopById: null,
      emergencyStopAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
  }));

  import { getCurrentUser, getCurrentOrganization } from "./session";

  describe("getCurrentUser", () => {
    it("devuelve el usuario administrador de la organización", async () => {
      const user = await getCurrentUser();
      expect(user.role).toBe("admin");
      expect(user.id).toBe("usr_admin");
    });
  });

  describe("getCurrentOrganization", () => {
    it("devuelve la organización activa leída de la BD", async () => {
      const org = await getCurrentOrganization();
      expect(org.id).toBe("org_acme");
    });
  });
  ```
  Ejecutar `npx vitest run src/lib/session.test.ts` y comprobar que falla:
  ```
  Error: [vitest] No "getCurrentUser" export is defined on the "./session" mock...
  ```
  (o un `TypeError: getCurrentUser is not a function`, según cómo resuelva el import; en cualquier caso falla porque la función no existe todavía).

- [ ] **Step 2: Implementación mínima y verde**
  Modificar `src/lib/session.ts` (contenido completo tras el cambio):
  ```ts
  /**
   * Sesión simulada.
   * Hasta que exista autenticación real (fase 11), el shell asume un usuario
   * activo fijo: el administrador de la organización semilla.
   *
   * `currentUser`/`currentOrganization` (síncronos, sobre `demo-data`) siguen
   * alimentando los componentes cliente que aún no se han migrado a Prisma
   * (top-bar, runtime-store, notification-store, review). `getCurrentUser`/
   * `getCurrentOrganization` (asíncronos, sobre la BD) son la versión para las
   * páginas server ya migradas en este slice. Cuando los consumidores cliente
   * se muevan a Server Components + props (slices 2-4), estas dos fuentes se
   * unifican y los `const` síncronos desaparecen.
   */
  import { organization, users } from "@/data/demo-data";
  import type { Organization, User } from "@/domain";
  import { getUsers } from "@/data/users";
  import { getOrganization } from "@/data/organizations";

  export const currentUser: User =
    users.find((u) => u.role === "admin") ?? users[0];
  export const currentOrganization: Organization = organization;

  /** Usuario activo leído de la BD: el administrador de la organización semilla. */
  export async function getCurrentUser(): Promise<User> {
    const dbUsers = await getUsers();
    return dbUsers.find((u) => u.role === "admin") ?? dbUsers[0];
  }

  /** Organización activa leída de la BD. */
  export async function getCurrentOrganization(): Promise<Organization> {
    return getOrganization();
  }
  ```
  Ejecutar `npx vitest run src/lib/session.test.ts`:
  ```
  ✓ src/lib/session.test.ts (2 tests)
  ```
  Ejecutar además `npx vitest run` completo para confirmar que no rompe nada existente (top-bar, runtime-store, etc. siguen usando `currentUser`/`currentOrganization` sin cambios):
  ```
  Test Files  16 passed (16)
  ```
  Commit:
  ```
  git add src/lib/session.ts src/lib/session.test.ts
  git commit -m "feat: getCurrentUser/getCurrentOrganization sobre BD en session.ts"
  ```

---

### Task 10: Wiring de `/agents` y `/agents/[agentId]`

**Files:**
- Modify: `src/app/agents/page.tsx`
- Modify: `src/app/agents/[agentId]/page.tsx`

**Interfaces:**
- Consumes: `getAgents()`, `getAgentById(id)` de `@/data/agents`; `getActions()` de `@/data/actions`; `getUsers()` de `@/data/users`; `getPermissions()` de `@/data/permissions`; `getTools()` de `@/data/tools`.
- Produces: las páginas siguen exponiendo la misma forma de props a `AgentsList`, `AgentDetail`, `AgentTools`, `AgentActions` (sin cambios en esos componentes).

No hay test unitario nuevo para este paso: no existe infraestructura de test de componentes/páginas React en el repo (solo `lib/`/`domain/` tienen `*.test.ts`; añadir `@testing-library/react` sería una dependencia nueva, fuera de alcance de este slice). Se verifica con type-check, build y una comprobación manual vía `curl` contra el servidor de desarrollo (sin navegador disponible en WSL).

- [ ] **Step 1: Reescribir `src/app/agents/page.tsx`**
  ```tsx
  import { PageHeader } from "@/components/app-shell/page-header";
  import { AgentsList } from "@/components/agents/agents-list";
  import { getAgents } from "@/data/agents";
  import { getActions } from "@/data/actions";
  import { getUsers } from "@/data/users";

  export default async function AgentsPage() {
    const [agents, actions, users] = await Promise.all([
      getAgents(),
      getActions(),
      getUsers(),
    ]);

    return (
      <div>
        <PageHeader
          title="Agentes"
          description="Inventario de agentes conectados, su estado y su riesgo reciente."
        />
        <AgentsList agents={agents} actions={actions} users={users} />
      </div>
    );
  }
  ```

- [ ] **Step 2: Reescribir `src/app/agents/[agentId]/page.tsx`**
  ```tsx
  import { notFound } from "next/navigation";
  import { AgentDetail } from "@/components/agents/agent-detail";
  import { AgentTools } from "@/components/agents/agent-tools";
  import { AgentActions } from "@/components/agents/agent-actions";
  import { getAgentById } from "@/data/agents";
  import { getActions } from "@/data/actions";
  import { getPermissions } from "@/data/permissions";
  import { getTools } from "@/data/tools";
  import { getUsers } from "@/data/users";

  export default async function AgentDetailPage({
    params,
  }: {
    params: Promise<{ agentId: string }>;
  }) {
    const { agentId } = await params;
    const [agent, actions, permissions, tools, users] = await Promise.all([
      getAgentById(agentId),
      getActions(),
      getPermissions(),
      getTools(),
      getUsers(),
    ]);

    if (!agent) {
      notFound();
    }

    const owner = users.find((u) => u.id === agent.ownerId);

    return (
      <div>
        <AgentDetail agent={agent} owner={owner} />
        <AgentTools permissions={permissions} tools={tools} agentId={agent.id} />
        <AgentActions actions={actions} agentId={agent.id} />
      </div>
    );
  }
  ```

- [ ] **Step 3: Verificar tipos, tests y build**
  ```
  npx tsc --noEmit
  npx vitest run
  npm run build
  ```
  Todo debe pasar sin errores (el build ejecuta contra la `DATABASE_URL` real de `.env`, que ya tiene el seed cargado según el estado del repo).

- [ ] **Step 4: Verificación manual vía curl (sin navegador en WSL)**
  ```
  npm run dev &
  sleep 2
  curl -s http://localhost:3000/agents | grep -o "Inventario de agentes" 
  curl -s http://localhost:3000/agents/agt_billing | head -c 500
  ```
  Confirmar que el HTML devuelto contiene un agente real del seed (p. ej. el nombre de un agente de `demo-data.ts`/BD) y no un mensaje de error.

- [ ] **Step 5: Commit**
  ```
  git add src/app/agents/page.tsx src/app/agents/\[agentId\]/page.tsx
  git commit -m "feat: leer /agents y /agents/[agentId] desde Prisma"
  ```

---

### Task 11: Wiring de `/audit` y `/audit/[eventId]`

**Files:**
- Modify: `src/app/audit/page.tsx`
- Modify: `src/app/audit/[eventId]/page.tsx`

**Interfaces:**
- Consumes: `getAuditEvents()`, `getAuditEventById(id)` de `@/data/audit`; `getAgents()` de `@/data/agents`; `getUsers()` de `@/data/users`.
- Produces: mismas props a `AuditTimelineLive` y `AuditDetail` (sin cambios en esos componentes).

- [ ] **Step 1: Reescribir `src/app/audit/page.tsx`**
  ```tsx
  import { PageHeader } from "@/components/app-shell/page-header";
  import { AuditTimelineLive } from "@/components/audit/audit-timeline-live";
  import { getAuditEvents } from "@/data/audit";
  import { getAgents } from "@/data/agents";
  import { getUsers } from "@/data/users";

  export default async function AuditPage({
    searchParams,
  }: {
    searchParams: Promise<{ selected?: string }>;
  }) {
    const { selected } = await searchParams;
    const [auditEvents, agents, users] = await Promise.all([
      getAuditEvents(),
      getAgents(),
      getUsers(),
    ]);

    return (
      <div>
        <PageHeader
          title="Auditoría"
          description="Registro inmutable de acciones, decisiones y cambios de configuración."
        />
        <AuditTimelineLive
          seedEvents={auditEvents}
          agents={agents}
          users={users}
          selectedId={selected ?? null}
        />
      </div>
    );
  }
  ```

- [ ] **Step 2: Reescribir `src/app/audit/[eventId]/page.tsx`**
  ```tsx
  import { notFound } from "next/navigation";
  import { PageHeader } from "@/components/app-shell/page-header";
  import { AuditDetail } from "@/components/audit/audit-detail";
  import { auditEventTypeLabel } from "@/domain";
  import { getAuditEventById } from "@/data/audit";
  import { getAgents } from "@/data/agents";
  import { getUsers } from "@/data/users";

  export default async function AuditEventPage({
    params,
  }: {
    params: Promise<{ eventId: string }>;
  }) {
    const { eventId } = await params;
    const [event, agents, users] = await Promise.all([
      getAuditEventById(eventId),
      getAgents(),
      getUsers(),
    ]);

    if (!event) {
      notFound();
    }

    return (
      <div>
        <PageHeader
          title={auditEventTypeLabel[event.eventType]}
          description={event.message}
        />
        <AuditDetail event={event} agents={agents} users={users} />
      </div>
    );
  }
  ```

- [ ] **Step 3: Verificar tipos, tests y build**
  ```
  npx tsc --noEmit
  npx vitest run
  npm run build
  ```

- [ ] **Step 4: Verificación manual vía curl**
  ```
  npm run dev &
  sleep 2
  curl -s http://localhost:3000/audit | grep -o "Registro inmutable"
  ```
  Tomar un id real de evento de auditoría de la BD (p. ej. vía `npx prisma studio` o `SELECT id FROM "AuditEvent" LIMIT 1`) y comprobar:
  ```
  curl -s http://localhost:3000/audit/<eventId> | head -c 500
  ```

- [ ] **Step 5: Commit**
  ```
  git add src/app/audit/page.tsx src/app/audit/\[eventId\]/page.tsx
  git commit -m "feat: leer /audit y /audit/[eventId] desde Prisma"
  ```

---

### Task 12: Wiring de `/settings`

**Files:**
- Modify: `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `getUsers()` de `@/data/users`, `getTools()` de `@/data/tools`.
- Produces: misma prop a `SettingsPanel` (sin cambios en ese componente ni en sus hijos `UsersSection`/`RolesSection`/`ToolsSection`).

- [ ] **Step 1: Reescribir `src/app/settings/page.tsx`**
  ```tsx
  import { PageHeader } from "@/components/app-shell/page-header";
  import { SettingsPanel } from "@/components/settings/settings-panel";
  import { getUsers } from "@/data/users";
  import { getTools } from "@/data/tools";

  export default async function SettingsPage() {
    const [users, tools] = await Promise.all([getUsers(), getTools()]);

    return (
      <div>
        <PageHeader
          title="Ajustes"
          description="Usuarios, roles y herramientas conectadas de la organización."
        />
        <SettingsPanel users={users} tools={tools} />
      </div>
    );
  }
  ```

- [ ] **Step 2: Verificar tipos, tests y build**
  ```
  npx tsc --noEmit
  npx vitest run
  npm run build
  ```

- [ ] **Step 3: Verificación manual vía curl**
  ```
  npm run dev &
  sleep 2
  curl -s http://localhost:3000/settings | grep -o "Usuarios, roles y herramientas"
  ```

- [ ] **Step 4: Commit**
  ```
  git add src/app/settings/page.tsx
  git commit -m "feat: leer /settings desde Prisma"
  ```

---

### Task 13: Wiring de la lectura del dashboard

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard/active-agents-block.tsx`
- Modify: `src/components/dashboard/pending-actions-block.tsx`
- Modify: `src/components/dashboard/risk-block.tsx`
- Modify: `src/components/dashboard/recent-policies-block.tsx`

**Interfaces:**
- Consumes: `getAgents()` de `@/data/agents`, `getActions()` de `@/data/actions`, `getPolicies()` de `@/data/policies`.
- Produces: `ActiveAgentsBlock({ agents: Agent[] })`, `PendingActionsBlock({ actions: AgentAction[]; agents: Agent[] })`, `RiskBlock({ actions: AgentAction[] })`, `RecentPoliciesBlock({ policies: Policy[] })`. `EmergencyStopBlock` no cambia (sigue leyendo de `runtime-store`, fuera de alcance).

- [ ] **Step 1: `active-agents-block.tsx` recibe `agents` por props**
  ```tsx
  import Link from "next/link";
  import type { Agent } from "@/domain";
  import { DashboardBlock } from "./dashboard-block";
  import { EmptyState } from "@/components/feedback/empty-state";
  import { CountUp } from "@/components/data-display/count-up";
  import { getActiveAgents } from "@/lib/dashboard";
  import styles from "./dashboard.module.css";

  /** Bloque: cuántos agentes están activos y cuáles. */
  export function ActiveAgentsBlock({ agents }: { agents: Agent[] }) {
    const active = getActiveAgents(agents);

    return (
      <DashboardBlock
        title="Agentes activos"
        action={
          <Link href="/agents" className={styles.blockAction}>
            Ver agentes →
          </Link>
        }
      >
        {active.length === 0 ? (
          <EmptyState title="No hay agentes activos." />
        ) : (
          <>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp value={active.length} />
              </span>
              <span className={styles.metricLabel}>en ejecución</span>
            </div>
            {active.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className={styles.row}
              >
                <span className={styles.dot} aria-hidden="true" />
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{agent.name}</span>
                </div>
              </Link>
            ))}
          </>
        )}
      </DashboardBlock>
    );
  }
  ```

- [ ] **Step 2: `pending-actions-block.tsx` recibe `actions`/`agents` por props**
  ```tsx
  import Link from "next/link";
  import type { Agent, AgentAction } from "@/domain";
  import { DashboardBlock } from "./dashboard-block";
  import { EmptyState } from "@/components/feedback/empty-state";
  import { RiskBadge } from "@/components/data-display/risk-badge";
  import { getPendingActions } from "@/lib/dashboard";
  import { formatRelativeTime, isOverdue } from "@/lib/format";
  import styles from "./dashboard.module.css";

  /** Bloque: acciones a la espera de decisión, las más urgentes primero. */
  export function PendingActionsBlock({
    actions,
    agents,
  }: {
    actions: AgentAction[];
    agents: Agent[];
  }) {
    const pending = getPendingActions(actions);
    const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

    return (
      <DashboardBlock
        title="Acciones pendientes"
        action={
          <Link href="/review" className={styles.blockAction}>
            Ver cola →
          </Link>
        }
      >
        {pending.length === 0 ? (
          <EmptyState title="No hay acciones pendientes de revisión." />
        ) : (
          pending.map((action) => (
            <Link
              key={action.id}
              href={`/review/${action.id}`}
              className={styles.row}
            >
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{action.title}</span>
                <span className={styles.rowMeta}>
                  {agentName(action.agentId)} ·{" "}
                  {formatRelativeTime(action.createdAt)}
                </span>
              </div>
              <div className={styles.rowAside}>
                {isOverdue(action.approvalDueAt) ? (
                  <span className={styles.overdue}>Vencida</span>
                ) : null}
                <RiskBadge level={action.riskLevel} />
              </div>
            </Link>
          ))
        )}
      </DashboardBlock>
    );
  }
  ```

- [ ] **Step 3: `risk-block.tsx` recibe `actions` por props**
  ```tsx
  import type { AgentAction, RiskLevel } from "@/domain";
  import { DashboardBlock } from "./dashboard-block";
  import { EmptyState } from "@/components/feedback/empty-state";
  import { CountUp } from "@/components/data-display/count-up";
  import { getPendingActions, getRiskBreakdown } from "@/lib/dashboard";
  import { riskLevelLabel } from "@/domain";
  import styles from "./dashboard.module.css";

  /** Orden de presentación del desglose: de más grave a menos. */
  const LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];

  /** Bloque: riesgo agregado de las acciones pendientes. */
  export function RiskBlock({ actions }: { actions: AgentAction[] }) {
    const pending = getPendingActions(actions);
    const breakdown = getRiskBreakdown(pending);
    const severe = breakdown.critical + breakdown.high;

    return (
      <DashboardBlock title="Riesgo agregado">
        {pending.length === 0 ? (
          <EmptyState title="Sin riesgo pendiente." />
        ) : (
          <>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp value={severe} />
              </span>
              <span className={styles.metricLabel}>de riesgo alto o crítico</span>
            </div>
            <div className={styles.breakdown}>
              {LEVELS.map((level) => (
                <div key={level} className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>
                    {riskLevelLabel[level]}
                  </span>
                  <span className={styles.breakdownCount}>
                    <CountUp value={breakdown[level]} />
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </DashboardBlock>
    );
  }
  ```

- [ ] **Step 4: `recent-policies-block.tsx` recibe `policies` por props**
  ```tsx
  import Link from "next/link";
  import type { Policy } from "@/domain";
  import { DashboardBlock } from "./dashboard-block";
  import { EmptyState } from "@/components/feedback/empty-state";
  import { getRecentPolicies } from "@/lib/dashboard";
  import { formatRelativeTime } from "@/lib/format";
  import { policyEffectLabel } from "@/domain";
  import styles from "./dashboard.module.css";

  /** Bloque: políticas que pasaron a activas más recientemente. */
  export function RecentPoliciesBlock({ policies }: { policies: Policy[] }) {
    const recent = getRecentPolicies(policies);

    return (
      <DashboardBlock
        title="Políticas activadas recientemente"
        action={
          <Link href="/policies" className={styles.blockAction}>
            Ver políticas →
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState title="No hay políticas activas." />
        ) : (
          recent.map((policy) => (
            <Link
              key={policy.id}
              href={`/policies/${policy.id}`}
              className={styles.row}
            >
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{policy.name}</span>
                <span className={styles.rowMeta}>
                  {policyEffectLabel[policy.effect]}
                </span>
              </div>
              <div className={styles.rowAside}>
                <span className={styles.rowMeta}>
                  {policy.publishedAt
                    ? formatRelativeTime(policy.publishedAt)
                    : "—"}
                </span>
              </div>
            </Link>
          ))
        )}
      </DashboardBlock>
    );
  }
  ```

- [ ] **Step 5: Reescribir `src/app/page.tsx`**
  ```tsx
  import { PageHeader } from "@/components/app-shell/page-header";
  import { PendingActionsBlock } from "@/components/dashboard/pending-actions-block";
  import { ActiveAgentsBlock } from "@/components/dashboard/active-agents-block";
  import { RiskBlock } from "@/components/dashboard/risk-block";
  import { RecentPoliciesBlock } from "@/components/dashboard/recent-policies-block";
  import { EmergencyStopBlock } from "@/components/dashboard/emergency-stop-block";
  import { getAgents } from "@/data/agents";
  import { getActions } from "@/data/actions";
  import { getPolicies } from "@/data/policies";
  import styles from "@/components/dashboard/dashboard.module.css";

  export default async function Home() {
    const [agents, actions, policies] = await Promise.all([
      getAgents(),
      getActions(),
      getPolicies(),
    ]);

    return (
      <div>
        <PageHeader
          title="Panel de control"
          description="Estado operativo y prioridades del sistema."
        />
        <div className={styles.grid}>
          <PendingActionsBlock actions={actions} agents={agents} />
          <ActiveAgentsBlock agents={agents} />
          <RiskBlock actions={actions} />
          <RecentPoliciesBlock policies={policies} />
          <EmergencyStopBlock />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 6: Verificar tipos, tests y build**
  ```
  npx tsc --noEmit
  npx vitest run
  npm run build
  ```

- [ ] **Step 7: Verificación manual vía curl**
  ```
  npm run dev &
  sleep 2
  curl -s http://localhost:3000/ | grep -o "Panel de control"
  curl -s http://localhost:3000/ | grep -o "Agentes activos"
  ```

- [ ] **Step 8: Commit**
  ```
  git add src/app/page.tsx src/components/dashboard/active-agents-block.tsx src/components/dashboard/pending-actions-block.tsx src/components/dashboard/risk-block.tsx src/components/dashboard/recent-policies-block.tsx
  git commit -m "feat: leer el dashboard desde Prisma (props en vez de demo-data)"
  ```
