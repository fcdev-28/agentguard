# Cableado de la UI de AgentGuard a Prisma

## Contexto y objetivo

AgentGuard hoy funciona sobre datos simulados (`src/data/demo-data.ts`) con mutaciones en memoria (context providers). La fase 10 ya añadió persistencia real: esquema Prisma, migración inicial aplicada contra PostgreSQL/Neon, cliente singleton en `src/lib/prisma.ts` (`@prisma/adapter-pg`), y seed que carga los datos demo en la BD.

Objetivo de esta fase: conectar la UI a esa BD, reemplazando los imports de `demo-data.ts` por datos reales, tanto en lectura como en escritura, sin romper la UX en ningún estado intermedio.

## Enfoque general

Infraestructura de datos compartida + slices verticales por pantalla. Cada pantalla se migra ENTERA (lee de BD y escribe en BD) antes de pasar a la siguiente. Las pantallas aún no migradas siguen sobre demo-data + providers, consistentes (solo que no persisten).

Se descarta "toda la lectura primero y la escritura después" porque dejaría un estado roto: páginas leyendo de BD mientras las mutaciones siguen en memoria harían que, al recargar, las decisiones no persistidas desaparezcan.

## Componentes del diseño

1. **Capa de acceso a datos (repositorio).** Módulos nuevos en `src/data/` por entidad (`actions.ts`, `agents.ts`, `policies.ts`, `audit.ts`, `users.ts`, `notifications.ts`, `comments.ts`) con funciones `getX()`, `getXById()`, etc., que consultan Prisma (`src/lib/prisma.ts`) y devuelven tipos de `src/domain` (no tipos de Prisma). Sustituyen a `demo-data.ts` como fuente de import; `demo-data.ts` queda solo para el seed.

2. **Estrategia de tipos: mappers, dominio intacto.** `src/domain` sigue siendo el contrato de la app. Cada repositorio traduce filas de Prisma a tipos de dominio con un mapper (`prismaAction → AgentAction`, etc.). Detalle crítico: Prisma devuelve `Date` y el dominio usa timestamps string (los parsea `src/lib/format.ts`), así que el mapper hace `date.toISOString()`. Los componentes y utilidades de `lib/` no cambian de firma. Los enums coinciden 1:1, sin traducción.

3. **Lectura: subir la carga de datos al server.** Las 9 páginas server pasan de importar de demo-data a `await getX()` del repositorio. Las islas cliente que hoy importan demo-data directamente (bloques de dashboard, `review-screen`, `command-palette`, `notification-store`) dejan de importar datos y los reciben por props desde la página server que las monta. Los providers reciben su estado inicial (`initialActions`, `initialComments`, `initialNotifications`) por props sembradas desde el server.

4. **Escritura: server actions + revalidación.** Las mutaciones de los 4 providers se respaldan con server actions:
   - Review: `decideAction`, `decideMany`, `escalateAction`.
   - Comment: `addComment`.
   - Notification: `markAsRead`, `markAllAsRead`.
   - Runtime: `engageEmergencyStop`, `releaseEmergencyStop`, `pauseAgent`, `resumeAgent` (además escriben un `AuditEvent`).

   Los providers se mantienen para UI optimista, pero cada mutación llama a su server action y después a `revalidatePath()`. Se prefiere esto a eliminar los providers: mejor UX y menos churn.

5. **Sesión.** `src/lib/session.ts` hoy extrae user/org del seed; se adapta para leerlos de la BD (org y usuario actual fijos hasta la auth real de la fase 11). Cambio mínimo y aislado.

## Secuencia de entrega (una PR por slice)

1. Infraestructura compartida: repositorios + mappers + `session.ts` sobre BD, y migrar las pantallas de solo lectura sin mutaciones (`/agents`, `/audit`, `/settings`, lectura del dashboard). Valida el patrón de lectura.
2. `/review` end-to-end: lectura + server actions (decidir, decidir en lote, escalar, comentar). Slice de referencia del patrón de escritura.
3. Notificaciones + Runtime (emergency stop, pausar/reanudar agente): globales, tocan varias pantallas.
4. `/policies` (incluye crear `/policies/[policyId]`, que hoy no existe en el filesystem; solo lo mínimo para no romper enlaces).
5. Repaso final: estados de carga y error por pantalla, y borrado de imports muertos de demo-data.

## Fuera de alcance (YAGNI)

- Autenticación real (fase 11).
- Paginación en servidor.
- Optimistic locking.
- `/policies/[policyId]` como edición completa de política (solo el mínimo para no romper enlaces).

## Riesgos y decisiones

- **Desajuste `Date` (Prisma) vs timestamp string (dominio):** resuelto con conversión en el mapper; evita tocar `format.ts` y firmas de componentes.
- **Providers en memoria vs server actions:** se conservan los providers como capa optimista y se persiste vía server action + `revalidatePath`, en lugar de reescribir la gestión de estado.
- **Consistencia intermedia:** garantizada migrando pantalla por pantalla al completo (lectura+escritura), nunca media pantalla.
