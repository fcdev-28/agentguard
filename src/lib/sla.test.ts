import { describe, it, expect } from "vitest";
import { computeApprovalDueAt, findOverdue } from "@/lib/sla";
import type { AgentAction } from "@/domain";

describe("computeApprovalDueAt", () => {
  it("devuelve null si la política no define SLA de aprobación", () => {
    expect(computeApprovalDueAt("2026-07-12T09:00:00.000Z", null)).toBeNull();
  });

  it("suma los minutos del SLA al momento de entrada", () => {
    expect(computeApprovalDueAt("2026-07-12T09:00:00.000Z", 30)).toBe(
      "2026-07-12T09:30:00.000Z",
    );
  });

  it("acepta un Date como momento de entrada", () => {
    const enteredAt = new Date("2026-07-12T09:00:00.000Z");
    expect(computeApprovalDueAt(enteredAt, 60)).toBe(
      "2026-07-12T10:00:00.000Z",
    );
  });
});

function pending(overrides: Partial<AgentAction>): AgentAction {
  return {
    id: "a",
    organizationId: "org",
    agentId: "agt",
    toolId: "tool",
    policyId: null,
    title: "t",
    summary: "s",
    actionType: "send_email",
    status: "needs_approval",
    riskLevel: "low",
    payload: {},
    policyResult: null,
    approvalDueAt: null,
    createdAt: "2026-07-17T09:00:00.000Z",
    updatedAt: "2026-07-17T09:00:00.000Z",
    executedAt: null,
    ...overrides,
  };
}

describe("findOverdue", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");

  it("devuelve las needs_approval vencidas", () => {
    const overdue = pending({
      id: "vencida",
      approvalDueAt: "2026-07-17T11:00:00.000Z",
    });
    expect(findOverdue([overdue], now)).toEqual(["vencida"]);
  });

  it("ignora las no vencidas y las sin approvalDueAt", () => {
    const future = pending({
      id: "futura",
      approvalDueAt: "2026-07-17T13:00:00.000Z",
    });
    const noSla = pending({ id: "sin-sla", approvalDueAt: null });
    expect(findOverdue([future, noSla], now)).toEqual([]);
  });

  it("ignora las que no están en needs_approval aunque estén vencidas", () => {
    const approved = pending({
      id: "aprobada",
      status: "approved",
      approvalDueAt: "2026-07-17T11:00:00.000Z",
    });
    expect(findOverdue([approved], now)).toEqual([]);
  });
});
