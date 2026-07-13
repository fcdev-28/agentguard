# Dashboard (Fase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la ruta `/` de placeholder a dashboard operativo con cuatro bloques (acciones pendientes, agentes activos, riesgo agregado, políticas recientes), estados de carga y vacío, y métricas animadas con un `CountUp` estilo reactbits.

**Architecture:** Server Component (`app/page.tsx`) que compone cuatro bloques server-side sobre las primitivas ya existentes (`DashboardBlock`, `dashboard.module.css`, `PageHeader`, `formatRelativeTime`/`isOverdue`). Cada bloque importa el seed (`@/data/demo-data`) y un selector puro (`@/lib/dashboard`). Las métricas embeben un island cliente `CountUp`. El único código con lógica y test unitario es el selector puro.

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript estricto, CSS Modules + tokens OKLCH, Vitest.

## Global Constraints

- TypeScript estricto; imports con alias `@/` (p. ej. `@/lib/dashboard`).
- Copy visible en castellano; nombres de tipos/funciones en inglés.
- Estilos vía CSS Modules + tokens de `src/styles/tokens.css`. Sin valores de color hardcodeados.
- Reglas duras de diseño: sin tarjetas anidadas, sin gradientes morados, sin modales, sin tabla/lista sin estado vacío.
- El movimiento aclara cambios de estado, no entretiene. `CountUp` debe honrar `prefers-reduced-motion`.
- Commits en español tras el tipo convencional (`feat:`, `test:`, `style:`).
- Sin nuevas dependencias (React 19 + Next 16 puros; nada de framer-motion/gsap).
- Reloj de la demo: `demoNow` (`@/data/demo-data`); tiempos relativos vía `formatRelativeTime`.

---

### Task 1: Selector puro del dashboard

**Files:**
- Create: `src/lib/dashboard.ts`
- Test: `src/lib/dashboard.test.ts`

**Interfaces:**
- Consumes: tipos `Agent`, `AgentAction`, `ActionStatus`, `Policy`, `RiskLevel` de `@/domain`.
- Produces:
  - `isPendingReview(status: ActionStatus): boolean`
  - `getPendingActions(actions: AgentAction[]): AgentAction[]`
  - `getActiveAgents(agents: Agent[]): Agent[]`
  - `getRiskBreakdown(pending: AgentAction[]): Record<RiskLevel, number>`
  - `getRecentPolicies(policies: Policy[], limit?: number): Policy[]`

- [ ] **Step 1: Write the failing test**

`src/lib/dashboard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Agent, AgentAction, Policy } from "@/domain";
import {
  isPendingReview,
  getPendingActions,
  getActiveAgents,
  getRiskBreakdown,
  getRecentPolicies,
} from "@/lib/dashboard";

function action(partial: Partial<AgentAction>): AgentAction {
  return {
    id: "a1",
    organizationId: "org1",
    agentId: "ag1",
    toolId: "t1",
    policyId: null,
    title: "Acción",
    summary: "",
    actionType: "send_email",
    status: "needs_approval",
    riskLevel: "medium",
    payload: {},
    policyResult: null,
    approvalDueAt: null,
    createdAt: "2026-07-12T09:00:00.000Z",
    updatedAt: "2026-07-12T09:00:00.000Z",
    executedAt: null,
    ...partial,
  };
}

function agent(partial: Partial<Agent>): Agent {
  return {
    id: "ag1",
    organizationId: "org1",
    ownerId: "u1",
    name: "Agente",
    description: "",
    environment: "production",
    status: "active",
    mode: "enforce",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

function policy(partial: Partial<Policy>): Policy {
  return {
    id: "p1",
    organizationId: "org1",
    name: "Política",
    description: "",
    status: "active",
    version: 1,
    conditions: {},
    effect: "require_approval",
    approvalSlaMinutes: null,
    createdById: "u1",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    publishedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("isPendingReview", () => {
  it("es verdadero solo para estados a la espera de decisión", () => {
    expect(isPendingReview("needs_approval")).toBe(true);
    expect(isPendingReview("proposed")).toBe(true);
    expect(isPendingReview("escalated")).toBe(true);
    expect(isPendingReview("approved")).toBe(false);
    expect(isPendingReview("executed")).toBe(false);
    expect(isPendingReview("blocked")).toBe(false);
  });
});

describe("getPendingActions", () => {
  it("filtra pendientes y ordena por riesgo desc, luego fecha asc", () => {
    const input = [
      action({ id: "med", riskLevel: "medium", createdAt: "2026-07-12T08:00:00.000Z" }),
      action({ id: "done", status: "executed", riskLevel: "critical" }),
      action({ id: "critA", riskLevel: "critical", createdAt: "2026-07-12T07:00:00.000Z" }),
      action({ id: "critB", riskLevel: "critical", createdAt: "2026-07-12T06:00:00.000Z" }),
    ];
    const result = getPendingActions(input).map((a) => a.id);
    expect(result).toEqual(["critB", "critA", "med"]);
  });
});

describe("getActiveAgents", () => {
  it("solo devuelve agentes con status active", () => {
    const input = [
      agent({ id: "on", status: "active" }),
      agent({ id: "paused", status: "paused" }),
      agent({ id: "err", status: "error" }),
    ];
    expect(getActiveAgents(input).map((a) => a.id)).toEqual(["on"]);
  });
});

describe("getRiskBreakdown", () => {
  it("cuenta las pendientes por nivel de riesgo", () => {
    const input = [
      action({ riskLevel: "critical" }),
      action({ riskLevel: "high" }),
      action({ riskLevel: "high" }),
      action({ riskLevel: "low" }),
    ];
    expect(getRiskBreakdown(input)).toEqual({ critical: 1, high: 2, medium: 0, low: 1 });
  });
});

describe("getRecentPolicies", () => {
  it("solo activas, ordenadas por publishedAt desc, recortadas al límite", () => {
    const input = [
      policy({ id: "old", publishedAt: "2026-07-01T00:00:00.000Z" }),
      policy({ id: "draft", status: "draft", publishedAt: "2026-07-10T00:00:00.000Z" }),
      policy({ id: "new", publishedAt: "2026-07-05T00:00:00.000Z" }),
    ];
    expect(getRecentPolicies(input, 4).map((p) => p.id)).toEqual(["new", "old"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dashboard.test.ts`
Expected: FAIL — no se puede resolver `@/lib/dashboard` (módulo inexistente).

- [ ] **Step 3: Write minimal implementation**

`src/lib/dashboard.ts`:

```ts
import type { Agent, AgentAction, ActionStatus, Policy, RiskLevel } from "@/domain";

/** Estados en los que una acción espera una decisión humana. */
const PENDING_STATUSES: ReadonlySet<ActionStatus> = new Set([
  "needs_approval",
  "proposed",
  "escalated",
]);

/** Peso de cada nivel de riesgo para ordenar de más a menos urgente. */
const riskRank: Record<RiskLevel, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

/** ¿La acción está a la espera de decisión humana? */
export function isPendingReview(status: ActionStatus): boolean {
  return PENDING_STATUSES.has(status);
}

/** Acciones pendientes, ordenadas por riesgo desc y luego por antigüedad asc. */
export function getPendingActions(actions: AgentAction[]): AgentAction[] {
  return actions
    .filter((a) => isPendingReview(a.status))
    .sort((a, b) => {
      const byRisk = riskRank[b.riskLevel] - riskRank[a.riskLevel];
      if (byRisk !== 0) return byRisk;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

/** Agentes actualmente activos. */
export function getActiveAgents(agents: Agent[]): Agent[] {
  return agents.filter((a) => a.status === "active");
}

/** Conteo de acciones pendientes por nivel de riesgo. */
export function getRiskBreakdown(pending: AgentAction[]): Record<RiskLevel, number> {
  const breakdown: Record<RiskLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const action of pending) {
    breakdown[action.riskLevel] += 1;
  }
  return breakdown;
}

/** Políticas activas, ordenadas por fecha de publicación desc, recortadas. */
export function getRecentPolicies(policies: Policy[], limit = 4): Policy[] {
  return policies
    .filter((p) => p.status === "active")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dashboard.test.ts`
Expected: PASS (todos los `describe` en verde).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard.ts src/lib/dashboard.test.ts
git commit -m "feat: selector puro del dashboard (fase 2)"
```

---

### Task 2: Componente CountUp

**Files:**
- Create: `src/components/data-display/count-up.tsx`

**Interfaces:**
- Produces: `CountUp({ value, durationMs }: { value: number; durationMs?: number })` — client component que renderiza un `<span>` con el número animado.

Nota: sin test unitario (anima con `requestAnimationFrame` sobre el DOM; el entorno de Vitest es node sin jsdom). Se verifica con typecheck/build y en navegador.

- [ ] **Step 1: Write the component**

`src/components/data-display/count-up.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

/** ¿El usuario pidió reducir el movimiento? */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Easing de desaceleración (rápido al principio, suave al final). */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Número que cuenta desde 0 hasta `value` al montar. Aclara que la métrica se
 * asienta; no decora. Honra prefers-reduced-motion mostrando el valor final sin
 * animar. Adaptación nativa del patrón CountUp de reactbits.dev (sin deps).
 */
export function CountUp({
  value,
  durationMs = 700,
}: {
  value: number;
  durationMs?: number;
}) {
  // Inicia en 0 en servidor y cliente (hidratación consistente) y sube al montar.
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplay(Math.round(easeOut(progress) * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, durationMs]);

  return <span>{display}</span>;
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-display/count-up.tsx
git commit -m "feat: componente CountUp para métricas (estilo reactbits)"
```

---

### Task 3: Componente RiskBadge

**Files:**
- Create: `src/components/data-display/risk-badge.tsx`
- Create: `src/components/data-display/risk-badge.module.css`

**Interfaces:**
- Consumes: `RiskLevel` y `riskLevelLabel` de `@/domain`.
- Produces: `RiskBadge({ level }: { level: RiskLevel })` — pill con la etiqueta del nivel.

- [ ] **Step 1: Write the stylesheet**

`src/components/data-display/risk-badge.module.css`:

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  font-size: var(--text-12);
  font-weight: var(--weight-medium);
  line-height: 18px;
  white-space: nowrap;
}

/* Gradiente de severidad: neutro -> ámbar -> rojo contorno -> rojo sólido. */
.low {
  background: var(--color-surface);
  color: var(--color-muted);
}
.medium {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}
.high {
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
}
.critical {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
```

- [ ] **Step 2: Write the component**

`src/components/data-display/risk-badge.tsx`:

```tsx
import type { RiskLevel } from "@/domain";
import { riskLevelLabel } from "@/domain";
import styles from "./risk-badge.module.css";

/** Pill con el nivel de riesgo, coloreada por severidad. */
export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`${styles.badge} ${styles[level]}`}>{riskLevelLabel[level]}</span>;
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/data-display/risk-badge.tsx src/components/data-display/risk-badge.module.css
git commit -m "feat: componente RiskBadge"
```

---

### Task 4: Componente EmptyState

**Files:**
- Create: `src/components/feedback/empty-state.tsx`
- Create: `src/components/feedback/empty-state.module.css`

**Interfaces:**
- Produces: `EmptyState({ title, hint }: { title: string; hint?: string })` — bloque de estado vacío para el cuerpo de un `DashboardBlock`.

- [ ] **Step 1: Write the stylesheet**

`src/components/feedback/empty-state.module.css`:

```css
.empty {
  padding: var(--space-4) var(--space-3);
}

.title {
  font-size: var(--text-13);
  color: var(--color-ink-soft);
}

.hint {
  margin-top: 2px;
  font-size: var(--text-12);
  color: var(--color-muted);
}
```

- [ ] **Step 2: Write the component**

`src/components/feedback/empty-state.tsx`:

```tsx
import styles from "./empty-state.module.css";

/** Estado vacío breve: un título y una pista opcional. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/feedback/empty-state.tsx src/components/feedback/empty-state.module.css
git commit -m "feat: componente EmptyState"
```

---

### Task 5: Bloque de acciones pendientes + montaje del dashboard

**Files:**
- Create: `src/components/dashboard/pending-actions-block.tsx`
- Modify: `src/components/dashboard/dashboard.module.css` (añadir `.overdue`)
- Modify: `src/app/page.tsx` (reemplazar placeholder por el dashboard)

**Interfaces:**
- Consumes: `getPendingActions` (`@/lib/dashboard`), `formatRelativeTime`/`isOverdue` (`@/lib/format`), `RiskBadge` (Task 3), `EmptyState` (Task 4), `DashboardBlock`, `actions`/`agents` (`@/data/demo-data`).
- Produces: `PendingActionsBlock()` — server component sin props.

- [ ] **Step 1: Add the overdue badge style**

Añadir al final de `src/components/dashboard/dashboard.module.css`:

```css
/* Badge "Vencida" para aprobaciones que superaron approvalDueAt. */
.overdue {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  font-size: var(--text-12);
  font-weight: var(--weight-medium);
  line-height: 18px;
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
}
```

- [ ] **Step 2: Write the block component**

`src/components/dashboard/pending-actions-block.tsx`:

```tsx
import Link from "next/link";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { getPendingActions } from "@/lib/dashboard";
import { formatRelativeTime, isOverdue } from "@/lib/format";
import { actions, agents } from "@/data/demo-data";
import styles from "./dashboard.module.css";

/** Bloque: acciones a la espera de decisión, las más urgentes primero. */
export function PendingActionsBlock() {
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
          <Link key={action.id} href={`/review/${action.id}`} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{action.title}</span>
              <span className={styles.rowMeta}>
                {agentName(action.agentId)} · {formatRelativeTime(action.createdAt)}
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

- [ ] **Step 3: Replace the page placeholder**

`src/app/page.tsx` (contenido completo):

```tsx
import { PageHeader } from "@/components/app-shell/page-header";
import { PendingActionsBlock } from "@/components/dashboard/pending-actions-block";
import styles from "@/components/dashboard/dashboard.module.css";

export default function Home() {
  return (
    <div>
      <PageHeader
        title="Panel de control"
        description="Estado operativo y prioridades del sistema."
      />
      <div className={styles.grid}>
        <PendingActionsBlock />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build and view in browser**

Run: `npx tsc --noEmit && npm run build`
Expected: build sin errores.

Run: `npm run dev` y abrir http://localhost:3000
Expected: cabecera "Panel de control" y el bloque "Acciones pendientes" con filas (riesgo, tiempo relativo, "Vencida" donde aplique) enlazando a `/review/...`.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/pending-actions-block.tsx src/components/dashboard/dashboard.module.css src/app/page.tsx
git commit -m "feat: bloque de acciones pendientes y montaje del dashboard"
```

---

### Task 6: Bloque de agentes activos

**Files:**
- Create: `src/components/dashboard/active-agents-block.tsx`
- Modify: `src/components/dashboard/dashboard.module.css` (añadir punto de estado)
- Modify: `src/app/page.tsx` (añadir el bloque a la grid)

**Interfaces:**
- Consumes: `getActiveAgents` (`@/lib/dashboard`), `CountUp` (Task 2), `EmptyState` (Task 4), `DashboardBlock`, `agents` (`@/data/demo-data`).
- Produces: `ActiveAgentsBlock()` — server component sin props.

- [ ] **Step 1: Add the status dot style**

Añadir al final de `src/components/dashboard/dashboard.module.css`:

```css
/* Punto de estado (agente activo). */
.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-success);
}
```

- [ ] **Step 2: Write the block component**

`src/components/dashboard/active-agents-block.tsx`:

```tsx
import Link from "next/link";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { CountUp } from "@/components/data-display/count-up";
import { getActiveAgents } from "@/lib/dashboard";
import { agents } from "@/data/demo-data";
import styles from "./dashboard.module.css";

/** Bloque: cuántos agentes están activos y cuáles. */
export function ActiveAgentsBlock() {
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
            <Link key={agent.id} href={`/agents/${agent.id}`} className={styles.row}>
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

- [ ] **Step 3: Add the block to the page**

En `src/app/page.tsx`, importar y añadir el bloque dentro de `.grid`, tras `PendingActionsBlock`:

```tsx
import { ActiveAgentsBlock } from "@/components/dashboard/active-agents-block";
```

```tsx
      <div className={styles.grid}>
        <PendingActionsBlock />
        <ActiveAgentsBlock />
      </div>
```

- [ ] **Step 4: Verify build and browser**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

Run: `npm run dev` → http://localhost:3000
Expected: nuevo bloque "Agentes activos" con el número contando hacia arriba al cargar y la lista de agentes con punto verde.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/active-agents-block.tsx src/components/dashboard/dashboard.module.css src/app/page.tsx
git commit -m "feat: bloque de agentes activos con métrica CountUp"
```

---

### Task 7: Bloque de riesgo agregado

**Files:**
- Create: `src/components/dashboard/risk-block.tsx`
- Modify: `src/components/dashboard/dashboard.module.css` (añadir desglose)
- Modify: `src/app/page.tsx` (añadir el bloque a la grid)

**Interfaces:**
- Consumes: `getPendingActions`, `getRiskBreakdown` (`@/lib/dashboard`), `CountUp` (Task 2), `EmptyState` (Task 4), `riskLevelLabel`/`RiskLevel` (`@/domain`), `DashboardBlock`, `actions` (`@/data/demo-data`).
- Produces: `RiskBlock()` — server component sin props.

- [ ] **Step 1: Add the breakdown styles**

Añadir al final de `src/components/dashboard/dashboard.module.css`:

```css
/* Desglose de riesgo por nivel. */
.breakdown {
  display: flex;
  flex-direction: column;
  padding: 0 var(--space-3) var(--space-2);
}

.breakdownRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  font-size: var(--text-13);
  border-top: 1px solid var(--color-border);
}

.breakdownLabel {
  color: var(--color-muted);
}

.breakdownCount {
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}
```

- [ ] **Step 2: Write the block component**

`src/components/dashboard/risk-block.tsx`:

```tsx
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { CountUp } from "@/components/data-display/count-up";
import { getPendingActions, getRiskBreakdown } from "@/lib/dashboard";
import { riskLevelLabel } from "@/domain";
import type { RiskLevel } from "@/domain";
import { actions } from "@/data/demo-data";
import styles from "./dashboard.module.css";

/** Orden de presentación del desglose: de más grave a menos. */
const LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];

/** Bloque: riesgo agregado de las acciones pendientes. */
export function RiskBlock() {
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
                <span className={styles.breakdownLabel}>{riskLevelLabel[level]}</span>
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

- [ ] **Step 3: Add the block to the page**

En `src/app/page.tsx`, importar y añadir tras `ActiveAgentsBlock`:

```tsx
import { RiskBlock } from "@/components/dashboard/risk-block";
```

```tsx
        <PendingActionsBlock />
        <ActiveAgentsBlock />
        <RiskBlock />
```

- [ ] **Step 4: Verify build and browser**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

Run: `npm run dev` → http://localhost:3000
Expected: bloque "Riesgo agregado" con la métrica de alto/crítico y el desglose por nivel, todos los números animando al cargar.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/risk-block.tsx src/components/dashboard/dashboard.module.css src/app/page.tsx
git commit -m "feat: bloque de riesgo agregado con desglose por nivel"
```

---

### Task 8: Bloque de políticas activadas recientemente

**Files:**
- Modify: `src/domain/policy.ts` (añadir `policyEffectLabel`)
- Create: `src/components/dashboard/recent-policies-block.tsx`
- Modify: `src/app/page.tsx` (añadir el bloque a la grid)

**Interfaces:**
- Consumes: `getRecentPolicies` (`@/lib/dashboard`), `formatRelativeTime` (`@/lib/format`), `policyEffectLabel` (`@/domain`), `EmptyState` (Task 4), `DashboardBlock`, `policies` (`@/data/demo-data`).
- Produces: `policyEffectLabel: Record<PolicyEffect, string>`; `RecentPoliciesBlock()` — server component sin props.

- [ ] **Step 1: Add the effect label map**

Añadir al final de `src/domain/policy.ts`:

```ts
/** Etiqueta visible en castellano para cada efecto de política. */
export const policyEffectLabel: Record<PolicyEffect, string> = {
  allow: "Permitir",
  block: "Bloquear",
  require_approval: "Requiere aprobación",
  escalate: "Escalar",
};
```

- [ ] **Step 2: Write the block component**

`src/components/dashboard/recent-policies-block.tsx`:

```tsx
import Link from "next/link";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { getRecentPolicies } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
import { policyEffectLabel } from "@/domain";
import { policies } from "@/data/demo-data";
import styles from "./dashboard.module.css";

/** Bloque: políticas que pasaron a activas más recientemente. */
export function RecentPoliciesBlock() {
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
          <Link key={policy.id} href={`/policies/${policy.id}`} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{policy.name}</span>
              <span className={styles.rowMeta}>{policyEffectLabel[policy.effect]}</span>
            </div>
            <div className={styles.rowAside}>
              <span className={styles.rowMeta}>
                {policy.publishedAt ? formatRelativeTime(policy.publishedAt) : "—"}
              </span>
            </div>
          </Link>
        ))
      )}
    </DashboardBlock>
  );
}
```

- [ ] **Step 3: Add the block to the page**

En `src/app/page.tsx`, importar y añadir tras `RiskBlock`:

```tsx
import { RecentPoliciesBlock } from "@/components/dashboard/recent-policies-block";
```

```tsx
        <PendingActionsBlock />
        <ActiveAgentsBlock />
        <RiskBlock />
        <RecentPoliciesBlock />
```

- [ ] **Step 4: Verify build and browser**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

Run: `npm run dev` → http://localhost:3000
Expected: los cuatro bloques visibles en la grid 2×2; el bloque de políticas muestra nombre, efecto y tiempo relativo desde su publicación.

- [ ] **Step 5: Commit**

```bash
git add src/domain/policy.ts src/components/dashboard/recent-policies-block.tsx src/app/page.tsx
git commit -m "feat: bloque de políticas activadas recientemente"
```

---

### Task 9: Estado de carga (esqueleto)

**Files:**
- Create: `src/app/loading.tsx`
- Modify: `src/components/dashboard/dashboard.module.css` (añadir estilos de esqueleto)

**Interfaces:**
- Consumes: `dashboard.module.css` (`.grid`, `.block`), estilos nuevos de esqueleto.
- Produces: `Loading()` — export default del segmento, esqueleto de la grid.

- [ ] **Step 1: Add skeleton styles**

Añadir al final de `src/components/dashboard/dashboard.module.css`:

```css
/* Esqueleto de carga del dashboard. */
.skeletonBlock {
  min-height: 160px;
  padding: var(--space-4);
}

.skeletonLine {
  height: 12px;
  border-radius: var(--radius-control);
  background: var(--color-surface);
  margin-bottom: var(--space-3);
  animation: skeletonPulse var(--duration-panel) var(--ease-in-out) infinite alternate;
}

.skeletonLine:nth-child(1) {
  width: 40%;
}
.skeletonLine:nth-child(2) {
  width: 80%;
}
.skeletonLine:nth-child(3) {
  width: 65%;
}

@keyframes skeletonPulse {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.55;
  }
}
```

Nota: `globals.css` ya neutraliza animaciones bajo `prefers-reduced-motion`, así que el pulso se detiene solo.

- [ ] **Step 2: Write the loading segment**

`src/app/loading.tsx`:

```tsx
import styles from "@/components/dashboard/dashboard.module.css";

/** Esqueleto del dashboard mientras se resuelven los datos (convención Next). */
export default function Loading() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`${styles.block} ${styles.skeletonBlock}`}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/loading.tsx src/components/dashboard/dashboard.module.css
git commit -m "feat: estado de carga del dashboard (esqueleto)"
```

---

### Task 10: Verificación final y limpieza

**Files:**
- (sin cambios de código salvo lint/format que surjan)

- [ ] **Step 1: Full quality gate**

Run: `npm run lint && npm test && npm run build`
Expected: lint limpio, todos los tests en verde, build correcto.

- [ ] **Step 2: Format check**

Run: `npm run format:check`
Expected: sin diferencias. Si las hay: `npm run format` y commit `style: aplicar formato (fase 2)`.

- [ ] **Step 3: Responsive check en navegador**

`npm run dev`, abrir http://localhost:3000 y estrechar la ventana por debajo de 900px.
Expected: la grid pasa de 2 a 1 columna; filas, badges y métricas se leen sin desbordes.

- [ ] **Step 4: Reduced-motion check**

Activar "reducir movimiento" en el SO/navegador y recargar.
Expected: los `CountUp` muestran el valor final sin animar; el esqueleto no pulsa.

- [ ] **Step 5: (al cerrar el PR) marcar la fase 2 en el Kanban**

Tras mergear el PR, marcar las tareas de la fase 2 (pasos 21–27) como hechas en `kanban.html`, según el convenio del proyecto.

---

## Notas de ejecución

- Las tareas 5–8 dejan la página renderizable y verificable en navegador tras cada una (un bloque más cada vez).
- Los bloques importan el seed directamente (server components); es lo apropiado en la fase de datos simulados y se sustituye por consultas reales en la fase 10.
- Ningún bloque introduce estado global ni cliente salvo el island `CountUp`.
