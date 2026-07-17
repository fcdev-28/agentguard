# Modelo Funcional de Datos

## Objetivo

Definir los datos mínimos que AgentGuard necesita para controlar agentes, evaluar acciones, registrar decisiones humanas y reconstruir actividad con garantías de auditoría.

El modelo empieza acotado, pero está pensado para un producto completo: crece hacia persistencia e integraciones reales sin reescribirse.

## Principios

- Cada acción relevante debe quedar trazada.
- Las decisiones humanas deben conservar autor, fecha y motivo.
- Las políticas deben poder versionarse.
- Los eventos de auditoría no se editan.
- Los datos técnicos pueden existir sin ensuciar la interfaz principal.

## Entidades principales

### Organization

Representa una empresa o espacio de trabajo.

Campos:

- `id`
- `name`
- `slug`
- `emergencyStop`
- `emergencyStopById`
- `emergencyStopAt`
- `createdAt`
- `updatedAt`

Relaciones:

- Tiene muchos usuarios.
- Tiene muchos agentes.
- Tiene muchas políticas.
- Tiene muchas herramientas.

### User

Persona que accede a AgentGuard.

Campos:

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

Campos:

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

Campos:

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

Campos:

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

Campos:

- `id`
- `organizationId`
- `name`
- `description`
- `status`
- `version`
- `conditions`
- `effect`
- `approvalSlaMinutes`
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

Campos:

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
- `approvalDueAt`
- `createdAt`
- `updatedAt`
- `executedAt`
- `externalId`

Regla de producto:

- `(agentId, externalId)` es único: el endpoint de ingesta usa este par para idempotencia, así un agente no duplica la misma acción externa si reintenta el envío.

Tipos de acción iniciales:

- `send_email`
- `update_record`
- `issue_refund`
- `create_task`
- `change_permission`

### Approval

Decisión humana vinculada a una acción.

Campos:

- `id`
- `actionId`
- `reviewerId`
- `decision`
- `reason`
- `createdAt`

Decisiones:

- `approved`
- `rejected`
- `changes_requested`
- `escalated`

Regla de producto:

- `reason` es obligatorio para rechazar, pedir cambios o escalar.

### AuditEvent

Registro inmutable de algo relevante ocurrido en el sistema.

Campos:

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
- `agent_paused`
- `agent_resumed`
- `permission_changed`
- `policy_published`
- `action_proposed`
- `action_allowed`
- `action_blocked`
- `approval_created`
- `action_escalated`
- `action_executed`
- `action_failed`
- `emergency_stop_engaged`
- `emergency_stop_released`

### Notification

Aviso in-app dirigido a un usuario (ver `docs/FEATURES.md`).

Campos:

- `id`
- `organizationId`
- `userId`
- `type`
- `actionId`
- `message`
- `readAt`
- `createdAt`

Tipos:

- `approval_requested`
- `action_escalated`
- `agent_error`
- `emergency_stop`

### ActionComment

Comentario de un usuario en el hilo de una acción (ver `docs/FEATURES.md`).

Campos:

- `id`
- `actionId`
- `authorId`
- `body`
- `createdAt`

Regla de producto:

- Los comentarios no sustituyen al `reason` obligatorio de una `Approval`; solo añaden contexto.

### AgentApiKey

Credencial M2M de un agente para autenticarse contra el endpoint de ingesta de acciones (fase 12).

Campos:

- `id`
- `agentId`
- `prefix`
- `keyHash`
- `lastUsedAt`
- `revokedAt`
- `createdAt`

Regla de producto:

- Solo se persiste el hash de la key (`keyHash`, único); el valor en claro se muestra una única vez al generarla y no se recupera después.
- `prefix` identifica la key en la UI/logs sin exponer el secreto completo.
- Una key revocada (`revokedAt` no nulo) deja de autenticar ingesta, pero se conserva para auditoría.

### IntegrationLog

Evidencia de un intento de ejecución de una `AgentAction` contra una herramienta real (fase 12).

Campos:

- `id`
- `actionId`
- `toolType`
- `transport`
- `status`
- `detail`
- `createdAt`

Estados:

- `succeeded`
- `failed`

Regla de producto:

- `transport` identifica la implementación usada (p. ej. `resend`, `logging`), para poder distinguir un envío real de uno simulado en dev.

## Niveles de riesgo (`riskLevel`)

Valores compartidos por `Tool.riskLevel` y `AgentAction.riskLevel` (etiqueta visible en la UI entre paréntesis):

- `low` (Bajo): acción reversible o informativa.
- `medium` (Medio): cambia datos internos sin impacto económico directo.
- `high` (Alto): puede afectar dinero, permisos, clientes o cumplimiento.
- `critical` (Crítico): impacto amplio o irreversible.

## Relaciones clave

- Una `Organization` tiene muchos `User`, `Agent`, `Tool`, `Policy`, `AgentAction` y `AuditEvent`.
- Un `Agent` pertenece a una `Organization` y tiene un propietario `User`.
- Un `Agent` puede tener permisos sobre muchas `Tool`.
- Una `AgentAction` pertenece a un `Agent` y normalmente apunta a una `Tool`.
- Una `AgentAction` puede tener una `Policy` aplicada.
- Una `AgentAction` puede tener cero o una `Approval` en la primera versión.
- Cada cambio relevante genera al menos un `AuditEvent`.
- Una `Notification` pertenece a una `Organization` y a un `User`, y puede apuntar a una `AgentAction`.
- Un `ActionComment` pertenece a una `AgentAction` y a su `User` autor.
- Un `Agent` puede tener muchas `AgentApiKey` para autenticar su ingesta de acciones.
- Una `AgentAction` puede tener muchos `IntegrationLog`, uno por intento de ejecución real.

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

## Datos simulados iniciales

La demo inicial debe incluir:

- 1 organización.
- 4 usuarios, uno por rol.
- 4 agentes con distintos niveles de actividad.
- 4 herramientas simuladas.
- 6 políticas activas.
- 20 acciones con variedad de estado y riesgo.
- 8 aprobaciones.
- 40 eventos de auditoría.
- 10 notificaciones, algunas sin leer.
- 12 comentarios repartidos en varias acciones.

## Decisiones pendientes

- Si una acción podrá tener múltiples aprobaciones en versiones posteriores.
- Cómo modelar políticas complejas sin construir un editor visual pesado.
- Si `payload` y `metadata` se guardarán como JSON plano o con tipos más estrictos.
- Cuándo separar integraciones reales de herramientas simuladas.

## Evolución hacia el producto completo

No entran en la primera versión, pero sí forman parte del producto completo y llegan en fases posteriores:

- Persistencia real (PostgreSQL + Prisma) en sustitución de los datos simulados.
- Multi-organización (multi-tenant) real.
- SSO y autenticación empresarial.
- Webhooks e integraciones reales con herramientas externas.
- Historial completo de versiones de cada política.
- Motor de reglas avanzado.

## No objetivos

Quedan fuera del producto por decisión, no por alcance:

- Facturación del propio AgentGuard.
- Marketplace de agentes o herramientas.
