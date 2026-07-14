export type UserRole = "admin" | "reviewer" | "auditor" | "developer";
export type UserStatus = "active" | "invited" | "disabled";

/** Persona que accede a AgentGuard. */
export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/** Etiqueta visible en castellano para cada rol de usuario. */
export const userRoleLabel: Record<UserRole, string> = {
  admin: "Administrador",
  reviewer: "Revisor",
  auditor: "Auditor",
  developer: "Desarrollador",
};

/** Etiqueta visible en castellano para cada estado de usuario. */
export const userStatusLabel: Record<UserStatus, string> = {
  active: "Activo",
  invited: "Invitado",
  disabled: "Deshabilitado",
};
