# Estructura de Aplicación

## Objetivo

Definir cómo se organizará AgentGuard en Next.js antes de crear el proyecto. Esta estructura debe permitir construir el MVP con orden, componentes reutilizables y datos simulados desde el primer día.

## Principios

- Separar rutas, componentes, datos y lógica de dominio.
- Mantener el dashboard y las pantallas operativas dentro de un mismo shell.
- Diseñar para datos reales, aunque el MVP empiece con datos simulados.
- Evitar pantallas aisladas que no compartan sistema visual.
- Mantener rutas claras y predecibles.

## Rutas del MVP

```text
/
/review
/review/[actionId]
/agents
/agents/[agentId]
/policies
/policies/[policyId]
/audit
/settings
```

## Descripción de rutas

### `/`

Dashboard operativo.

Debe mostrar:

- Acciones pendientes.
- Agentes activos.
- Riesgo agregado.
- Políticas activadas recientemente.
- Actividad reciente.

### `/review`

Cola de revisión.

Debe mostrar:

- Lista priorizada de acciones.
- Filtros por riesgo, agente, herramienta y estado.
- Panel de detalle en desktop.
- Vista completa de detalle en móvil.

### `/review/[actionId]`

Detalle de una acción.

Uso:

- Vista dedicada en móvil.
- En desktop puede convivir con panel lateral desde `/review`.
- URL compartible para revisión o auditoría.

### `/agents`

Inventario de agentes.

Debe mostrar:

- Estado.
- Modo.
- Propietario.
- Riesgo reciente.
- Actividad reciente.

### `/agents/[agentId]`

Detalle de agente.

Debe mostrar:

- Identidad.
- Permisos.
- Herramientas.
- Políticas aplicadas.
- Acciones recientes.
- Errores de integración.

### `/policies`

Listado y gestión de políticas.

Debe mostrar:

- Políticas activas.
- Borradores.
- Impacto reciente.
- Estado de publicación.

### `/policies/[policyId]`

Detalle y edición simple de política.

Debe mostrar:

- Condiciones.
- Efecto.
- Versión.
- Acciones recientes afectadas.
- Historial básico de publicación.

### `/audit`

Registro de auditoría.

Debe mostrar:

- Línea temporal.
- Filtros.
- Búsqueda.
- Detalle de evento.
- Enlaces a acción, agente o política relacionada.

### `/settings`

Ajustes mínimos del MVP.

Debe mostrar:

- Usuarios.
- Roles.
- Herramientas simuladas.
- Entorno de demo.

## Estructura de carpetas propuesta

```text
src/
  app/
    layout.tsx
    page.tsx
    review/
      page.tsx
      [actionId]/
        page.tsx
    agents/
      page.tsx
      [agentId]/
        page.tsx
    policies/
      page.tsx
      [policyId]/
        page.tsx
    audit/
      page.tsx
    settings/
      page.tsx

  components/
    app-shell/
    data-display/
    feedback/
    forms/
    navigation/
    review/
    agents/
    policies/
    audit/

  data/
    seed/
    demo-data.ts

  domain/
    actions/
    agents/
    audit/
    policies/
    permissions/

  lib/
    format.ts
    filters.ts
    navigation.ts
    risk.ts
    status.ts

  styles/
    globals.css
    tokens.css
```

## Componentes por carpeta

### `components/app-shell`

- `AppShell`
- `Sidebar`
- `TopBar`
- `MobileNav`
- `PageHeader`

### `components/data-display`

- `DataTable`
- `StatusPill`
- `RiskBadge`
- `Timeline`
- `MetricLine`

### `components/feedback`

- `EmptyState`
- `InlineAlert`
- `SkeletonBlock`
- `ErrorState`

### `components/forms`

- `Button`
- `TextInput`
- `SelectField`
- `SegmentedControl`
- `Toggle`
- `Textarea`

### `components/review`

- `ActionQueue`
- `ActionQueueItem`
- `ActionDetailPanel`
- `ApprovalActions`
- `PolicyMatch`

### `components/agents`

- `AgentList`
- `AgentStatus`
- `AgentPermissions`
- `AgentActivity`

### `components/policies`

- `PolicyList`
- `PolicySummary`
- `PolicyConditions`
- `PolicyImpact`

### `components/audit`

- `AuditTimeline`
- `AuditFilters`
- `AuditEventDetail`

## Dominio

La carpeta `domain` concentra tipos, validaciones ligeras y funciones específicas del producto.

Ejemplos:

- `domain/actions`: estados, transiciones, acciones permitidas.
- `domain/policies`: evaluación simulada y explicación de políticas.
- `domain/risk`: cálculo o traducción de niveles de riesgo.
- `domain/audit`: construcción de eventos legibles.

## Datos simulados

El MVP debe arrancar con datos locales en `src/data/demo-data.ts`.

Debe incluir:

- Organización demo.
- Usuarios por rol.
- Agentes.
- Herramientas.
- Políticas.
- Acciones.
- Aprobaciones.
- Eventos de auditoría.

Regla:

- Los datos simulados deben parecer reales, no ejemplos vacíos.
- Los nombres deben ayudar a entender el flujo.
- Debe haber variedad de estados, riesgos y herramientas.

## Estado y filtros

Para el MVP:

- Filtros simples en cliente.
- Estado local por pantalla.
- Sin estado global complejo salvo necesidad clara.
- URLs compartibles para detalles importantes.

## API interna

Primera fase:

- Sin API real obligatoria.
- Datos simulados importados desde módulos.
- Funciones de dominio puras para evaluar políticas y estados.

Fase posterior:

- API routes para acciones, agentes, políticas y auditoría.
- Prisma conectado a PostgreSQL.
- Sustitución progresiva de datos simulados por consultas reales.

## Rutas protegidas

En el MVP inicial podemos simular un usuario activo.

Después:

- Middleware de autenticación.
- Control por rol.
- Redirección a login.
- Estados de acceso denegado.

## Convenciones de naming

- Rutas en inglés, claras y cortas.
- UI visible en castellano.
- Tipos de dominio en inglés para mantener consistencia técnica.
- Commits en español después del tipo.

Ejemplo:

- Ruta: `/review`
- Componente: `ActionQueue`
- Copy visible: "Cola de revisión"

## Primer incremento de código

Cuando generemos el proyecto, el primer incremento debe incluir:

- Next.js con TypeScript.
- Estructura de carpetas.
- Tokens CSS.
- AppShell.
- Navegación.
- Dashboard estático con datos demo.
- Estados vacíos y skeletons mínimos.

## Criterios de aceptación

La estructura será válida si:

- Todas las pantallas del MVP tienen una ruta clara.
- Los componentes compartidos no dependen de una pantalla concreta.
- Los datos simulados pueden alimentar dashboard, revisión, agentes y auditoría.
- El sistema visual puede aplicarse desde `tokens.css`.
- La app puede evolucionar hacia Prisma sin reescribir toda la interfaz.
