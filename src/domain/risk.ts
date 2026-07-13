/** Niveles de riesgo compartidos por Tool y AgentAction (ver docs/DATA_MODEL.md). */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** Etiqueta visible en castellano para cada nivel de riesgo. */
export const riskLevelLabel: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

/** Peso de cada nivel de riesgo para ordenar de más a menos urgente. */
export const riskRank: Record<RiskLevel, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};
