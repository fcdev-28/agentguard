import type {
  Agent,
  AgentAction,
  Permission,
  Policy,
  PolicyEffect,
  Tool,
} from "@/domain";
import { policyEffectLabel, riskRank } from "@/domain";
import type { RiskLevel } from "@/domain";

/** Datos de contexto necesarios para resolver las condiciones de una política. */
export interface PolicyEvalContext {
  tools: Tool[];
  agents: Agent[];
  permissions: Permission[];
}

/** Resultado de evaluar el conjunto de políticas activas sobre una acción. */
export interface PolicyEvaluation {
  policyId: string | null;
  effect: PolicyEffect;
  reason: string;
  /** Todas las políticas activas que casaron, por si el detalle quiere listarlas. */
  matched: Policy[];
}

/** Precedencia de efectos cuando varias políticas casan: gana el más severo. */
const EFFECT_SEVERITY: Record<PolicyEffect, number> = {
  block: 3,
  escalate: 2,
  require_approval: 1,
  allow: 0,
};

/**
 * ¿Casa una condición individual `{ key: value }` con la acción?
 * Cada clave tiene su propia semántica de resolución sobre la acción y el
 * contexto (herramienta, agente, permisos). Cualquier clave no reconocida
 * hace que la condición (y por tanto la política) NO case: fail-closed, para
 * que una política mal escrita nunca se interprete como "no aplica nada" y
 * deje pasar algo que debería bloquear o revisar.
 */
function matchesCondition(
  key: string,
  value: unknown,
  action: AgentAction,
  ctx: PolicyEvalContext,
): boolean {
  switch (key) {
    case "tool": {
      // Tipo de la herramienta usada por la acción (email/crm/billing/tasks).
      const tool = ctx.tools.find((t) => t.id === action.toolId);
      return tool?.type === value;
    }
    case "scope": {
      // El agente tiene un permiso con ese alcance sobre la herramienta de la acción.
      return ctx.permissions.some(
        (p) =>
          p.agentId === action.agentId &&
          p.toolId === action.toolId &&
          p.scope === value,
      );
    }
    case "actionType": {
      // Tipo de acción (send_email, issue_refund, ...).
      return action.actionType === value;
    }
    case "environment": {
      // Entorno (sandbox/production) del agente que propone la acción.
      const agent = ctx.agents.find((a) => a.id === action.agentId);
      return agent?.environment === value;
    }
    case "destructive": {
      // Marca explícita en el payload de que la acción es destructiva.
      return Boolean(action.payload.destructive) === value;
    }
    case "maxAmount": {
      // Casa cuando el importe de la acción SUPERA el umbral (la política actúa sobre el exceso).
      const amount = action.payload.amount;
      return (
        typeof amount === "number" &&
        typeof value === "number" &&
        amount > value
      );
    }
    case "minRisk": {
      // Casa cuando el riesgo de la acción es igual o mayor que el mínimo exigido.
      return riskRank[action.riskLevel] >= riskRank[value as RiskLevel];
    }
    default:
      // Clave desconocida: fail-closed, la política no casa.
      return false;
  }
}

/**
 * ¿Casan TODAS las condiciones de la política con la acción? No mira el
 * `status` de la política (eso lo decide `evaluatePolicy`); se exporta
 * aparte porque el detalle de política también la usa para previsualizar
 * "qué acciones afectaría" una política en borrador o en edición.
 */
export function policyMatchesAction(
  policy: Policy,
  action: AgentAction,
  ctx: PolicyEvalContext,
): boolean {
  return Object.entries(policy.conditions).every(([key, value]) =>
    matchesCondition(key, value, action, ctx),
  );
}

/**
 * Desempate entre políticas con el mismo efecto: gana la publicada más
 * recientemente; las que no se han publicado (`publishedAt: null`) quedan al
 * final, ya que una política sin publicar no debería imponerse sobre una que
 * sí está en vigor.
 */
function comparePublishedAt(a: Policy, b: Policy): number {
  if (a.publishedAt === null && b.publishedAt === null) return 0;
  if (a.publishedAt === null) return 1;
  if (b.publishedAt === null) return -1;
  return b.publishedAt.localeCompare(a.publishedAt);
}

/**
 * Evalúa las políticas activas de la organización sobre una acción y
 * devuelve la que gana, según la precedencia de efectos
 * `block > escalate > require_approval > allow`. Solo se consideran
 * políticas con `status === "active"` (las `draft` y `archived` no aplican).
 * Si ninguna política casa, la acción se permite por defecto.
 */
export function evaluatePolicy(
  action: AgentAction,
  policies: Policy[],
  ctx: PolicyEvalContext,
): PolicyEvaluation {
  const matched = policies
    .filter((p) => p.status === "active")
    .filter((p) => policyMatchesAction(p, action, ctx));

  if (matched.length === 0) {
    return {
      policyId: null,
      effect: "allow",
      reason: "Ninguna política aplica; permitida por defecto.",
      matched: [],
    };
  }

  const [winner] = [...matched].sort((a, b) => {
    const bySeverity = EFFECT_SEVERITY[b.effect] - EFFECT_SEVERITY[a.effect];
    if (bySeverity !== 0) return bySeverity;
    return comparePublishedAt(a, b);
  });

  return {
    policyId: winner.id,
    effect: winner.effect,
    reason: `${winner.name}: ${policyEffectLabel[winner.effect]}.`,
    matched,
  };
}
