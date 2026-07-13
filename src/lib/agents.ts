import type { Agent, AgentAction, AgentStatus, Permission, RiskLevel, Tool } from "@/domain";
import { riskRank } from "@/domain";

/**
 * Severidad de cada estado de agente para priorizar el inventario: un
 * agente con error necesita atención antes que uno activo, y este antes
 * que uno pausado o deshabilitado.
 */
const statusRank: Record<AgentStatus, number> = {
  error: 3,
  active: 2,
  paused: 1,
  disabled: 0,
};

/** Agentes para el inventario: primero por severidad de estado, luego por actualización más reciente. */
export function getAgents(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => {
    const byStatus = statusRank[b.status] - statusRank[a.status];
    if (byStatus !== 0) return byStatus;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/** Busca un agente por id. */
export function getAgentById(agents: Agent[], id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

/** Nivel de riesgo más alto entre las acciones del agente; null si no tiene ninguna. */
export function getAgentRecentRisk(
  actions: AgentAction[],
  agentId: string,
): RiskLevel | null {
  const agentActions = actions.filter((a) => a.agentId === agentId);
  if (agentActions.length === 0) return null;
  return agentActions.reduce<RiskLevel>(
    (highest, action) =>
      riskRank[action.riskLevel] > riskRank[highest] ? action.riskLevel : highest,
    agentActions[0].riskLevel,
  );
}

/** Fecha de la acción más reciente del agente; null si no tiene ninguna. */
export function getAgentLastActivityAt(
  actions: AgentAction[],
  agentId: string,
): string | null {
  const agentActions = actions.filter((a) => a.agentId === agentId);
  if (agentActions.length === 0) return null;
  return agentActions.reduce(
    (latest, action) => (action.createdAt > latest ? action.createdAt : latest),
    agentActions[0].createdAt,
  );
}

/** Herramientas conectadas al agente, resueltas a partir de sus permisos. */
export function getAgentTools(
  permissions: Permission[],
  tools: Tool[],
  agentId: string,
): Array<{ tool: Tool; scope: string; status: string }> {
  return permissions
    .filter((p) => p.agentId === agentId)
    .map((p): { tool: Tool; scope: string; status: string } | null => {
      const tool = tools.find((t) => t.id === p.toolId);
      if (!tool) return null;
      return { tool, scope: p.scope, status: p.status };
    })
    .filter((entry): entry is { tool: Tool; scope: string; status: string } => entry !== null);
}

/** Acciones del agente, más recientes primero, opcionalmente recortadas a `limit`. */
export function getAgentActions(
  actions: AgentAction[],
  agentId: string,
  limit?: number,
): AgentAction[] {
  const agentActions = actions
    .filter((a) => a.agentId === agentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return limit !== undefined ? agentActions.slice(0, limit) : agentActions;
}
