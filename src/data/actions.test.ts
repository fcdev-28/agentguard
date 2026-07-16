import { describe, it, expect } from "vitest";
import { mapAgentAction } from "./actions";

describe("mapAgentAction", () => {
  it("traduce una fila de Prisma a la AgentAction de dominio, con payload y policyResult", () => {
    const row = {
      id: "act_1",
      organizationId: "org_acme",
      agentId: "agt_billing",
      toolId: "tool_billing",
      policyId: "pol_refund_limit",
      title: "Emitir reembolso de 620€",
      summary: "Reembolso solicitado por el cliente tras una incidencia.",
      actionType: "issue_refund" as const,
      status: "needs_approval" as const,
      riskLevel: "high" as const,
      payload: { amount: 620, currency: "EUR" },
      policyResult: {
        policyId: "pol_refund_limit",
        effect: "require_approval",
        reason: "Supera el límite de 500€.",
      },
      approvalDueAt: new Date("2026-07-12T10:00:00.000Z"),
      createdAt: new Date("2026-07-12T08:00:00.000Z"),
      updatedAt: new Date("2026-07-12T08:00:00.000Z"),
      executedAt: null,
    };

    expect(mapAgentAction(row)).toEqual({
      id: "act_1",
      organizationId: "org_acme",
      agentId: "agt_billing",
      toolId: "tool_billing",
      policyId: "pol_refund_limit",
      title: "Emitir reembolso de 620€",
      summary: "Reembolso solicitado por el cliente tras una incidencia.",
      actionType: "issue_refund",
      status: "needs_approval",
      riskLevel: "high",
      payload: { amount: 620, currency: "EUR" },
      policyResult: {
        policyId: "pol_refund_limit",
        effect: "require_approval",
        reason: "Supera el límite de 500€.",
      },
      approvalDueAt: "2026-07-12T10:00:00.000Z",
      createdAt: "2026-07-12T08:00:00.000Z",
      updatedAt: "2026-07-12T08:00:00.000Z",
      executedAt: null,
    });
  });

  it("deja policyId, policyResult, approvalDueAt y executedAt en null cuando la acción no los tiene", () => {
    const row = {
      id: "act_2",
      organizationId: "org_acme",
      agentId: "agt_billing",
      toolId: "tool_billing",
      policyId: null,
      title: "Crear tarea de seguimiento",
      summary: "Tarea creada automáticamente.",
      actionType: "create_task" as const,
      status: "allowed" as const,
      riskLevel: "low" as const,
      payload: {},
      policyResult: null,
      approvalDueAt: null,
      createdAt: new Date("2026-07-12T08:00:00.000Z"),
      updatedAt: new Date("2026-07-12T08:00:00.000Z"),
      executedAt: null,
    };

    const result = mapAgentAction(row);
    expect(result.policyId).toBeNull();
    expect(result.policyResult).toBeNull();
    expect(result.approvalDueAt).toBeNull();
    expect(result.executedAt).toBeNull();
  });
});
