import type { RiskLevel } from "./risk";

export type ToolType = "email" | "crm" | "billing" | "tasks";
export type ToolStatus = "active" | "paused" | "disabled";

/** Herramienta o integración disponible para agentes. */
export interface Tool {
  id: string;
  organizationId: string;
  name: string;
  type: ToolType;
  status: ToolStatus;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

/** Etiqueta visible en castellano para cada tipo de herramienta. */
export const toolTypeLabel: Record<ToolType, string> = {
  email: "Correo",
  crm: "CRM",
  billing: "Facturación",
  tasks: "Tareas",
};

/** Etiqueta visible en castellano para cada estado de herramienta. */
export const toolStatusLabel: Record<ToolStatus, string> = {
  active: "Conectada",
  paused: "En pausa",
  disabled: "Desconectada",
};
