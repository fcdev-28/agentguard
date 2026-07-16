# Diseño — Escrituras de `/policies` con Server Actions (cableado slice 4)

## Contexto

Continúa el cableado UI→Prisma. Las lecturas de `/policies` ya salen de BD
(`src/data/policies.ts`; páginas server pasan props). Falta la mitad de
**escritura**: hoy `PolicyDetail` tiene un editor (condiciones, efecto, SLA) que
es **previsualización efímera** —avisa "no se guarda" y se pierde al recargar— y
no existe forma de **crear** una política. Este slice cierra ese hueco.

Replica el patrón de referencia de `src/lib/review-actions.ts`: server actions
`"use server"`, usuario/organización de sesión con `session-db`, `prisma`,
`revalidatePath`, resultado uniforme `{ ok: true } | { error: string }`. La
validación vive en lógica pura reutilizable; las actions no la duplican.

## Objetivo

Persistir en PostgreSQL la creación y edición de políticas: crear (borrador),
editar condiciones/efecto/SLA/nombre/descripción, publicar y archivar. El
servidor pasa a ser la única fuente de verdad; desaparece la previsualización sin
persistencia como estado final.

## Componentes

### Lógica pura — extiende `src/lib/policies.ts`

- `validatePolicyInput(input)` → `{ ok: true } | { error: string }`.
  Reglas: `name` y `description` no vacíos (tras `trim`); `effect` es un
  `PolicyEffect` válido; `approvalSlaMinutes` es `null` o entero positivo;
  `conditions` es un objeto (`Record<string, unknown>`). Mensajes en castellano.
- `nextPolicyStatus(current, transition)` → `{ status, publishedAt? } | { error }`.
  Transiciones permitidas: `publish` (`draft → active`, fija `publishedAt = now`),
  `archive` (`draft | active → archived`). Cualquier otra combinación devuelve
  error ("La política ya está publicada", "No se puede archivar…", etc.).

Ambas con tests puros (estilo `src/lib/review.ts`).

### Server actions — `src/lib/policy-actions.ts` (`"use server"`)

Resuelven usuario y organización con `getCurrentUser()` /
`getCurrentOrganization()` (server-only, `session-db`). Envuelven la lógica pura
anterior. Resultado `{ ok: true } | { error: string }` (create añade `id`).

- `createPolicy(input)` con `input = { name, description, effect, conditions,
  approvalSlaMinutes }`.
  Valida con `validatePolicyInput`. Crea `Policy` (`status = draft`,
  `version = 1`, `createdById = user.id`, `organizationId = org.id`). Devuelve
  `{ ok: true, id }` para que el cliente redirija al detalle.
  `revalidatePath("/policies")`.
- `updatePolicy(id, patch)` con `patch = { name, description, effect, conditions,
  approvalSlaMinutes }`.
  Comprueba que la política existe; valida con `validatePolicyInput`; `update`.
  `revalidatePath("/policies")` y `revalidatePath("/policies/[policyId]", "page")`.
- `publishPolicy(id)`: carga `status`; `nextPolicyStatus(status, "publish")`;
  `update` `status = active`, `publishedAt = now`. Revalida.
- `archivePolicy(id)`: carga `status`; `nextPolicyStatus(status, "archive")`;
  `update` `status = archived`. Revalida.

No se toca `version` más allá del `1` inicial (versionado histórico = YAGNI).

### Cliente

- **`policy-detail.tsx`** (ya client): el editor pasa a persistir.
  - Botón **"Guardar cambios"** → `updatePolicy(policy.id, edited)`. Deshabilitado
    si no hay cambios respecto a las props.
  - Acciones de estado según `status`: **"Publicar"** (`publishPolicy`) visible en
    `draft`; **"Archivar"** (`archivePolicy`) en `draft`/`active`.
  - `useTransition` para el estado pending; muestra el `error` devuelto y no
    revierte props (revalidate trae la verdad).
  - Se **elimina** el aviso "previsualización simulada: no se guarda". El preview
    en vivo de acciones afectadas se mantiene (sigue siendo `useMemo` local).
- **`policies-list.tsx`** / su página: botón **"Nueva política"** → enlace a
  `/policies/new`.
- **Ruta nueva `/policies/new`**: `page.tsx` server (defaults vacíos) que renderiza
  **`policy-form.tsx`** (client). Campos: nombre, descripción, efecto (select),
  SLA (número, opcional), condiciones (editor equivalente al de `PolicyDetail`;
  reutilizar el sub-componente de condiciones si es fácil, si no, uno mínimo).
  Al enviar: `createPolicy(input)`; si `ok`, `router.push('/policies/{id}')`; si
  `error`, se muestra. Estados vacío/carga/error y layout responsive.

## Manejo de errores

Las actions devuelven `{ error }` (no lanzan) en fallo de validación o transición
inválida; el cliente muestra el motivo. Éxito → `revalidatePath` recarga la verdad
del servidor. Se conservan los estados vacío/carga/error de las pantallas.

## Testing

- Unit de `policy-actions` con Prisma mockeado (patrón
  `src/lib/review-actions.test.ts`): camino feliz de cada action + guards
  (validación de input, transición inválida, política inexistente).
- Puros de `validatePolicyInput` y `nextPolicyStatus`.

## Fuera de alcance (YAGNI)

- Historial/incremento de `version` al republicar.
- Borrado de políticas (archivar cubre el caso).
- Persistir la simulación de acciones afectadas (el preview ya es en vivo).
- Reabrir una política archivada a borrador.
- Autenticación real (fase 11).
