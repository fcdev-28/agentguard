# Exportación real del audit log (Fase 13 · Tarea 108) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir descargar el registro de auditoría (completo o filtrado por lo que se ve en la UI) en CSV o JSON, con cabeceras HTTP de descarga reales.

**Architecture:** Un módulo puro `audit-export.ts` (serialización CSV/JSON) y un helper puro `toAuditEventFilters` (conversión de filtros UI→dominio, compartido por timeline y ruta) alimentan un route handler `GET /api/audit/export` que reutiliza `filterAuditEvents`/`toAuditExportRow` ya existentes. Un componente de enlaces de descarga en la barra de auditoría construye la URL con los filtros activos.

**Tech Stack:** Next.js (App Router, route handlers), TypeScript estricto, Prisma, Vitest, React.

## Global Constraints

- TypeScript estricto; sin `any`.
- Copy visible en castellano; tipos de dominio y claves de datos (columnas CSV) en inglés.
- Commits en español tras el tipo convencional.
- Reutilizar `filterAuditEvents`, `AuditExportRow`, `toAuditExportRow` de `@/lib/audit` (ya existen); no duplicarlos.
- Auth de la ruta por sesión (`getCurrentUser` de `@/lib/session-db`), paridad con la página `/audit`.
- Prettier: `npx prettier --write` sobre lo tocado antes de cada commit; CI corre `format:check`.
- Tests: mockear `@/lib/prisma`, `@/lib/session-db` con `vi.mock`/`vi.fn`.

---

### Task 1: Serialización pura (CSV/JSON) + helper de filtros compartido

**Files:**
- Create: `src/lib/audit-export.ts`
- Test: `src/lib/audit-export.test.ts`
- Modify: `src/lib/audit.ts` (añadir `toAuditEventFilters`)
- Modify: `src/lib/audit.test.ts` (test de `toAuditEventFilters`)
- Modify: `src/components/audit/audit-timeline.tsx` (usar el helper en vez de la conversión inline)

**Interfaces:**
- Consumes: `AuditExportRow` de `@/lib/audit`, `AuditEventFilters` de `@/lib/audit`.
- Produces:
  - `function toCsv(rows: AuditExportRow[]): string`
  - `function toJson(rows: AuditExportRow[]): string`
  - `function toAuditEventFilters(raw: { agentId?: string; eventType?: string; from?: string; to?: string }): AuditEventFilters`

- [ ] **Step 1: Escribir el test de `toCsv`/`toJson` (falla primero)**

```ts
import { describe, expect, it } from "vitest";
import type { AuditExportRow } from "@/lib/audit";
import { toCsv, toJson } from "./audit-export";

function row(over: Partial<AuditExportRow> = {}): AuditExportRow {
  return {
    id: "evt-1",
    createdAt: "2026-07-19T10:00:00.000Z",
    eventType: "action_blocked",
    eventTypeLabel: "Acción bloqueada",
    agentName: "Agente A",
    actorName: null,
    message: "Mensaje simple",
    metadata: "{}",
    ...over,
  };
}

describe("toCsv", () => {
  it("emite la cabecera en orden estable", () => {
    const csv = toCsv([]);
    expect(csv).toBe(
      "id,createdAt,eventType,eventTypeLabel,agentName,actorName,message,metadata",
    );
  });

  it("una fila normal sin caracteres especiales no se entrecomilla", () => {
    const csv = toCsv([row()]);
    const line = csv.split("\n")[1];
    expect(line).toBe(
      "evt-1,2026-07-19T10:00:00.000Z,action_blocked,Acción bloqueada,Agente A,,Mensaje simple,{}",
    );
  });

  it("entrecomilla y escapa comas, comillas y saltos de línea", () => {
    const csv = toCsv([
      row({
        message: 'texto con "comillas", coma\ny salto',
        metadata: '{"k":"v,v"}',
      }),
    ]);
    const line = csv.split("\n").slice(1).join("\n");
    expect(line).toContain('"texto con ""comillas"", coma\ny salto"');
    expect(line).toContain('"{""k"":""v,v""}"');
  });

  it("null → celda vacía", () => {
    const csv = toCsv([row({ agentName: null, actorName: null })]);
    const cells = csv.split("\n")[1].split(",");
    expect(cells[4]).toBe(""); // agentName
    expect(cells[5]).toBe(""); // actorName
  });
});

describe("toJson", () => {
  it("lista vacía → []", () => {
    expect(toJson([])).toBe("[]");
  });

  it("serializa las filas como array indentado", () => {
    const parsed = JSON.parse(toJson([row()]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("evt-1");
    expect(parsed[0].eventTypeLabel).toBe("Acción bloqueada");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/audit-export.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Escribir `audit-export.ts`**

```ts
import type { AuditExportRow } from "@/lib/audit";

/** Columnas del CSV, en orden estable (coinciden con AuditExportRow). */
const CSV_COLUMNS: readonly (keyof AuditExportRow)[] = [
  "id",
  "createdAt",
  "eventType",
  "eventTypeLabel",
  "agentName",
  "actorName",
  "message",
  "metadata",
];

/** Escapa una celda CSV: la entrecomilla si contiene coma, comilla o salto; duplica comillas internas. */
function csvCell(value: string | null): string {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serializa las filas a CSV con cabecera. Lista vacía → solo la cabecera. */
export function toCsv(rows: AuditExportRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c])).join(","));
  return [header, ...body].join("\n");
}

/** Serializa las filas a JSON indentado. */
export function toJson(rows: AuditExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/audit-export.test.ts`
Expected: PASS.

- [ ] **Step 5: Escribir el test de `toAuditEventFilters` (falla primero)**

Añade a `src/lib/audit.test.ts` (importa `toAuditEventFilters` del mismo módulo):

```ts
describe("toAuditEventFilters", () => {
  it("cadenas vacías o ausentes → sin filtros", () => {
    expect(toAuditEventFilters({})).toEqual({});
    expect(
      toAuditEventFilters({ agentId: "", eventType: "", from: "", to: "" }),
    ).toEqual({});
  });

  it("convierte from/to a límites de día ISO inclusivos", () => {
    expect(
      toAuditEventFilters({ from: "2026-07-19", to: "2026-07-20" }),
    ).toEqual({
      from: "2026-07-19T00:00:00.000Z",
      to: "2026-07-20T23:59:59.999Z",
    });
  });

  it("pasa agentId y eventType tal cual cuando están presentes", () => {
    expect(
      toAuditEventFilters({ agentId: "agt_a", eventType: "action_blocked" }),
    ).toEqual({ agentId: "agt_a", eventType: "action_blocked" });
  });

  it("ignora un eventType que no es un AuditEventType válido", () => {
    expect(toAuditEventFilters({ eventType: "no_existe" })).toEqual({});
  });
});
```

- [ ] **Step 6: Verificar que falla**

Run: `npx vitest run src/lib/audit.test.ts`
Expected: FAIL — `toAuditEventFilters` no exportado.

- [ ] **Step 7: Añadir `toAuditEventFilters` a `src/lib/audit.ts`**

Al final del fichero (usa `auditEventTypeLabel`, ya importado allí, para validar `eventType`):

```ts
/**
 * Convierte los valores de filtro crudos (de la UI o de query params) a
 * `AuditEventFilters` de dominio: descarta cadenas vacías, valida `eventType`
 * contra los tipos conocidos, y expande `from`/`to` a límites de día ISO
 * inclusivos. Fuente única de la conversión, compartida por el timeline y la
 * ruta de exportación.
 */
export function toAuditEventFilters(raw: {
  agentId?: string;
  eventType?: string;
  from?: string;
  to?: string;
}): AuditEventFilters {
  const filters: AuditEventFilters = {};
  if (raw.agentId) filters.agentId = raw.agentId;
  if (raw.eventType && raw.eventType in auditEventTypeLabel) {
    filters.eventType = raw.eventType as AuditEventType;
  }
  if (raw.from) filters.from = `${raw.from}T00:00:00.000Z`;
  if (raw.to) filters.to = `${raw.to}T23:59:59.999Z`;
  return filters;
}
```

- [ ] **Step 8: Verificar que pasa**

Run: `npx vitest run src/lib/audit.test.ts`
Expected: PASS.

- [ ] **Step 9: Refactorizar el timeline para usar el helper**

En `src/components/audit/audit-timeline.tsx`, sustituye la conversión inline de filtros:

```tsx
  const filtered = filterAuditEvents(sorted, {
    agentId: filters.agentId || undefined,
    eventType: filters.eventType || undefined,
    from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
    to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
  });
```

por:

```tsx
  const filtered = filterAuditEvents(sorted, toAuditEventFilters(filters));
```

Y añade `toAuditEventFilters` al import existente desde `@/lib/audit`:

```tsx
import {
  filterAuditEvents,
  getAuditEventById,
  getAuditEvents,
  toAuditEventFilters,
} from "@/lib/audit";
```

- [ ] **Step 10: Verificar suite + build (el refactor del timeline es behavior-preserving)**

Run: `npx vitest run src/lib/audit.test.ts src/lib/audit-export.test.ts && npm run build`
Expected: tests verde, build OK.

- [ ] **Step 11: Formato y commit**

```bash
npx prettier --write src/lib/audit-export.ts src/lib/audit-export.test.ts src/lib/audit.ts src/lib/audit.test.ts src/components/audit/audit-timeline.tsx
git add src/lib/audit-export.ts src/lib/audit-export.test.ts src/lib/audit.ts src/lib/audit.test.ts src/components/audit/audit-timeline.tsx
git commit -m "feat: serialización CSV/JSON del audit log y helper de filtros compartido (fase 13, tarea 108)"
```

---

### Task 2: Route handler `GET /api/audit/export`

**Files:**
- Create: `src/app/api/audit/export/route.ts`
- Test: `src/app/api/audit/export/route.test.ts`

**Interfaces:**
- Consumes: `getCurrentUser` (`@/lib/session-db`), `getAuditEvents` (`@/data/audit`), `getAgents` (`@/data/agents`), `getUsers` (`@/data/users`), `filterAuditEvents`/`getAuditEvents as sortAuditEvents`/`toAuditExportRow`/`toAuditEventFilters` (`@/lib/audit`), `toCsv`/`toJson` (`@/lib/audit-export`).
- Produces: route handler `GET` que devuelve el fichero de export.

> Ojo con el choque de nombres: `@/data/audit` exporta `getAuditEvents` (async, lee BD) y `@/lib/audit` exporta `getAuditEvents` (puro, ordena). Importa el puro con alias: `import { getAuditEvents as sortAuditEvents } from "@/lib/audit"`.

- [ ] **Step 1: Escribir el test de la ruta (falla primero)**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getAuditEventsData = vi.fn();
const getAgents = vi.fn();
const getUsers = vi.fn();

vi.mock("@/lib/session-db", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));
vi.mock("@/data/audit", () => ({
  getAuditEvents: (...a: unknown[]) => getAuditEventsData(...a),
}));
vi.mock("@/data/agents", () => ({
  getAgents: (...a: unknown[]) => getAgents(...a),
}));
vi.mock("@/data/users", () => ({
  getUsers: (...a: unknown[]) => getUsers(...a),
}));

import { GET } from "./route";

function event(over: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    organizationId: "org-1",
    actorUserId: null,
    agentId: "agt-a",
    actionId: null,
    eventType: "action_blocked",
    message: "m",
    metadata: {},
    createdAt: "2026-07-19T10:00:00.000Z",
    ...over,
  };
}

function req(query = ""): Request {
  return new Request(`http://x/api/audit/export${query}`);
}

beforeEach(() => {
  getCurrentUser.mockReset().mockResolvedValue({ id: "u-1", role: "auditor" });
  getAuditEventsData
    .mockReset()
    .mockResolvedValue([
      event(),
      event({
        id: "evt-2",
        agentId: "agt-b",
        createdAt: "2026-07-18T10:00:00.000Z",
      }),
    ]);
  getAgents
    .mockReset()
    .mockResolvedValue([
      { id: "agt-a", name: "Agente A" },
      { id: "agt-b", name: "Agente B" },
    ]);
  getUsers.mockReset().mockResolvedValue([]);
});

describe("GET /api/audit/export", () => {
  it("sin sesión → 401", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("CSV por defecto con Content-Disposition de descarga", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(
      /attachment; filename="audit-log-\d{4}-\d{2}-\d{2}\.csv"/,
    );
    const text = await res.text();
    expect(text.split("\n")[0]).toContain("id,createdAt,eventType");
    expect(text).toContain("Agente A");
  });

  it("filtra por agentId (menos filas)", async () => {
    const res = await GET(req("?agentId=agt-a"));
    const text = await res.text();
    const dataLines = text.split("\n").slice(1).filter(Boolean);
    expect(dataLines).toHaveLength(1);
    expect(text).toContain("Agente A");
    expect(text).not.toContain("Agente B");
  });

  it("format=json → Content-Type JSON y cuerpo array", async () => {
    const res = await GET(req("?format=json"));
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toContain(".json");
    const parsed = JSON.parse(await res.text());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/app/api/audit/export/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Escribir `route.ts`**

```ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-db";
import { getAuditEvents } from "@/data/audit";
import { getAgents } from "@/data/agents";
import { getUsers } from "@/data/users";
import {
  filterAuditEvents,
  getAuditEvents as sortAuditEvents,
  toAuditEventFilters,
  toAuditExportRow,
} from "@/lib/audit";
import { toCsv, toJson } from "@/lib/audit-export";

/**
 * Descarga el registro de auditoría de la organización en CSV (por defecto) o
 * JSON, aplicando los mismos filtros que la UI (agente, tipo, rango de fechas).
 * Requiere sesión, en paridad con la página `/audit`.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "csv";

  const filters = toAuditEventFilters({
    agentId: searchParams.get("agentId") ?? undefined,
    eventType: searchParams.get("eventType") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const [events, agents, users] = await Promise.all([
    getAuditEvents(),
    getAgents(),
    getUsers(),
  ]);

  const rows = filterAuditEvents(sortAuditEvents(events), filters).map((e) =>
    toAuditExportRow(e, { agents, users }),
  );

  const date = new Date().toISOString().slice(0, 10);
  const body = format === "json" ? toJson(rows) : toCsv(rows);
  const contentType =
    format === "json"
      ? "application/json; charset=utf-8"
      : "text/csv; charset=utf-8";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="audit-log-${date}.${format}"`,
    },
  });
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/app/api/audit/export/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Formato y commit**

```bash
npx prettier --write src/app/api/audit/export/route.ts src/app/api/audit/export/route.test.ts
git add src/app/api/audit/export/route.ts src/app/api/audit/export/route.test.ts
git commit -m "feat: route handler de exportación del audit log (CSV/JSON) (fase 13, tarea 108)"
```

---

### Task 3: Enlaces de descarga en la barra de auditoría + kanban

**Files:**
- Create: `src/components/audit/audit-export-links.tsx`
- Modify: `src/components/audit/audit-timeline.tsx` (renderizar los enlaces con los filtros activos)
- Modify: `src/components/audit/audit.module.css` (estilos mínimos de los enlaces, si hace falta)
- Modify: `kanban.html` (marcar tarea 108)

**Interfaces:**
- Consumes: `AuditFilterValues` de `./audit-filters`.
- Produces: `function AuditExportLinks({ filters }: { filters: AuditFilterValues }): JSX.Element`.

- [ ] **Step 1: Crear `audit-export-links.tsx`**

Construye la query string desde los filtros activos (omitiendo vacíos) y ofrece dos enlaces de descarga:

```tsx
import type { AuditFilterValues } from "./audit-filters";
import styles from "./audit.module.css";

/** Construye la query string de export a partir de los filtros activos (omite vacíos). */
function exportQuery(
  filters: AuditFilterValues,
  format: "csv" | "json",
): string {
  const params = new URLSearchParams({ format });
  if (filters.agentId) params.set("agentId", filters.agentId);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

/** Enlaces de descarga del registro de auditoría (CSV/JSON) con los filtros activos. */
export function AuditExportLinks({ filters }: { filters: AuditFilterValues }) {
  return (
    <div className={styles.exportLinks}>
      <a
        className={styles.exportLink}
        href={`/api/audit/export?${exportQuery(filters, "csv")}`}
        download
      >
        Exportar CSV
      </a>
      <a
        className={styles.exportLink}
        href={`/api/audit/export?${exportQuery(filters, "json")}`}
        download
      >
        Exportar JSON
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Renderizar los enlaces en el timeline**

En `src/components/audit/audit-timeline.tsx`, importa el componente y renderízalo junto a `<AuditFilters .../>` en el `timelinePane` (tiene acceso al estado `filters`):

```tsx
import { AuditExportLinks } from "./audit-export-links";
```

Justo tras `<AuditFilters agents={agents} values={filters} onChange={setFilters} />`:

```tsx
        <AuditExportLinks filters={filters} />
```

- [ ] **Step 3: Estilos mínimos en `audit.module.css`**

Añade (ajusta a los tokens/patrones existentes del fichero; usa variables de `tokens.css` si el módulo ya las usa):

```css
.exportLinks {
  display: flex;
  gap: var(--space-2, 8px);
  margin-block: var(--space-3, 12px);
}

.exportLink {
  font-size: 13px;
  color: var(--color-text-secondary, inherit);
  text-decoration: underline;
}

.exportLink:hover {
  color: var(--color-text-primary, inherit);
}
```

- [ ] **Step 4: Verificar build (componente client, sin test unitario propio)**

Run: `npm run build`
Expected: build OK. Los enlaces aparecen en `/audit` con los filtros activos como query params.

- [ ] **Step 5: Marcar la tarea 108 en el kanban**

En `kanban.html`, añade `108` a la lista de tareas hechas de la Fase 13 (mismo patrón que 109/110/111/112):

```
108, // Fase 13 (tarea 108 ✔ exportación real del audit log)
```

- [ ] **Step 6: Suite completa + build + formato**

```bash
npx prettier --write src/components/audit/audit-export-links.tsx src/components/audit/audit-timeline.tsx src/components/audit/audit.module.css
npm test
npm run build
npx prettier --check "src/**/*.ts" "src/**/*.tsx"
```
Expected: tests verde, build OK, prettier limpio.

- [ ] **Step 7: Commit**

```bash
git add src/components/audit/audit-export-links.tsx src/components/audit/audit-timeline.tsx src/components/audit/audit.module.css kanban.html
git commit -m "feat: enlaces de descarga CSV/JSON en la barra de auditoría (fase 13, tarea 108)"
```

---

## Self-Review (cobertura del spec)

- **`audit-export.ts` (toCsv/toJson) puro** → Task 1. ✅
- **Escape CSV correcto (comas/comillas/saltos, null→vacío, lista vacía→cabecera)** → Task 1 tests. ✅
- **Helper de filtros compartido UI↔ruta (`toAuditEventFilters`)** → Task 1 (materializa el "idéntico a la UI" del spec sin duplicar la conversión de fechas). ✅
- **Route handler `GET /api/audit/export` (auth, format, filtros, Content-Disposition)** → Task 2. ✅
- **Reutiliza `filterAuditEvents`/`toAuditExportRow`** → Task 2. ✅
- **UI: enlaces CSV/JSON con filtros activos** → Task 3. ✅
- **Kanban 108** → Task 3. ✅
- **Fuera de alcance (streaming, PDF/XLSX, firma, programados, rol distinto)** → sin tareas. ✅

## Desviaciones conscientes del spec

- El spec menciona la conversión de filtros como reutilización de `filterAuditEvents`;
  el plan la formaliza en un helper `toAuditEventFilters` en `@/lib/audit` y
  refactoriza el timeline para usarlo, de modo que UI y ruta comparten **también**
  la expansión de `from`/`to` a límites de día (hoy inline en el timeline). Es DRY,
  sin cambio de comportamiento observable en la UI.
