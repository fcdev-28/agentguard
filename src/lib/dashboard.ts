import type {
  Agent,
  AgentAction,
  ActionStatus,
  Policy,
  RiskLevel,
} from "@/domain";

/** Estados en los que una acción espera una decisión humana. */
const PENDING_STATUSES: ReadonlySet<ActionStatus> = new Set([
  "needs_approval",
  "proposed",
  "escalated",
]);

/** Peso de cada nivel de riesgo para ordenar de más a menos urgente. */
const riskRank: Record<RiskLevel, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

/** ¿La acción está a la espera de decisión humana? */
export function isPendingReview(status: ActionStatus): boolean {
  return PENDING_STATUSES.has(status);
}

/** Acciones pendientes, ordenadas por riesgo desc y luego por antigüedad asc. */
export function getPendingActions(actions: AgentAction[]): AgentAction[] {
  return actions
    .filter((a) => isPendingReview(a.status))
    .sort((a, b) => {
      const byRisk = riskRank[b.riskLevel] - riskRank[a.riskLevel];
      if (byRisk !== 0) return byRisk;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

/** Agentes actualmente activos. */
export function getActiveAgents(agents: Agent[]): Agent[] {
  return agents.filter((a) => a.status === "active");
}

/** Conteo de acciones pendientes por nivel de riesgo. */
export function getRiskBreakdown(
  pending: AgentAction[],
): Record<RiskLevel, number> {
  const breakdown: Record<RiskLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const action of pending) {
    breakdown[action.riskLevel] += 1;
  }
  return breakdown;
}

/** Políticas activas, ordenadas por fecha de publicación desc, recortadas. */
export function getRecentPolicies(policies: Policy[], limit = 4): Policy[] {
  return policies
    .filter((p) => p.status === "active")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}
