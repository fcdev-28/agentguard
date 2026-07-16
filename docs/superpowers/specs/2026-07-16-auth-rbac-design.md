# Diseño — Autenticación y Roles (Fase 11)

## Contexto

Hoy la sesión está simulada: `src/lib/session.ts` (sync, client-safe, sobre
`demo-data`) exporta `currentUser`/`currentOrganization`, y `src/lib/session-db.ts`
(async, `server-only`) exporta `getCurrentUser()`/`getCurrentOrganization()` que
devuelven **siempre el admin del seed**. No hay contraseñas, ni middleware, ni
control por rol: las 14 mutaciones de las server actions solo registran al actor
para auditoría, sin comprobar permisos.

Esta fase sustituye esos stubs por autenticación real (credenciales propias +
cookie de sesión firmada) y añade RBAC sobre los 4 roles (`admin`, `reviewer`,
`auditor`, `developer`), con defensa en profundidad. Revisado por arquitectura;
este spec incorpora los 6 cambios obligatorios de seguridad de esa revisión.

Mecanismo elegido (frente a Auth.js): **credenciales propias**, sin framework de
auth. Piezas estables y agnósticas — `jose` (JWT firmado, edge-compatible) y
`bcryptjs` (hash en JS puro) — para no depender del soporte bleeding-edge de
Auth.js en Next 16.2 / React 19.2.

## Principio de seguridad (leer antes que nada)

La **frontera real de autorización** son dos cosas, y solo dos:

1. `getCurrentUser()` **falla cerrado** y revalida `status` contra BD en cada
   request.
2. `requireCan(capability)` en **toda** mutación server.

El **middleware es solo UX** (redirigir a `/login`): valida que la cookie está
firmada y no vencida, nada más. No toca BD, no comprueba rol ni status. **Nadie
debe borrar un `requireCan` pensando que "ya lo cubre el middleware".**

## Modelo de datos

- `User.passwordHash String?` — nullable. Los usuarios `invited`/`disabled` no
  tienen hash y **no pueden loguear**. Migración Prisma.
- Seed (`prisma/seed.ts` + `demo-data`): fijar `passwordHash` (bcrypt, ~12 rounds)
  para los usuarios `active` con una **contraseña demo conocida** (constante
  documentada, p.ej. `agentguard-demo`). Los `invited`/`disabled` quedan con
  `passwordHash = null`.

## Sesión — cookie JWT firmada

### `src/lib/auth/session.ts` (`server-only`)

- `createSession(userId)`: firma un JWT HS256 con `jose`, claim `sub = userId`,
  **exp 2 días** (única palanca frente a un token robado, dado que no hay
  revocación). Set cookie `httpOnly + secure + sameSite=lax + path=/` vía
  `cookies()` de `next/headers`.
- `destroySession()`: borra la cookie.
- `readSessionToken()`: helper que lee y verifica el token en contexto RSC/action.

### `src/lib/auth/config.ts`

- Lee `AUTH_SECRET` **una vez** al cargar el módulo y **lanza si falta o es corto**
  (< 32 chars). Sin default embebido: un secret por defecto equivale a no firmar.
  A `.env` (+ recordatorio de configurarlo en el despliegue).

### `getCurrentUser()` / `getCurrentOrganization()` (`session-db.ts`) — FALLO CERRADO

Cambio de firma crítico:

- `getCurrentUser(): Promise<User | null>` (antes `Promise<User>` no-nulo).
  1. Lee el token de la cookie; si no hay / firma inválida / exp vencida → `null`.
  2. Con el `userId` del token, **relee el `User` de BD**.
  3. Devuelve `null` si no existe **o si `status !== "active"`**.

  Esta revalidación de `status` en cada request es lo que hace que **desactivar
  un usuario tenga efecto inmediato** aunque su JWT siga vivo. Es la razón por la
  que NO necesitamos `sessionVersion` ni lista de revocación para el offboarding
  (único caso que importa en el MVP).

- `getCurrentOrganization(): Promise<Organization | null>` acorde.

- **Consumidores server** que hoy asumen user no-nulo:
  - Páginas/layout: si `getCurrentUser()` es `null` → `redirect("/login")`
    (defensa en profundidad; el middleware ya debería haber redirigido, pero un
    usuario desactivado a mitad de sesión pasa el middleware y llega aquí).
  - Server actions: vía `requireCan` (abajo), que trata `null` como no autorizado.

## Contraseñas — `src/lib/auth/password.ts`

- `hashPassword(plain): Promise<string>` — `bcryptjs`, ~12 rounds. **Solo runtime
  Node** (nunca edge; bcrypt no compila en el edge — solo se usa en actions/seed).
- `verifyPassword(plain, hash: string | null): Promise<boolean>` — **falla cerrado
  si `hash` es `null`** (un hash nulo nunca hace match).

## Login — grupo `(auth)`

- Grupo de rutas `src/app/(auth)/` con **layout propio sin shell**.
  `(auth)/login/page.tsx` (server) + `login-form.tsx` (client, `useTransition` +
  error). Estados de carga/error/responsive.
- `src/lib/auth/auth-actions.ts` (`"use server"`):
  - `login(email, password)`:
    1. `validateCredentials(email, password)` (puro): email con formato, campos no
       vacíos.
    2. Busca usuario con **`findFirst({ where: { email, status: "active" } })`**
       (no `findUnique`: el email es único **por organización**, no global —
       anotado para multi-org).
    3. `verifyPassword` **siempre contra un hash** (dummy si el usuario no existe o
       tiene hash nulo) para **igualar tiempos** y evitar enumeración de emails por
       timing.
    4. Si no cuadra → `{ error: "Credenciales inválidas." }` (mensaje **genérico**,
       sin revelar si el email existe).
    5. Si cuadra → `createSession(user.id)` + `redirect("/")`.
  - `logout()`: `destroySession()` + `redirect("/login")`.
- Validación pura `validateCredentials` en `src/lib/auth/credentials.ts` (testeable).

## Middleware — `src/middleware.ts` (edge, solo UX)

- `matcher`: todas las rutas salvo `/login`, `/_next/*`, estáticos, favicon.
- Lee la cookie con **`request.cookies.get()` de `NextRequest`** (NO `cookies()` de
  `next/headers`, que es para RSC/actions) y **verifica firma/exp con `jose`**
  (Web Crypto, edge-compatible). Sin BD, sin bcrypt.
- Cookie ausente o inválida → `NextResponse.redirect("/login")`. Válida → `next()`.
- Repito: esto es solo redirección de UX. La autorización real está en
  `getCurrentUser` (fail-closed) + `requireCan`.

## RBAC

### `src/lib/permissions.ts` — PURO y CLIENT-SAFE

- **Sin** `server-only`, **sin** Prisma, **sin** `next/headers`. Se importa desde
  componentes client para ocultar/deshabilitar controles.
- `can(user: User, capability: Capability): boolean` — recibe el `user` **por
  parámetro** (nunca de sesión). Matriz declarativa rol→capacidades.

### `src/lib/auth/authz.ts` — SERVER-ONLY (compone sesión + permisos)

- Vive **separado** de `permissions.ts` para no arrastrar la sesión al bundle de
  cliente (mismo patrón que separa `session.ts` de `session-db.ts`).
- `requireCan(capability): Promise<{ user: User } | { error: string }>`:
  `const user = await getCurrentUser()`; si `null` → `{ error: "No autenticado." }`;
  si `!can(user, capability)` → `{ error: "No autorizado." }`; si ok → `{ user }`.
  Las actions usan el `user` devuelto (evita un segundo `getCurrentUser`).
- `requireRole(role)` / guard de página análogo para gating de rutas rol-only.

### Capacidades y matriz

| Capacidad | admin | reviewer | auditor | developer |
|---|:-:|:-:|:-:|:-:|
| `review:decide` | ✅ | ✅ | ❌ | ❌ |
| `review:comment` | ✅ | ✅ | ❌ | ❌ |
| `policy:write` | ✅ | ❌ | ❌ | ❌ |
| `policy:publish` | ✅ | ❌ | ❌ | ❌ |
| `runtime:emergency_stop` | ✅ | ✅ | ❌ | ❌ |
| `agent:pause` | ✅ | ✅ | ❌ | ✅ |
| `settings:manage` | ✅ | ❌ | ❌ | ❌ |

(Las acciones de solo lectura —dashboard, agents, review, policies, audit— son
visibles para todos los roles autenticados.)

### Cobertura — TODA mutación mapeada (checklist)

Un `requireCan` olvidado es un agujero silencioso. Las 14 mutaciones:

| Server action | Capacidad exigida |
|---|---|
| `decideAction`, `decideManyActions`, `escalateAction` | `review:decide` |
| `addComment` | `review:comment` |
| `createPolicy`, `updatePolicy`, `archivePolicy` | `policy:write` |
| `publishPolicy` | `policy:publish` |
| `engageEmergencyStop`, `releaseEmergencyStop` | `runtime:emergency_stop` |
| `pauseAgent`, `resumeAgent` | `agent:pause` |
| `markNotificationRead`, `markAllNotificationsRead` | **solo sesión** (recurso propio; ya validan ownership por `userId`) |

Las de notificación no exigen capacidad de rol, pero **sí requieren sesión**:
dependen de que `getCurrentUser()` ya no devuelva el admin fantasma (cambio 1).

### Defensa en profundidad

- **Server actions (frontera real):** cada mutación empieza por `requireCan(...)`;
  si `{ error }`, devuelve el error y **no ejecuta**.
- **UI (solo UX):** botones/controles ocultos o deshabilitados según `can(user, ...)`
  calculado en server y pasado por props. Nunca es la única barrera.
- **Páginas rol-only:** `/settings` exige `settings:manage`; el server component
  hace el guard y renderiza `<AccessDenied/>` (403) en vez de romper.

## Acceso denegado

- `src/components/feedback/access-denied.tsx`: estado 403 reutilizable (título,
  explicación, enlace a una ruta permitida). Copy en castellano.
- Guard de página que lo renderiza cuando el rol no alcanza.

## Consumidores a tocar

- `src/app/layout.tsx`: `getCurrentUser()` desde sesión; si `null` → `redirect`.
  Pasa `user` + `organization` + capacidades relevantes por props al shell/top-bar.
- `src/components/app-shell/top-bar.tsx`: recibe `user`/`organization` por **props**
  (se elimina el import de `session.ts`); añade botón **Cerrar sesión** (`logout`).
- Las 4 server actions: anteponer `requireCan` según la tabla; usar el `user`
  devuelto como actor.
- **Borrar `src/lib/session.ts`** (stub sync): ya nadie lo importa tras migrar
  top-bar a props.

## Infra / dependencias

- Nuevas deps: `jose`, `bcryptjs`, `@types/bcryptjs` (dev).
- Env: `AUTH_SECRET` (obligatorio, fail-fast). Añadir a `.env` y a
  `.env.example`/docs de despliegue.

## Testing

- **Puros:** `permissions` (matriz completa por rol×capacidad), `validateCredentials`,
  `password` (hash/verify roundtrip + verify con hash `null` = false).
- **Actions:** `login` (feliz, contraseña incorrecta, usuario inactivo, email
  inexistente → todos error genérico), `logout`; `requireCan` (auditor no decide,
  developer no escribe política, reviewer no gestiona settings).
- **Sesión:** `getCurrentUser` devuelve `null` sin cookie, con firma inválida, con
  usuario `disabled` (revalidación de status).

## Orden de construcción (2 slices, 1 commit por paso atómico)

1. **Auth core:** migración `passwordHash` + seed; `auth/config`, `auth/session`,
   `auth/password`, `auth/credentials`; login/logout + grupo `(auth)`; middleware;
   `getCurrentUser` fail-closed; migrar top-bar a props + logout; borrar `session.ts`.
   Al cerrar: se entra por login, el resto de rutas quedan protegidas.
2. **RBAC:** `permissions.ts` + matriz; `auth/authz` (`requireCan`/`requireRole`);
   `requireCan` en las 12 mutaciones de rol; gating de UI por `can()`;
   `<AccessDenied/>` + guard de `/settings`.

## Fuera de alcance (YAGNI)

- Signup, reset de contraseña, verificación por email, OAuth, MFA.
- Rate limiting del login, revocación explícita de sesiones / `sessionVersion`
  (cubierto por exp corta + revalidación de status).
- Multi-org y el **scoping por `organizationId`** en los `findUnique(id)` de
  `updatePolicy`/`publishPolicy`/`archivePolicy`/`decideAction`/`pauseAgent`
  (IDOR latente; correcto en single-org, **deuda conocida** a auditar en multi-org;
  `markNotificationRead` ya valida pertenencia y es el patrón a replicar).

## Deuda conocida anotada (no se implementa aquí)

- **TOCTOU** en `decideAction`/`decideManyActions`: entre leer `status` y el
  `update` no se recomprueba; dos revisores en paralelo → last-write-wins. Para
  varios revisores conviene un `updateMany` con `where: { status: "needs_approval" }`
  que devuelva count. Toca la misma transacción, por eso queda anotado.
- **`AuditEvent` para cambios de `/policies` y decisiones de `/review`**: hoy solo
  escriben filas `Approval`/`Policy`, no `AuditEvent` (hueco **preexistente**, no lo
  introduce esta fase). Si "auditar cada cambio de configuración" es pilar, los
  cambios de política deberían dejar rastro en `AuditEvent`. Fuera de Fase 11.
