# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es AgentGuard

Plano de control SaaS para empresas que usan agentes de IA. Permite visibilidad, aprobación y auditoría de cada acción que un agente propone o ejecuta.

AgentGuard **empieza como un MVP funcional y termina como un producto completo y totalmente funcional**. Esa trayectoria es intencional: el MVP (primera versión) valida el flujo con datos simulados; a partir de ahí evoluciona hasta una aplicación de extremo a extremo con persistencia real (PostgreSQL + Prisma), autenticación con control por rol e integraciones reales. Framework base: Next.js + TypeScript.

Las "fases" del roadmap son un camino de entrega hacia ese producto completo, no un techo de alcance.

## Estado actual del repo

Todavía **no existe código**: el repositorio contiene solo documentación de producto/diseño (`README.md` + `docs/`). El primer paso de implementación es andamiar el proyecto Next.js en la rama `feature/setup-proyecto`. Toda la estructura descrita abajo (`src/…`) es el objetivo a crear, no algo existente.

## Documentación fuente

El detalle vive en `docs/`; CLAUDE.md solo resume. Consultar antes de implementar cada área:

| Doc | Cuándo leerlo |
|---|---|
| `docs/PRODUCT.md` | Problema, usuarios objetivo, pilares |
| `docs/WORKFLOW.md` | Fases de construcción del producto |
| `docs/UX_ARCHITECTURE.md` | Roles, flujos, IA, modelo de estados |
| `docs/DATA_MODEL.md` | Entidades, campos y relaciones completas |
| `docs/APP_STRUCTURE.md` | Detalle de cada ruta y carpeta |
| `docs/ROADMAP.md` | Pasos atómicos hasta el producto completo |
| `docs/FEATURES.md` | Funcionalidades de control y velocidad del producto |
| `docs/DESIGN.md` + `docs/DESIGN_SYSTEM.md` | Dirección visual y tokens OKLCH |
| `docs/TECHNICAL.md` | Razón del stack |
| `docs/GIT_WORKFLOW.md` | Ramas, commits, protección de `main` |

## Stack

- **Framework**: Next.js con App Router, TypeScript estricto
- **Base de datos** (fase 2): PostgreSQL + Prisma
- **Estilos**: CSS custom con tokens en `src/styles/tokens.css`
- **Estado**: local por pantalla, sin estado global salvo necesidad clara
- **Datos (fase inicial)**: módulos simulados en `src/data/demo-data.ts`

## Comandos

*(El proyecto aún no existe. Al crear el proyecto Next.js, documentar aquí `dev`, `build`, `lint` y cómo correr un test aislado.)*

## Estructura de carpetas

```
src/
  app/             # Rutas Next.js App Router
  components/      # Agrupados por dominio: app-shell, data-display, feedback, forms, review, agents, policies, audit
  data/            # Datos simulados (seed, demo-data.ts)
  domain/          # Tipos y lógica pura: actions, agents, audit, policies, permissions, risk
  lib/             # Utilidades: format.ts, filters.ts, navigation.ts, risk.ts, status.ts
  styles/          # globals.css, tokens.css
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

Fases incrementales; respetar el orden al implementar. El detalle está en `docs/ROADMAP.md` como pasos atómicos (uno por commit):

0. Base del proyecto: scaffolding Next.js, tokens, tipos de dominio, datos semilla.
1. Shell y navegación.
2. Dashboard.
3. Inventario de agentes.
4. Revisión de acciones.
5. Capa de políticas (evaluación simulada).
6. Auditoría.
7. Ajustes.
8. Pulido: responsive, accesibilidad, motion, estados de error, copy, datos realistas.

## Modelo de datos

Entidades principales: `Organization → User, Agent, Tool, Permission, Policy, AgentAction, Approval, AuditEvent, Notification, ActionComment`.

Estados de `AgentAction`: `proposed → allowed | blocked | needs_approval → approved | rejected | changes_requested | escalated → executed | failed`.

Ver `docs/DATA_MODEL.md` para campos completos y relaciones.

## Sistema visual

Tokens en `src/styles/tokens.css`. Colores en OKLCH. Primario: `oklch(0.580 0.170 8)` (rojo). El color primario se usa con intención: acciones principales, riesgo alto, identidad de marca, nunca como fondo general.

Escala tipográfica: 12 → 13 → 14 → 16 → 20 → 24 → 30px. Familia: Inter. Espaciado base 4px.

Reglas duras del diseño:
- Sin tarjetas anidadas.
- Sin gradientes morados.
- Sin modales si un panel resuelve la tarea.
- Sin tabla sin estado vacío.

Cada feature debe incluir estado vacío, estado de carga, estado de error y layout responsive.

El movimiento aclara cambios de estado, no entretiene. Hay skills locales de animación/diseño en `.agents/skills/` (`animation-vocabulary`, `emil-design-eng`, `review-animations`); usarlas al construir o revisar motion.

## Convenciones de naming

- Rutas en inglés (App Router).
- Copy visible en castellano.
- Tipos de dominio en inglés.
- Commits en español después del tipo convencional (`feat:`, `fix:`, `style:`, etc.).

## Git

Trabajo en ramas enfocadas (`feature/`, `bugfix/`, `hotfix/`). Sin commits directos a `main`. PRs obligatorias con capturas para cambios de UI.

Ejemplos de rama: `feature/setup-proyecto`, `feature/dashboard-control`, `feature/revision-acciones`.
