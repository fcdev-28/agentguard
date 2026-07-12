export type PermissionScope = "read" | "draft" | "write" | "execute";
export type PermissionStatus = "allowed" | "restricted" | "blocked";

/** Conecta un agente con una herramienta y define qué puede hacer. */
export interface Permission {
  id: string;
  agentId: string;
  toolId: string;
  scope: PermissionScope;
  status: PermissionStatus;
  createdAt: string;
  updatedAt: string;
}
