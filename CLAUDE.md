# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es AgentGuard

Plano de control SaaS para empresas que usan agentes de IA. Permite visibilidad, aprobación y auditoría de cada acción que un agente propone o ejecuta.

AgentGuard **empieza como un MVP funcional y termina como un producto completo y totalmente funcional**. Esa trayectoria es intencional: el MVP (primera versión) valida el flujo con datos simulados; a partir de ahí evoluciona hasta una aplicación de extremo a extremo con persistencia real (PostgreSQL + Prisma), autenticación con control por rol e integraciones reales. Framework base: Next.js + TypeScript.

Las "fases" del roadmap son un camino de entrega hacia ese producto completo, no un techo de alcance.

## Estado actual del repo

Las 13 fases de `docs/ROADMAP.md` están completadas: la aplicación funciona de extremo a extremo con PostgreSQL + Prisma, login con sesión JWT y control por rol, ingesta de acciones por API con clave por agente, evaluación de políticas, ejecución con reintentos, auto-escalado por SLA, notificaciones (in-app, email, Slack), exportación de auditoría, logs estructurados y CI obligatoria. El trabajo pendiente es evolutivo (nuevas integraciones, pulido), no de construcción.

## Documentación fuente

El detalle vive en `docs/`; CLAUDE.md solo resume. Consultar antes de implementar cada área:

| Doc | Cuándo leerlo |
|---|---|
| `docs/PRODUCT.md` | Problema, usuarios objetivo, pilares |
| `docs/UX_ARCHITECTURE.md` | Roles, flujos, IA, modelo de estados |
| `docs/DATA_MODEL.md` | Entidades, campos y relaciones completas |
| `docs/APP_STRUCTURE.md` | Detalle de cada ruta y carpeta |
| `docs/ROADMAP.md` | Pasos atómicos de las 13 fases (histórico de construcción) |
| `docs/FEATURES.md` | Funcionalidades de control y velocidad del producto |
| `docs/design/IDENTITY.md` + `docs/DESIGN_SYSTEM.md` | Dirección visual vigente y tokens OKLCH |
| `docs/design/BRIEF.md` | Qué interrumpe de verdad al usuario; base de toda decisión visual |
| `docs/DEPLOY.md` | Variables de entorno, crons y orden de despliegue |
| `docs/TECHNICAL.md` | Razón del stack |
| `docs/GIT_WORKFLOW.md` | Ramas, commits, protección de `main` |
| `docs/WORKFLOW.md`, `docs/DESIGN.md` | Documentos fundacionales; describen intenciones iniciales, no el estado actual |

## Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions), TypeScript estricto.
- **Base de datos**: PostgreSQL + Prisma 7. Esquema en `prisma/schema.prisma`, migraciones en `prisma/migrations/`, seed en `prisma/seed.ts`.
- **Auth**: sesión JWT HS256 (`jose`) en cookie; contraseñas con `bcryptjs`; claves de API por agente (hash en BD, token mostrado una vez).
- **Estilos**: CSS Modules con tokens en `src/styles/tokens.css`. Sin librería de componentes ni de iconos.
- **Estado**: local por pantalla, sin estado global salvo necesidad clara.
- **Tests**: Vitest; Prisma se mockea, los tests no tocan BD.
- **Entorno**: variables documentadas en `.env.example`; `.env` nunca se commitea.

## Comandos

- `npm run dev` — servidor de desarrollo (http://localhost:3000).
- `npm run build` — build de producción.
- `npm start` — sirve el build de producción.
- `npm run lint` — ESLint (config `eslint-config-next`).
- `npm run format` / `npm run format:check` — Prettier.
- `npm test` — Vitest en modo run (una pasada).
- `npm run test:watch` — Vitest en watch.
- Test aislado: `npx vitest run src/domain/action.test.ts` (o `npx vitest run -t "nombre del test"`).

## Estructura de carpetas

```
src/
  app/
    (app)/         # Pantallas autenticadas: dashboard, review, agents, policies, audit, settings
    (auth)/        # Login
    api/           # agent/actions (ingesta), audit/export, cron/escalate, cron/retry-executions
  components/      # Por dominio: app-shell, dashboard, review, agents, policies, audit, settings, data-display, feedback
  data/            # Capa de acceso a datos (Prisma → tipos de dominio); demo-data.ts alimenta el seed
  domain/          # Tipos puros: action, agent, policy, user, audit, notification, risk…
  lib/             # Lógica de servidor: auth/, ingest/, execution/, notify/, observability/, policy-eval, review-actions…
  middleware.ts    # Protección de rutas
  styles/          # globals.css, tokens.css
prisma/            # schema, migrations, seed
scripts/           # create-agent-key.ts
```

## Rutas del producto

| Ruta | Propósito |
|---|---|
| `/` | Dashboard operativo |
| `/review` | Cola de revisión con panel lateral |
| `/review/[actionId]` | Detalle de acción (URL compartible) |
| `/agents` | Inventario de agentes |
| `/agents/[agentId]` | Detalle de agente |
| `/policies` | Gestión de políticas |
| `/policies/[policyId]` | Detalle y edición de política |
| `/audit` | Registro de auditoría |
| `/settings` | Usuarios, roles y herramientas |

## Roles de usuario

La UX está guiada por cuatro roles (detalle en `docs/UX_ARCHITECTURE.md`, valores en `User.role`):

- **Administrador** (`admin`): configura la organización, conecta agentes, define permisos y políticas.
- **Revisor** (`reviewer`): aprueba, rechaza o escala acciones; necesita riesgo y contexto en segundos.
- **Auditor** (`auditor`): consulta actividad histórica, evidencias y cambios de configuración.
- **Desarrollador** (`developer`): integra agentes y herramientas; consulta payloads y errores de integración.

## Orden de construcción (roadmap)

El producto se construyó en 13 fases incrementales (detalle en `docs/ROADMAP.md`, un paso por commit): 0 base → 1 shell → 2 dashboard → 3 agentes → 4 revisión → 5 políticas → 6 auditoría → 7 ajustes → 8 pulido → 9 control y velocidad (kill switch, SLA, lote, ⌘K, notificaciones, comentarios) → 10 persistencia real → 11 auth y roles → 12 integraciones reales → 13 producción. Todas completadas; el roadmap sirve como mapa de dónde vive cada cosa, no como lista de pendientes.

## Modelo de datos

Entidades principales: `Organization → User, Agent, Tool, Permission, Policy, AgentAction, Approval, AuditEvent, Notification, ActionComment`.

Estados de `AgentAction`: `proposed → allowed | blocked | needs_approval → approved | rejected | changes_requested | escalated → executed | failed`.

Ver `docs/DATA_MODEL.md` para campos completos y relaciones.

## Sistema visual

La dirección vigente está en `docs/design/IDENTITY.md` (sustrato claro, tinta azulada, Archivo para display e IBM Plex Sans/Mono para texto y datos) y los valores en `src/styles/tokens.css`, en OKLCH con nombres semánticos. Tesis: el color no describe, interrumpe; la jerarquía la sostienen tipografía, peso y espacio. Antes de tocar color o tipografía, leer IDENTITY.md y el brief; no introducir valores fuera de tokens.

Reglas duras del diseño:
- Sin tarjetas anidadas.
- Sin gradientes morados.
- Sin modales si un panel resuelve la tarea.
- Sin tabla sin estado vacío.
- Sin colores hardcodeados en CSS Modules: todo color pasa por tokens.

Cada feature debe incluir estado vacío, estado de carga, estado de error y layout responsive.

El movimiento aclara cambios de estado, no entretiene. Duraciones y curvas en tokens; respetar `prefers-reduced-motion`.

## Convenciones de naming

- Rutas en inglés (App Router).
- Copy visible en castellano.
- Tipos de dominio en inglés.
- Commits en español después del tipo convencional (`feat:`, `fix:`, `style:`, etc.).

## Git

Trabajo en ramas enfocadas (`feature/`, `bugfix/`, `hotfix/`). Sin commits directos a `main`. PRs obligatorias con capturas para cambios de UI.

Ejemplos de rama: `feature/setup-proyecto`, `feature/dashboard-control`, `feature/revision-acciones`.

## graphify

Este proyecto tiene un grafo de conocimiento en `graphify-out/` con nodos
principales, estructura de comunidades y relaciones entre archivos.

Reglas:
- Para preguntas sobre el código, ejecuta primero `graphify query "<pregunta>"` si existe `graphify-out/graph.json`. Usa `graphify path "<A>" "<B>"` para relaciones y `graphify explain "<concepto>"` para conceptos concretos. Devuelven un subgrafo acotado, normalmente mucho más pequeño que `GRAPH_REPORT.md` o la salida de grep.
- Si existe `graphify-out/wiki/index.md`, úsalo para navegación general en lugar de explorar el código fuente directamente.
- Lee `graphify-out/GRAPH_REPORT.md` solo para revisión amplia de arquitectura, o cuando query/path/explain no den suficiente contexto.
- Después de modificar código, ejecuta `graphify update .` para mantener el grafo actualizado (solo AST, sin coste de API).
- Si `graphify-out/` no existe, ejecuta `graphify update .` para generarlo. No está versionado: cada quien genera el suyo en local.