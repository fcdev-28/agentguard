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
