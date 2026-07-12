export type AgentEnvironment = "sandbox" | "production";
export type AgentStatus = "active" | "paused" | "disabled" | "error";
export type AgentMode = "observe" | "enforce";

/** Sistema de IA que propone o ejecuta acciones. */
export interface Agent {
  id: string;
  organizationId: string;
  ownerId: string;
  name: string;
  description: string;
  environment: AgentEnvironment;
  status: AgentStatus;
  mode: AgentMode;
  createdAt: string;
  updatedAt: string;
}
