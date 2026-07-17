/**
 * Traduce el efecto que decide `evaluatePolicy` al estado inicial de la
 * `AgentAction` recién ingerida. `escalate` entra como `needs_approval`: se
 * escalará automáticamente al vencer su SLA (ver `/api/cron/escalate`).
 */
import type { ActionStatus, PolicyEffect } from "@/domain";

const EFFECT_STATUS: Record<PolicyEffect, ActionStatus> = {
  allow: "allowed",
  block: "blocked",
  require_approval: "needs_approval",
  escalate: "needs_approval",
};

export function effectToStatus(effect: PolicyEffect): ActionStatus {
  return EFFECT_STATUS[effect];
}
