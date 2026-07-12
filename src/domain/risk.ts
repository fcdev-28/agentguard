/** Niveles de riesgo compartidos por Tool y AgentAction (ver docs/DATA_MODEL.md). */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** Etiqueta visible en castellano para cada nivel de riesgo. */
export const riskLevelLabel: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};
