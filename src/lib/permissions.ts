import type { User, UserRole } from "@/domain";

/**
 * Capacidades de RBAC: cada una protege una mutación concreta (o el acceso a
 * una pantalla rol-only, como `/settings`). Puro y **client-safe**: sin
 * `server-only`, sin Prisma, sin `next/headers`. Se importa tanto desde
 * `auth/authz.ts` (server, frontera real) como desde componentes cliente
 * para ocultar o deshabilitar controles que el servidor rechazaría igual.
 */
export type Capability =
  | "review:decide"
  | "review:comment"
  | "policy:write"
  | "policy:publish"
  | "runtime:emergency_stop"
  | "agent:pause"
  | "settings:manage";

/** Matriz declarativa rol → capacidades. Única fuente de verdad de RBAC. */
const ROLE_CAPABILITIES: Record<UserRole, ReadonlySet<Capability>> = {
  admin: new Set<Capability>([
    "review:decide",
    "review:comment",
    "policy:write",
    "policy:publish",
    "runtime:emergency_stop",
    "agent:pause",
    "settings:manage",
  ]),
  reviewer: new Set<Capability>([
    "review:decide",
    "review:comment",
    "runtime:emergency_stop",
    "agent:pause",
  ]),
  auditor: new Set<Capability>(),
  developer: new Set<Capability>(["agent:pause"]),
};

/** `true` si el rol del usuario incluye la capacidad indicada. */
export function can(user: User, capability: Capability): boolean {
  return ROLE_CAPABILITIES[user.role].has(capability);
}
