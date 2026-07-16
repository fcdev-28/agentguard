import type { Policy, PolicyEffect, PolicyStatus, AgentAction } from "@/domain";
import { policyMatchesAction, type PolicyEvalContext } from "@/lib/policy-eval";

/** Campos editables de una política, tanto al crearla como al actualizarla. */
export interface PolicyInput {
  name: string;
  description: string;
  effect: PolicyEffect;
  conditions: Record<string, unknown>;
  approvalSlaMinutes: number | null;
}

/** Transiciones de estado soportadas para una política. */
export type PolicyStatusTransition = "publish" | "archive";

/** Efectos válidos de una política (para validar `PolicyInput.effect`). */
const VALID_POLICY_EFFECTS: ReadonlySet<PolicyEffect> = new Set([
  "allow",
  "block",
  "require_approval",
  "escalate",
]);

/**
 * Valida los campos editables de una política antes de crearla o
 * actualizarla. Función pura: no toca BD, solo comprueba invariantes.
 */
export function validatePolicyInput(
  input: PolicyInput,
): { ok: true } | { error: string } {
  if (!input.name.trim()) {
    return { error: "El nombre no puede estar vacío." };
  }
  if (!input.description.trim()) {
    return { error: "La descripción no puede estar vacía." };
  }
  if (!VALID_POLICY_EFFECTS.has(input.effect)) {
    return { error: "El efecto no es válido." };
  }
  if (
    input.approvalSlaMinutes !== null &&
    (!Number.isInteger(input.approvalSlaMinutes) ||
      input.approvalSlaMinutes <= 0)
  ) {
    return {
      error: "El SLA de aprobación debe ser un número entero positivo, o vacío.",
    };
  }
  if (
    typeof input.conditions !== "object" ||
    input.conditions === null ||
    Array.isArray(input.conditions)
  ) {
    return { error: "Las condiciones deben ser un objeto." };
  }
  return { ok: true };
}

/**
 * Calcula el estado resultante de aplicar una transición sobre el estado
 * actual de una política, o el motivo por el que no procede. Función pura.
 */
export function nextPolicyStatus(
  current: PolicyStatus,
  transition: PolicyStatusTransition,
): { status: PolicyStatus; publishedAt?: Date } | { error: string } {
  if (transition === "publish") {
    if (current === "active") {
      return { error: "La política ya está publicada." };
    }
    if (current === "archived") {
      return { error: "No se puede publicar una política archivada." };
    }
    return { status: "active", publishedAt: new Date() };
  }

  if (current === "archived") {
    return { error: "La política ya está archivada." };
  }
  return { status: "archived" };
}

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
export function getPolicyById(
  policies: Policy[],
  id: string,
): Policy | undefined {
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
