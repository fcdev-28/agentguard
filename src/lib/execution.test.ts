import { describe, expect, it } from "vitest";
import { applyExecutionResult, toEmailMessage } from "@/lib/execution";
import type { AgentAction } from "@/domain";

function action(overrides: Partial<AgentAction> = {}): AgentAction {
  return {
    id: "act_1",
    organizationId: "org_1",
    agentId: "agt_1",
    toolId: "tool_email",
    policyId: null,
    title: "Responder ticket 42",
    summary: "Responder al cliente sobre el reembolso",
    actionType: "send_email",
    status: "approved",
    riskLevel: "medium",
    payload: { to: "cliente@example.com", subject: "Tu reembolso" },
    policyResult: null,
    approvalDueAt: null,
    createdAt: "2026-07-17T09:00:00.000Z",
    updatedAt: "2026-07-17T09:00:00.000Z",
    executedAt: null,
    ...overrides,
  };
}

describe("toEmailMessage", () => {
  it("usa los campos del payload cuando existen", () => {
    expect(toEmailMessage(action())).toEqual({
      to: "cliente@example.com",
      subject: "Tu reembolso",
      body: "Responder al cliente sobre el reembolso",
    });
  });

  it("cae al título como asunto y al summary como cuerpo si faltan", () => {
    const msg = toEmailMessage(action({ payload: { to: "x@example.com" } }));
    expect(msg.subject).toBe("Responder ticket 42");
    expect(msg.body).toBe("Responder al cliente sobre el reembolso");
  });
});

describe("applyExecutionResult", () => {
  it("transiciona a executed cuando el envío tuvo éxito", () => {
    expect(applyExecutionResult("approved", { ok: true })).toEqual({
      status: "executed",
    });
    expect(applyExecutionResult("allowed", { ok: true })).toEqual({
      status: "executed",
    });
  });

  it("transiciona a failed cuando el envío falló", () => {
    expect(
      applyExecutionResult("approved", { ok: false, error: "smtp" }),
    ).toEqual({ status: "failed" });
  });

  it("rechaza ejecutar una acción que no está approved ni allowed", () => {
    const r = applyExecutionResult("needs_approval", { ok: true });
    expect("error" in r).toBe(true);
  });
});
