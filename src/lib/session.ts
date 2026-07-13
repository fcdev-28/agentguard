/**
 * Sesión simulada.
 * Hasta que exista autenticación real (fase 11), el shell asume un usuario
 * activo fijo: el administrador de la organización semilla. Centralizar aquí
 * el "usuario actual" evita esparcir referencias a demo-data por la UI y deja
 * un único punto que sustituir cuando llegue la sesión real.
 */
import { organization, users } from "@/data/demo-data";
import type { Organization, User } from "@/domain";

export const currentUser: User =
  users.find((u) => u.role === "admin") ?? users[0];
export const currentOrganization: Organization = organization;
