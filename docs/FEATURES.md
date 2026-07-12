# Funcionalidades de Control y Velocidad

## Objetivo

Ampliar el producto con funcionalidades que refuerzan las dos promesas centrales de AgentGuard: **seguridad** (poder frenar a un agente al instante) y **velocidad operacional** (decidir rápido, sin fricción). Todas encajan con el modelo de datos y la arquitectura UX ya definidos; no cambian la dirección del producto, la profundizan.

## Resumen

| # | Funcionalidad | Promesa | Nivel |
|---|---|---|---|
| 1 | Parada de emergencia (kill switch) | Control / seguridad | V1 |
| 2 | Pausa y reanudación por agente | Control | V1 |
| 3 | Escalado por SLA de aprobación | Confianza | V1 (visual) + Fase 2 (automático) |
| 4 | Acciones en lote en la cola | Velocidad | V1 |
| 5 | Command palette (Cmd-K) | Velocidad | V1 |
| 6 | Notificaciones in-app | Visibilidad | V1 |
| 7 | Comentarios en una acción | Auditoría / colaboración | V1 |

## 1. Parada de emergencia (kill switch)

Control de nivel organización que congela toda ejecución de agentes al instante. Es la funcionalidad más alineada con la identidad del producto: un plano de control tiene que poder decir "para todo, ya".

- **Comportamiento**: mientras está activa, ninguna `AgentAction` pasa a `executed`; las acciones nuevas se registran pero quedan retenidas hasta liberarla.
- **Datos**: `Organization.emergencyStop` (bool), `emergencyStopById`, `emergencyStopAt`. Eventos `emergency_stop_engaged` / `emergency_stop_released`.
- **UX**: control destacado en el Dashboard, con uso intencional del rojo primario y confirmación previa. Banner global visible mientras esté activa.
- **Regla**: activar y liberar exige rol `admin` y siempre queda en auditoría.

## 2. Pausa y reanudación por agente

Versión granular del kill switch. Reutiliza `Agent.status = paused`, que ya existe pero no tenía disparador de producto.

- **Datos**: eventos `agent_paused` / `agent_resumed`, con motivo opcional.
- **UX**: acción en el detalle de agente y accesible desde la lista de agentes.
- Un agente en `paused` no genera acciones nuevas ni ejecuta las pendientes.

## 3. Escalado por SLA de aprobación

Cada acción en `needs_approval` tiene una fecha límite; si se supera, se marca vencida y puede escalar a un responsable superior. Da vida al estado `escalated`, que hasta ahora no tenía forma automática de alcanzarse.

- **Datos**: `Policy.approvalSlaMinutes` (nullable), `AgentAction.approvalDueAt` (se calcula al entrar en `needs_approval`).
- **V1**: cálculo de `approvalDueAt`, badge "Vencida" en la cola y escalado manual.
- **Fase 2**: proceso temporal que auto-escala al vencer (requiere backend). Evento `action_escalated`.

## 4. Acciones en lote en la cola

Selección múltiple en la cola de revisión para aprobar o rechazar varias acciones a la vez. Impacto directo en la velocidad del revisor.

- **Datos**: ninguno nuevo; genera una `Approval` por cada acción seleccionada.
- **Regla**: rechazo o escalado en lote exige un motivo común (misma regla que la decisión individual).
- **UX**: checkboxes por fila y barra de acciones en lote sobre la cola.

## 5. Command palette (Cmd-K)

Paleta de comandos global para navegar y actuar sin ratón, alineada con la referencia Raycast del sistema de diseño ("velocidad e interacción tipo comando").

- **Acciones**: ir a cualquier pantalla, buscar agente / acción / política, aprobar o rechazar la acción abierta, activar la parada de emergencia.
- **Datos**: ninguno. Componente `CommandPalette` en `components/app-shell`.
- **Accesibilidad**: foco atrapado, navegación completa por teclado, cierre con `Esc`.

## 6. Notificaciones in-app

Bandeja y contador de no leídas en la top bar. Avisa al revisor de lo que necesita su atención sin depender de canales externos.

- **Datos**: nueva entidad `Notification` (`id`, `organizationId`, `userId`, `type`, `actionId?`, `message`, `readAt`, `createdAt`). Tipos: `approval_requested`, `action_escalated`, `agent_error`, `emergency_stop`.
- **UX**: icono de campana con badge de no leídas y panel desplegable; marcar como leído.

## 7. Comentarios en una acción

Hilo breve en el detalle de una acción para dejar contexto de revisión más allá del motivo de la decisión.

- **Datos**: nueva entidad `ActionComment` (`id`, `actionId`, `authorId`, `body`, `createdAt`).
- **UX**: hilo en el panel/detalle de acción. No bloquea la decisión ni sustituye al motivo obligatorio de `Approval`.

## Fuera de alcance por ahora

- Notificaciones por email o Slack (en la primera versión solo in-app).
- Reglas configurables de escalado por destinatario.
- Menciones (`@usuario`) en comentarios.
- Registro de auditoría exportable disparado por la parada de emergencia (solo queda el evento).
