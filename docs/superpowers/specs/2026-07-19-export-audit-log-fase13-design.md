# Diseño — Fase 13 · Tarea 108: Exportación real del registro de auditoría

**Fecha:** 2026-07-19
**Fase:** 13 (Preparación para producción)
**Tarea del roadmap:** 108 — «Implementar la exportación real del registro de auditoría.»

## Contexto

Última tarea de la fase 13 (tras 111 CI, 112 observabilidad, 110 reintentos y
109 notificaciones).

La página `/audit` carga todos los eventos de la organización server-side y los
filtra client-side en `AuditTimeline` (agente, tipo de evento, rango de fechas).
**Hoy no existe exportación de ningún tipo** — ni botón ni ruta. "Real" se refiere
a que, con persistencia real ya en marcha, se implementa la descarga de verdad.

El terreno ya está preparado por fases previas (en `src/lib/audit.ts`):

- `filterAuditEvents(events, filters)` — filtro puro combinable (agente, tipo,
  from, to), **el mismo que usa el timeline**. La exportación lo reutiliza → sin
  duplicar lógica de filtrado.
- `AuditExportRow` — fila plana (`id, createdAt, eventType, eventTypeLabel,
  agentName, actorName, message, metadata`) con nombres de agente/actor ya
  resueltos y `metadata` como JSON string.
- `toAuditExportRow(event, { agents, users })` — mapea un `AuditEvent` a esa fila.
  Comentado explícitamente como "lista para una futura exportación (CSV/JSON)".

Por tanto la tarea 108 solo añade: serialización (CSV/JSON), la ruta de descarga
y el botón en la UI.

## Objetivo

El usuario puede descargar el registro de auditoría (completo o filtrado por lo
que ve) en CSV o JSON, mediante una descarga nativa del navegador con cabeceras
HTTP correctas.

## Arquitectura

Reutiliza `filterAuditEvents`, `AuditExportRow` y `toAuditExportRow`. Añade tres
piezas.

### 1. `src/lib/audit-export.ts` (puro, testeable sin I/O)

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

/** Escapa un valor CSV: entre comillas si contiene coma, comilla o salto; comillas internas duplicadas. */
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
  const body = rows.map((row) =>
    CSV_COLUMNS.map((col) => csvCell(row[col])).join(","),
  );
  return [header, ...body].join("\n");
}

/** Serializa las filas a JSON indentado. */
export function toJson(rows: AuditExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}
```

Nota: todos los campos de `AuditExportRow` son `string` o `string | null`
(`agentName`/`actorName` pueden ser null); `csvCell` normaliza null a cadena
vacía.

### 2. Route handler `GET /api/audit/export`

`src/app/api/audit/export/route.ts`.

- **Auth:** `getCurrentUser()`; sin sesión → `401`. Paridad con la página
  `/audit`, que no aplica gate de rol adicional. No se re-gatea por rol más
  estricto que la propia página que ya muestra estos datos.
- **Query params:**
  - `format`: `csv` (default) | `json`. Valor desconocido → se trata como `csv`.
  - Filtros (opcionales, misma semántica que la UI): `agentId`, `eventType`,
    `from`, `to`.
- **Cuerpo:**
  1. Carga en paralelo `getAuditEvents()`, `getAgents()`, `getUsers()`.
  2. Aplica `filterAuditEvents(events, filters)` — idéntico a la UI. `eventType`
     se pasa solo si es un `AuditEventType` válido (si no, se ignora ese filtro).
  3. Ordena por fecha descendente (más recientes primero, como el timeline)
     reutilizando `getAuditEvents` de `@/lib/audit`.
  4. Mapea con `toAuditExportRow` y serializa con `toCsv`/`toJson`.
- **Respuesta:** `new NextResponse(body, { headers })` con:
  - `Content-Type`: `text/csv; charset=utf-8` o `application/json; charset=utf-8`.
  - `Content-Disposition`: `attachment; filename="audit-log-YYYY-MM-DD.{csv,json}"`
    (fecha = hoy, `toISOString().slice(0,10)`).

### 3. UI — botón de descarga en la barra de auditoría

En la barra de filtros de auditoría (`AuditFilters` / cabecera de la página),
dos enlaces de descarga: "Exportar CSV" y "Exportar JSON". Construyen un
`href` a `/api/audit/export` con los filtros actuales serializados a query
params + `format`. Son `<a href download>` (o navegación normal; el
`Content-Disposition` fuerza la descarga), no `fetch` — así el navegador
gestiona la descarga sin blobs en memoria.

Detalle: los enlaces reflejan los filtros activos del timeline. Si el filtrado
vive en el estado client del timeline, los enlaces de export deben leer ese
mismo estado (el plan decidirá si el botón vive dentro de `AuditTimeline`, que
ya tiene el estado de filtros, o si se eleva el estado). Preferencia: colocar
los enlaces donde ya vive el estado de filtros para no elevarlo.

## Testing

- **`toCsv`** (puro): cabecera correcta y en orden; escape de coma/comilla/salto
  en `message` y `metadata`; comillas internas duplicadas; `null` → celda vacía;
  lista vacía → solo cabecera.
- **`toJson`** (puro): array con los campos esperados; lista vacía → `[]`.
- **Route handler:** 401 sin sesión; con sesión y `format=csv` → status 200,
  `Content-Type` text/csv, `Content-Disposition` con `.csv` y fecha; filtros de
  query aplicados (menos filas que sin filtro); `format=json` → `Content-Type`
  JSON. Prisma/`getCurrentUser` mockeados.

## Fuera de alcance

- Export asíncrono/paginado o streaming para logs muy grandes.
- Formatos adicionales (PDF, Excel/XLSX).
- Firma o hash del export para cadena de custodia.
- Exports programados/recurrentes.
- Gate de export por rol distinto al de la página de auditoría.

## Variables de entorno

Ninguna nueva.

## Consistencia con el resto del sistema

- Reutiliza el filtro puro `filterAuditEvents` (UI y export comparten lógica).
- Reutiliza `AuditExportRow`/`toAuditExportRow` ya definidos para esto.
- Auth por sesión (`getCurrentUser`), como el resto de rutas de usuario.
- Copy visible en castellano; nombres de columna del CSV en inglés (son claves
  de datos, no copy de UI).
