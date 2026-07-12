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
