# Modelo Funcional de Datos

## Objetivo

Definir los datos mínimos que AgentGuard necesita para controlar agentes, evaluar acciones, registrar decisiones humanas y reconstruir actividad con garantías de auditoría.

El modelo debe ser simple para el MVP, pero suficientemente serio para crecer hacia integraciones reales.

## Principios

- Cada acción relevante debe quedar trazada.
- Las decisiones humanas deben conservar autor, fecha y motivo.
- Las políticas deben poder versionarse.
- Los eventos de auditoría no se editan.
- Los datos técnicos pueden existir sin ensuciar la interfaz principal.

## Entidades principales

### Organization

Representa una empresa o espacio de trabajo.

Campos MVP:

- `id`
- `name`
- `slug`
- `createdAt`
- `updatedAt`

Relaciones:

- Tiene muchos usuarios.
- Tiene muchos agentes.
- Tiene muchas políticas.
- Tiene muchas herramientas.

### User

Persona que accede a AgentGuard.

Campos MVP:

- `id`
- `organizationId`
- `name`
- `email`
- `role`
- `status`
- `createdAt`
- `updatedAt`

Roles iniciales:

- `admin`
- `reviewer`
- `auditor`
- `developer`

Estados:

- `active`
- `invited`
- `disabled`

### Agent

Sistema de IA que propone o ejecuta acciones.

Campos MVP:

- `id`
- `organizationId`
- `ownerId`
- `name`
- `description`
- `environment`
- `status`
- `mode`
- `createdAt`
- `updatedAt`

Entornos:

- `sandbox`
- `production`

Estados:

- `active`
- `paused`
- `disabled`
- `error`

Modos:

- `observe`
- `enforce`

### Tool

Herramienta o integración disponible para agentes.

Campos MVP:

- `id`
- `organizationId`
- `name`
- `type`
- `status`
- `riskLevel`
- `createdAt`
- `updatedAt`

Tipos iniciales:

- `email`
- `crm`
- `billing`
- `tasks`

### Permission

Permiso que conecta un agente con una herramienta y define qué puede hacer.

Campos MVP:

- `id`
- `agentId`
- `toolId`
- `scope`
- `status`
- `createdAt`
- `updatedAt`

Scopes iniciales:

- `read`
- `draft`
- `write`
- `execute`

Estados:

- `allowed`
- `restricted`
- `blocked`

### Policy

Regla que decide si una acción se permite, se bloquea o requiere aprobación.

Campos MVP:

- `id`
- `organizationId`
- `name`
- `description`
- `status`
- `version`
- `conditions`
- `effect`
- `createdById`
- `createdAt`
- `updatedAt`
- `publishedAt`

Estados:

- `draft`
- `active`
- `archived`

Efectos:

- `allow`
- `block`
- `require_approval`
- `escalate`

### AgentAction

Acción propuesta o ejecutada por un agente.

Campos MVP:

- `id`
- `organizationId`
- `agentId`
- `toolId`
- `policyId`
- `title`
- `summary`
- `actionType`
- `status`
- `riskLevel`
- `payload`
- `policyResult`
- `createdAt`
- `updatedAt`
- `executedAt`

Tipos de acción iniciales:

- `send_email`
- `update_record`
- `issue_refund`
- `create_task`
- `change_permission`

### Approval

Decisión humana vinculada a una acción.

Campos MVP:

- `id`
- `actionId`
- `reviewerId`
- `decision`
- `reason`
- `createdAt`

Decisiones:

- `approved`
- `rejected`
- `requested_changes`
- `escalated`

Regla de producto:

- `reason` es obligatorio para rechazar, pedir cambios o escalar.

### AuditEvent

Registro inmutable de algo relevante ocurrido en el sistema.

Campos MVP:

- `id`
- `organizationId`
- `actorUserId`
- `agentId`
- `actionId`
- `eventType`
- `message`
- `metadata`
- `createdAt`

Tipos iniciales:

- `agent_created`
- `permission_changed`
- `policy_published`
- `action_proposed`
- `action_allowed`
- `action_blocked`
- `approval_created`
- `action_executed`
- `action_failed`

## Relaciones clave

- Una `Organization` tiene muchos `User`, `Agent`, `Tool`, `Policy`, `AgentAction` y `AuditEvent`.
- Un `Agent` pertenece a una `Organization` y tiene un propietario `User`.
- Un `Agent` puede tener permisos sobre muchas `Tool`.
- Una `AgentAction` pertenece a un `Agent` y normalmente apunta a una `Tool`.
- Una `AgentAction` puede tener una `Policy` aplicada.
- Una `AgentAction` puede tener cero o una `Approval` en el MVP.
- Cada cambio relevante genera al menos un `AuditEvent`.

## Flujo de estados de acción

```text
proposed
  -> allowed
  -> blocked
  -> needs_approval

needs_approval
  -> approved
  -> rejected
  -> changes_requested
  -> escalated

approved
  -> executed
  -> failed

allowed
  -> executed
  -> failed
```

## Datos simulados del MVP

La demo inicial debe incluir:

- 1 organización.
- 4 usuarios, uno por rol.
- 4 agentes con distintos niveles de actividad.
- 4 herramientas simuladas.
- 6 políticas activas.
- 20 acciones con variedad de estado y riesgo.
- 8 aprobaciones.
- 40 eventos de auditoría.

## Decisiones pendientes

- Si una acción podrá tener múltiples aprobaciones en versiones posteriores.
- Cómo modelar políticas complejas sin construir un editor visual pesado.
- Si `payload` y `metadata` se guardarán como JSON plano o con tipos más estrictos.
- Cuándo separar integraciones reales de herramientas simuladas.

## Fuera del MVP

- Multi-organización avanzada.
- Facturación del propio AgentGuard.
- SSO.
- Webhooks públicos.
- Historial completo de versiones de cada política.
- Motor de reglas complejo.
