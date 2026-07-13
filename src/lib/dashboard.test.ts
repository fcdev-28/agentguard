import { describe, it, expect } from "vitest";
import type { Agent, AgentAction, Policy } from "@/domain";
import {
  isPendingReview,
  getPendingActions,
  getActiveAgents,
  getRiskBreakdown,
  getRecentPolicies,
} from "@/lib/dashboard";

function action(partial: Partial<AgentAction>): AgentAction {
  return {
    id: "a1",
    organizationId: "org1",
    agentId: "ag1",
    toolId: "t1",
    policyId: null,
    title: "Acción",
    summary: "",
    actionType: "send_email",
    status: "needs_approval",
    riskLevel: "medium",
    payload: {},
    policyResult: null,
    approvalDueAt: null,
    createdAt: "2026-07-12T09:00:00.000Z",
    updatedAt: "2026-07-12T09:00:00.000Z",
    executedAt: null,
    ...partial,
  };
}

function agent(partial: Partial<Agent>): Agent {
  return {
    id: "ag1",
    organizationId: "org1",
    ownerId: "u1",
    name: "Agente",
    description: "",
    environment: "production",
    status: "active",
    mode: "enforce",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

function policy(partial: Partial<Policy>): Policy {
  return {
    id: "p1",
    organizationId: "org1",
    name: "Política",
    description: "",
    status: "active",
    version: 1,
    conditions: {},
    effect: "require_approval",
    approvalSlaMinutes: null,
    createdById: "u1",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    publishedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("isPendingReview", () => {
  it("es verdadero solo para estados a la espera de decisión", () => {
    expect(isPendingReview("needs_approval")).toBe(true);
    expect(isPendingReview("proposed")).toBe(true);
    expect(isPendingReview("escalated")).toBe(true);
    expect(isPendingReview("approved")).toBe(false);
    expect(isPendingReview("executed")).toBe(false);
    expect(isPendingReview("blocked")).toBe(false);
  });
});

describe("getPendingActions", () => {
  it("filtra pendientes y ordena por riesgo desc, luego fecha asc", () => {
    const input = [
      action({ id: "med", riskLevel: "medium", createdAt: "2026-07-12T08:00:00.000Z" }),
      action({ id: "done", status: "executed", riskLevel: "critical" }),
      action({ id: "critA", riskLevel: "critical", createdAt: "2026-07-12T07:00:00.000Z" }),
      action({ id: "critB", riskLevel: "critical", createdAt: "2026-07-12T06:00:00.000Z" }),
    ];
    const result = getPendingActions(input).map((a) => a.id);
    expect(result).toEqual(["critB", "critA", "med"]);
  });
});

describe("getActiveAgents", () => {
  it("solo devuelve agentes con status active", () => {
    const input = [
      agent({ id: "on", status: "active" }),
      agent({ id: "paused", status: "paused" }),
      agent({ id: "err", status: "error" }),
    ];
    expect(getActiveAgents(input).map((a) => a.id)).toEqual(["on"]);
  });
});

describe("getRiskBreakdown", () => {
  it("cuenta las pendientes por nivel de riesgo", () => {
    const input = [
      action({ riskLevel: "critical" }),
      action({ riskLevel: "high" }),
      action({ riskLevel: "high" }),
      action({ riskLevel: "low" }),
    ];
    expect(getRiskBreakdown(input)).toEqual({ critical: 1, high: 2, medium: 0, low: 1 });
  });
});

describe("getRecentPolicies", () => {
  it("solo activas, ordenadas por publishedAt desc, recortadas al límite", () => {
    const input = [
      policy({ id: "old", publishedAt: "2026-07-01T00:00:00.000Z" }),
      policy({ id: "draft", status: "draft", publishedAt: "2026-07-10T00:00:00.000Z" }),
      policy({ id: "new", publishedAt: "2026-07-05T00:00:00.000Z" }),
    ];
    expect(getRecentPolicies(input, 4).map((p) => p.id)).toEqual(["new", "old"]);
  });
});
