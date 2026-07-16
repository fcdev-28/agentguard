# Diseño — Notificaciones y Runtime con Server Actions (cableado slice 3)

## Contexto

Continúa el cableado UI→Prisma. Tras `/review` (slice 2), quedan como estado
efímero en memoria: **notificaciones** (`notification-store`) y **runtime**
(`runtime-store`: parada de emergencia global + pausar/reanudar agente). El
esquema ya soporta la persistencia; falta escribir en BD y eliminar los stores.

Replica el patrón de `src/lib/review-actions.ts`: server actions `"use server"`,
`getCurrentUser()` de `session-db`, `prisma` (transacción cuando hay varias
escrituras), `revalidatePath`, resultado `{ ok: true } | { error: string }`.

## Notificaciones

- **Lectura**: nuevo `src/data/notifications.ts` (mapper `mapNotification` +
  `getNotificationsForUser(userId)`), al estilo de `src/data/audit.ts`. Orden por
  `createdAt` desc.
- **Escritura**: nuevo `src/lib/notification-actions.ts`:
  - `markNotificationRead(id)`: `update` `Notification.readAt = now()` (solo si es
    del usuario actual). Revalida.
  - `markAllNotificationsRead()`: `updateMany` where `userId = current`,
    `readAt = null` → `readAt = now()`. Revalida.
- **UI**: se elimina `notification-store.tsx`. El layout raíz (server) carga las
  notificaciones del usuario y las pasa a `notification-bell` (client). El bell
  usa `useOptimistic` para marcar leído al instante; el contador de no leídas se
  deriva de los items. Consumidor único: `notification-bell.tsx`.

## Runtime — parada de emergencia (global, org)

- **Lectura**: la verdad está en `Organization.emergencyStop / emergencyStopById
  / emergencyStopAt`, ya cargada por `getCurrentOrganization()` (session-db).
- **RuntimeProvider adelgaza a pass-through**: el layout raíz pasa el estado de
  parada (de la org) como prop al provider; el contexto lo expone **sin estado
  mutable cliente** (se acabó el `useReducer`/overrides). Evita prop-drilling en
  los muchos consumidores (banner, command-palette, review, agents, dashboard).
- **Escritura**: nuevo `src/lib/runtime-actions.ts`:
  - `engageEmergencyStop()`: `update` Organization (`emergencyStop = true`,
    `emergencyStopById = current`, `emergencyStopAt = now`) + crea `AuditEvent`
    (tipo de parada de emergencia). Revalida `"/"` layout.
  - `releaseEmergencyStop()`: pone los tres campos a false/null + `AuditEvent`.
    Revalida.

## Runtime — pausar/reanudar agente

- Se elimina `agentOverrides`. El estado real es `Agent.status` (`paused`/`active`),
  ya leído de BD por las pantallas de agentes.
- `src/lib/runtime-actions.ts`:
  - `pauseAgent(agentId)`: `update` `Agent.status = paused` + `AuditEvent`. Revalida.
  - `resumeAgent(agentId)`: `Agent.status = active` + `AuditEvent`. Revalida.
- `getAgentStatus(agentId, seed)` desaparece (el status viene de BD).

## Auditoría en caliente

Las cuatro mutaciones de runtime **crean un `AuditEvent` real** (mira campos en
`prisma/schema.prisma` modelo `AuditEvent` + mapper `src/data/audit.ts`;
`actorId = current`, `organizationId`, tipo y descripción coherentes). Sustituye
al `runtimeAuditEvents` en memoria; `audit-timeline-live` pasa a leer de BD (o se
simplifica a leer las props ya revalidadas). El timeline vivo sigue funcionando y
la auditoría se vuelve real.

## Testing

- Unit de `notification-actions` y `runtime-actions` con Prisma mockeado (patrón
  de `src/lib/review-actions.test.ts`): camino feliz + guard (marcar leído ajeno,
  agente inexistente). Mapper `mapNotification` con test puro estilo `data/*`.

## Fuera de alcance (YAGNI)

- Historial de "pausado por quién/cuándo" más allá del `AuditEvent`.
- Notificaciones en tiempo real (websockets/push) — siguen siendo pull + revalidate.
- Autenticación real (fase 11).
