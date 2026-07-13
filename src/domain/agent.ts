export type AgentEnvironment = "sandbox" | "production";
export type AgentStatus = "active" | "paused" | "disabled" | "error";
export type AgentMode = "observe" | "enforce";

/** Etiqueta visible en castellano para cada estado de agente. */
export const agentStatusLabel: Record<AgentStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  disabled: "Deshabilitado",
  error: "Error",
};

/** Etiqueta visible en castellano para cada modo de agente. */
export const agentModeLabel: Record<AgentMode, string> = {
  observe: "Observación",
  enforce: "Aplicación",
};

/** Etiqueta visible en castellano para cada entorno de agente. */
export const agentEnvironmentLabel: Record<AgentEnvironment, string> = {
  sandbox: "Sandbox",
  production: "Producción",
};

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
