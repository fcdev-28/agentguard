# Diseño — Escrituras de `/review` con Server Actions (cableado slice 2)

## Contexto

El cableado UI→Prisma (spec `2026-07-16-cableado-ui-prisma-design.md`) migra cada
pantalla ENTERA: lee de BD **y** escribe en BD. Los slices ya fusionados (#21, #22)
solo cubrieron la mitad de **lectura**: las 8 pantallas leen de Prisma, pero las
mutaciones siguen en memoria (context providers efímeros), así que una decisión o
comentario **desaparece al recargar** — justo el estado roto que el spec padre
descartaba.

Este slice implementa la mitad de **escritura** de `/review` y fija el patrón de
referencia que replicarán los slices siguientes (notificaciones/runtime, políticas).

## Objetivo

Persistir en PostgreSQL las decisiones humanas y los comentarios de `/review`:
decidir, decidir en lote, escalar y comentar. El servidor pasa a ser la única
fuente de verdad; se elimina el estado de mutación en memoria.

## Enfoque

**Server actions + `useOptimistic`, eliminando los stores efímeros.** Cada mutación
es una server action que persiste en BD y hace `revalidatePath`. La UX instantánea
(la fila decidida desaparece, el comentario aparece) se logra con `useOptimistic`
sobre los datos que ya llegan como props del servidor.

Se descartan: (a) mantener los stores como cache optimista sobre las actions —
doble fuente de verdad, riesgo de desincronía; (b) sin optimismo — latencia
perceptible en cada decisión.

## Componentes

### `src/lib/review-actions.ts` (`"use server"`)

Todas resuelven el usuario actual con `getCurrentUser()` (server-only, `session-db`).
Envuelven la lógica pura ya existente en `src/lib/review.ts` (`applyDecision`,
`eligibleEscalationTargets`) — no se duplica validación.

- `decideAction(actionId, decision, reason)`
  `decision ∈ {approved, rejected, changes_requested}`.
  Carga el `status` actual; valida con `applyDecision` (rechaza si ya no está
  pendiente; exige motivo en `rejected`/`changes_requested`). En
  `prisma.$transaction`: `upsert` de `Approval` (clave `actionId @unique`,
  `reviewerId = currentUser.id`, `decision`, `reason`) + `update` de
  `AgentAction.status`. `revalidatePath("/review")` y
  `revalidatePath("/review/[actionId]", "page")`. Devuelve `{ ok: true }` o
  `{ error: string }`.

- `decideManyActions(actionIds, decision, reason)`
  Valida cada acción; aplica todas en una `$transaction`; revalida una vez.
  Las que ya no estén pendientes se omiten (no rompen el lote).

- `escalateAction(actionId)`
  `status → escalated` + `Approval(decision = escalated, reason = null)`.
  El destinatario del escalado **no se persiste**: no existe campo en el esquema
  (`AgentAction` ni `Approval` lo tienen) y añadirlo queda fuera de alcance
  (MVP single-tenant). Se elimina el detalle de UI "Escalada a X".

- `addComment(actionId, body)`
  Valida con `isValidCommentBody`; crea `ActionComment`
  (`authorId = currentUser.id`); `revalidatePath`.

### Cliente

- Se **eliminan** `src/components/review/review-store.tsx` y
  `comment-store.tsx`, y sus providers (`ReviewProvider`, `CommentProvider`) del
  layout raíz. El layout deja de sembrar esos stores.
- `review-screen`, `action-detail`, `review-queue` llaman las server actions en
  vez del store. `useOptimistic`:
  - cola: al decidir/escalar, la fila sale al instante de `pending`.
  - comentarios: el nuevo comentario se añade al instante a la lista.
- El status y los comentarios se leen de las props del servidor (ya revalidadas).
- La decisión registrada ("Decidida por … · hace X") se deriva del `Approval`
  persistido (cargado por la página), no del store.

## Manejo de errores

- Las actions devuelven `{ error }` en vez de lanzar en fallo de validación; el
  cliente muestra el motivo y revierte el optimismo (`useOptimistic` se recalcula
  al no revalidarse el dato).
- Estados vacío/carga/error de la pantalla se conservan.

## Testing

- Unit de `review-actions` con Prisma mockeado: camino feliz de cada action y
  validación (motivo obligatorio; acción ya no pendiente se omite/errores).
- `applyDecision` / `eligibleEscalationTargets` ya tienen cobertura pura.

## Fuera de alcance (YAGNI)

- Persistir el destinatario del escalado (sin campo en esquema).
- `AuditEvent`/`Notification` al decidir (van en el slice de notificaciones/runtime).
- Optimistic locking, paginación, autenticación real (fase 11).
