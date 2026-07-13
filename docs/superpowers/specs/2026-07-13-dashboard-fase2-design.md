# Fase 2 — Dashboard (spec de diseño)

Fecha: 2026-07-13
Rama: `feature/dashboard`
Roadmap: pasos 21–27 (`docs/ROADMAP.md`)

## Objetivo

Convertir `/` de placeholder a dashboard operativo: resumen del estado del
sistema en cuatro bloques, con estados de carga y vacío, sobre los datos
simulados (`src/data/demo-data.ts`). Sin persistencia ni interacción de
escritura; es una vista de solo lectura.

## Alcance

Incluye:

- Ruta `/` con layout de dashboard (paso 21).
- Bloque de acciones pendientes (22).
- Bloque de agentes activos (23).
- Bloque de riesgo agregado (24).
- Bloque de políticas activadas recientemente (25).
- Estado vacío por bloque (26).
- Estado de carga con esqueleto (27).
- Componente `CountUp` estilo reactbits en las métricas (petición del usuario).

No incluye (fases posteriores): cola de revisión, detalle de acción,
inventario de agentes, edición de políticas, parada de emergencia,
persistencia real.

## Arquitectura

Composición sobre las primitivas ya construidas en fase 2:

- `DashboardBlock` (`src/components/dashboard/dashboard-block.tsx`) — contenedor
  de un solo nivel (sin tarjetas anidadas) con título, acción opcional y cuerpo.
- `dashboard.module.css` — grid 2→1 columnas responsive, filas, métricas.
- `PageHeader` (`src/components/app-shell/page-header.tsx`).
- `formatRelativeTime` / `isOverdue` (`src/lib/format.ts`), `demoNow`.

### `app/page.tsx` — Server Component

Lee `demoData`, deriva los datos de cada bloque con el selector puro y pinta
`PageHeader` + `.grid` de cuatro `DashboardBlock`. Sin estado ni cliente; los
únicos islands cliente son los `CountUp` embebidos en las métricas.

### `src/lib/dashboard.ts` — selector puro

Funciones puras (sin React) que derivan del seed lo que consume la vista.
Testeable en aislamiento.

- `isPendingReview(status: ActionStatus): boolean` — verdadero para
  `needs_approval | proposed | escalated` (acciones a la espera de decisión
  humana). Excluye `allowed | blocked | approved | rejected |
  changes_requested | executed | failed`.
- `getPendingActions(actions): AgentAction[]` — filtradas por
  `isPendingReview`, ordenadas por riesgo desc y luego por `createdAt` asc
  (las más urgentes y antiguas primero).
- `getActiveAgents(agents): Agent[]` — `status === "active"`.
- `getRiskBreakdown(pending): Record<RiskLevel, number>` — conteo de las
  acciones pendientes por nivel de riesgo.
- `getRecentPolicies(policies): Policy[]` — `status === "active"`, ordenadas
  por `publishedAt` desc, top 4. "Activadas recientemente" = políticas que
  pasaron a activas (por `publishedAt`), no "disparadas por acciones".

Cobertura en `src/lib/dashboard.test.ts`: filtro de pendientes, orden, conteo
por nivel, orden y recorte de políticas.

## Bloques

1. **Acciones pendientes.** Filas (`.row` enlazadas a `/review/[id]`): título de
   la acción, agente + tiempo relativo, `RiskBadge`, badge "Vencida" si
   `isOverdue(approvalDueAt)`. Acción del bloque: enlace "Ver cola →" a
   `/review`. Vacío: "No hay acciones pendientes de revisión."

2. **Agentes activos.** Métrica grande con `CountUp` del número de agentes
   activos + lista breve de esos agentes con punto de estado. Acción: enlace a
   `/agents`. Vacío: "No hay agentes activos."

3. **Riesgo agregado.** Métrica destacada: nº de acciones pendientes de riesgo
   alto o crítico (con `CountUp`), y debajo el desglose por nivel
   (crítico/alto/medio/bajo) con su conteo (`CountUp`). Vacío (sin pendientes):
   "Sin riesgo pendiente."

4. **Políticas activadas recientemente.** Filas: nombre, efecto (etiqueta en
   castellano), tiempo relativo desde `publishedAt`. Acción: enlace a
   `/policies`. Vacío: "No hay políticas activas."

## Piezas reutilizables nuevas

Se usan aquí y se reutilizan en fases 3–5.

- `src/components/data-display/count-up.tsx` — **client component**. Anima un
  número de 0 al valor final al montar. `requestAnimationFrame` + easing
  easeOut, duración corta (~600–800 ms, a fijar con las skills de animación).
  Honra `prefers-reduced-motion`: si está activo, muestra el valor final sin
  animar. Props: `value: number`, opcionalmente `durationMs`. Renderiza un
  `<span>`. Adaptación nativa del patrón CountUp de reactbits.dev (sin añadir
  framer-motion ni otras dependencias).
- `src/components/data-display/risk-badge.tsx` — pill de nivel de riesgo usando
  `riskLevelLabel`. Color por nivel con los tokens OKLCH (crítico/alto tiran
  del primario; medio/bajo, neutros).
- `src/components/feedback/empty-state.tsx` — título + pista breve; se pinta en
  el cuerpo de un bloque cuando su lista está vacía.

## Estados

- **Carga.** `app/loading.tsx` — esqueleto de la grid que refleja el layout de
  los cuatro bloques. Convención de Next; con datos síncronos casi no se ve
  ahora, pero queda listo para datos reales (fase 10).
- **Vacío.** Condicional por bloque vía `EmptyState`. Cada bloque decide su
  vacío según su propia lista/métrica.
- **Error.** No aplica en esta fase (datos locales síncronos; sin fetch que
  falle). Se aborda al llegar la persistencia.

## Motion

Antes de implementar `CountUp` consultar las skills locales
`animation-vocabulary` y `emil-design-eng` para fijar duración y easing. El
movimiento debe aclarar que el valor se asienta, no decorar. Regla dura del
proyecto: "el movimiento aclara cambios de estado, no entretiene".

## Responsive

`.grid` ya colapsa de 2 a 1 columna en `max-width: 900px`. Verificar que filas,
métricas y badges se leen bien en pantalla estrecha.

## Testing

- `src/lib/dashboard.test.ts` — selector puro (Vitest), casos: filtro de
  pendientes por estado, orden por riesgo/fecha, desglose por nivel, orden y
  top-4 de políticas.
- `CountUp` y los bloques son de composición visual; se verifican en navegador
  (`npm run dev`) más que con test unitario.

## Entrega

Rama `feature/dashboard`. Commits pequeños, uno por paso del roadmap (21→27)
más el commit de `CountUp`. Un PR al cerrar. Al mergear, marcar la fase 2 como
completada en `kanban.html` (convenio del proyecto).
