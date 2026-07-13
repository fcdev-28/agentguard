import type { Policy, PolicyStatus, AgentAction } from "@/domain";
import { policyMatchesAction, type PolicyEvalContext } from "@/lib/policy-eval";

/**
 * Severidad de cada estado de política para priorizar la lista: las activas
 * (en vigor) importan antes que las que están en borrador, y estas antes
 * que las archivadas.
 */
const statusRank: Record<PolicyStatus, number> = {
  active: 2,
  draft: 1,
  archived: 0,
};

/**
 * Políticas para el listado: primero por severidad de estado (activa >
 * borrador > archivada); dentro de cada estado, por fecha de publicación
 * desc (las no publicadas quedan al final) y, a igualdad, por última
 * actualización desc.
 */
export function getPolicies(policies: Policy[]): Policy[] {
  return [...policies].sort((a, b) => {
    const byStatus = statusRank[b.status] - statusRank[a.status];
    if (byStatus !== 0) return byStatus;

    if (a.publishedAt !== b.publishedAt) {
      if (a.publishedAt === null) return 1;
      if (b.publishedAt === null) return -1;
      const byPublished = b.publishedAt.localeCompare(a.publishedAt);
      if (byPublished !== 0) return byPublished;
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/** Busca una política por id. */
export function getPolicyById(policies: Policy[], id: string): Policy | undefined {
  return policies.find((p) => p.id === id);
}

/**
 * Acciones recientes cuyas condiciones casan con `policy`. Comprueba solo
 * las condiciones de esta política (no su precedencia frente a otras ni su
 * `status`), para poder previsualizar en vivo qué acciones afectaría una
 * política mientras se edita, incluida una que todavía está en borrador.
 */
export function getAffectedActions(
  policy: Policy,
  actions: AgentAction[],
  ctx: PolicyEvalContext,
  limit?: number,
): AgentAction[] {
  const affected = actions
    .filter((action) => policyMatchesAction(policy, action, ctx))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return limit !== undefined ? affected.slice(0, limit) : affected;
}
