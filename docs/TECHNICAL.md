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
