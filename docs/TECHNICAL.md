# Notas Técnicas

## Stack elegido

Para un producto SaaS completo:

- Next.js como framework principal.
- TypeScript en toda la aplicación.
- PostgreSQL para datos duraderos de producto.
- Prisma como ORM inicial.
- UI construida por componentes.
- Datos de demo desde el primer día.

## Razón de la decisión

AgentGuard necesita una interfaz SaaS rica: dashboard, colas de revisión, filtros, paneles laterales, estados de riesgo, políticas editables y motion sutil. Next.js con TypeScript encaja mejor con ese tipo de producto porque permite construir una experiencia frontend muy cuidada sin renunciar a rutas backend, APIs internas y evolución hacia una aplicación completa.

La estructura inicial de rutas y carpetas vive en [Estructura de aplicación](APP_STRUCTURE.md).

## Despliegue

Decisión anclada. Todo serverless, un solo deploy, preview por PR y escala a cero. Encaja con lo que el roadmap ya compromete (PostgreSQL + Prisma en la fase 10) sin añadir un backend separado.

| Pieza | Elección | Razón |
|---|---|---|
| Hosting de la app | **Vercel** | Soporte nativo de Next.js (mismo equipo), SSR/edge, deploys de preview por cada PR, cero configuración |
| Base de datos | **Neon** (PostgreSQL serverless) | Postgres gestionado con pooling serverless y ramas de base de datos por PR; encaja con Prisma sin fricción |
| ORM y migraciones | **Prisma Migrate** | Ya elegido como ORM del producto (fase 10) |
| Autenticación | **Auth.js** (NextAuth) | Open source y control total del RBAC sobre `admin` / `reviewer` / `auditor` / `developer` (fase 11) |
| Cron / SLA | **Vercel Cron** | Dispara el proceso temporal de `approvalDueAt` y el auto-escalado por SLA (fase 12) sin infraestructura extra |
| Ingesta de acciones | **Route Handlers de Next.js** | El endpoint de entrada de acciones vive en el mismo deploy; no hace falta un servicio aparte (fase 12) |
| Observabilidad | **Sentry** + **Vercel Analytics** | Errores y trazas más métricas básicas (fase 13) |
| CI | **GitHub Actions** | `lint` + `test` + `build` como check obligatorio de cada PR (ver [Flujo de Git](GIT_WORKFLOW.md), fase 13) |

Regla de dependencia: el MVP (fases 1–9, datos simulados) despliega en Vercel sin base de datos; Neon, Auth.js y Vercel Cron se incorporan al llegar a sus fases respectivas.

### Alternativa self-hosted

Si en algún momento se descarta Vercel: Next.js con `output: "standalone"` en un contenedor Docker sobre Fly.io, Railway o Render, con el PostgreSQL gestionado del mismo proveedor. Da más control a cambio de más operaciones.

## Modelo de datos inicial

Entidades principales:

- Organization.
- User.
- Agent.
- Tool.
- Permission.
- Policy.
- AgentAction.
- Approval.
- AuditEvent.

El detalle funcional vive en [Modelo funcional de datos](DATA_MODEL.md).

## Estados de acción de ejemplo

- proposed
- allowed
- blocked
- needs_approval
- approved
- rejected
- changes_requested
- escalated
- executed
- failed

## Simulación de producto

El producto arranca con integraciones simuladas y evoluciona hacia integraciones reales:

- Email.
- CRM.
- Facturación.
- Sistema interno de tareas.

Esto nos permite diseñar y validar la experiencia antes de invertir tiempo en APIs externas reales.

## Testing

Estrategia de testing, de dentro hacia fuera:

- **Lógica de dominio pura** (`src/domain/`): tests unitarios con **Vitest**. Prioridad máxima, porque la evaluación de políticas, las transiciones de estado de `AgentAction` y el cálculo de riesgo son el núcleo del producto.
- **Componentes**: **React Testing Library** sobre Vitest, enfocada en comportamiento y accesibilidad, no en detalles de implementación.
- **Flujos críticos end-to-end** (revisar y aprobar una acción): **Playwright**, más adelante.

Regla: cada función de dominio nueva llega con su test; la UI se cubre en los flujos que cambian estado.

## Barra de calidad

Cada feature debe incluir:

- Estado vacío.
- Estado de carga.
- Estado de error.
- Comportamiento de permisos.
- Layout responsive.
- Etiquetas accesibles.
- Datos semilla realistas.
