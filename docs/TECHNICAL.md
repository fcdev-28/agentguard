# Notas Técnicas

## Stack elegido

Para un MVP SaaS pulido:

- Next.js como framework principal.
- TypeScript en toda la aplicación.
- PostgreSQL para datos duraderos de producto.
- Prisma como ORM inicial.
- UI construida por componentes.
- Datos de demo desde el primer día.

## Razón de la decisión

AgentGuard necesita una interfaz SaaS rica: dashboard, colas de revisión, filtros, paneles laterales, estados de riesgo, políticas editables y motion sutil. Next.js con TypeScript encaja mejor con ese tipo de producto porque permite construir una experiencia frontend muy cuidada sin renunciar a rutas backend, APIs internas y evolución hacia una aplicación completa.

La estructura inicial de rutas y carpetas vive en [Estructura de aplicación](APP_STRUCTURE.md).

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

El MVP puede empezar con integraciones simuladas:

- Email.
- CRM.
- Facturación.
- Sistema interno de tareas.

Esto nos permite diseñar y validar la experiencia antes de invertir tiempo en APIs externas reales.

## Barra de calidad

Cada feature debe incluir:

- Estado vacío.
- Estado de carga.
- Estado de error.
- Comportamiento de permisos.
- Layout responsive.
- Etiquetas accesibles.
- Datos semilla realistas.
