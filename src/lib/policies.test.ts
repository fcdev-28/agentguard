import { describe, it, expect } from "vitest";
import type { AgentAction, Policy } from "@/domain";
import { getPolicies, getPolicyById, getAffectedActions } from "@/lib/policies";
import type { PolicyEvalContext } from "@/lib/policy-eval";

function policy(partial: Partial<Policy>): Policy {
  return {
    id: "p1",
    organizationId: "org1",
    name: "Política",
    description: "",
    status: "active",
    version: 1,
    conditions: {},
    effect: "allow",
    approvalSlaMinutes: null,
    createdById: "usr1",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    publishedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

function action(partial: Partial<AgentAction>): AgentAction {
  return {
    id: "a1",
    organizationId: "org1",
    agentId: "ag1",
    toolId: "t1",
    policyId: null,
    title: "Acción",
    summary: "",
    actionType: "issue_refund",
    status: "proposed",
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

const emptyCtx: PolicyEvalContext = { tools: [], agents: [], permissions: [] };

describe("getPolicies", () => {
  it("ordena por severidad de estado (active > draft > archived)", () => {
    const input = [
      policy({ id: "archived", status: "archived", publishedAt: null }),
      policy({ id: "draft", status: "draft", publishedAt: null }),
      policy({
        id: "active",
        status: "active",
        publishedAt: "2026-06-01T00:00:00.000Z",
      }),
    ];
    expect(getPolicies(input).map((p) => p.id)).toEqual([
      "active",
      "draft",
      "archived",
    ]);
  });

  it("dentro de la misma severidad, ordena por publishedAt desc", () => {
    const input = [
      policy({
        id: "old",
        status: "active",
        publishedAt: "2026-01-01T00:00:00.000Z",
      }),
      policy({
        id: "new",
        status: "active",
        publishedAt: "2026-06-01T00:00:00.000Z",
      }),
    ];
    expect(getPolicies(input).map((p) => p.id)).toEqual(["new", "old"]);
  });

  it("las políticas sin publicar quedan al final de su grupo de estado", () => {
    const input = [
      policy({
        id: "unpublished",
        status: "active",
        publishedAt: null,
        updatedAt: "2026-07-01T00:00:00.000Z",
      }),
      policy({
        id: "published",
        status: "active",
        publishedAt: "2026-01-01T00:00:00.000Z",
      }),
    ];
    expect(getPolicies(input).map((p) => p.id)).toEqual([
      "published",
      "unpublished",
    ]);
  });

  it("a igualdad de publishedAt (ambas null), ordena por updatedAt desc", () => {
    const input = [
      policy({
        id: "old",
        status: "draft",
        publishedAt: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      policy({
        id: "new",
        status: "draft",
        publishedAt: null,
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
    ];
    expect(getPolicies(input).map((p) => p.id)).toEqual(["new", "old"]);
  });
});

describe("getPolicyById", () => {
  it("devuelve la política cuando existe", () => {
    const input = [policy({ id: "p1" }), policy({ id: "p2" })];
    expect(getPolicyById(input, "p2")?.id).toBe("p2");
  });

  it("devuelve undefined si no existe", () => {
    const input = [policy({ id: "p1" })];
    expect(getPolicyById(input, "nope")).toBeUndefined();
  });
});

describe("getAffectedActions", () => {
  it("devuelve las acciones cuyas condiciones casan con la política, más recientes primero", () => {
    const pol = policy({
      id: "p1",
      conditions: { actionType: "issue_refund" },
    });
    const input = [
      action({
        id: "old",
        actionType: "issue_refund",
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
      action({
        id: "new",
        actionType: "issue_refund",
        createdAt: "2026-07-10T00:00:00.000Z",
      }),
      action({
        id: "otro",
        actionType: "send_email",
        createdAt: "2026-07-11T00:00:00.000Z",
      }),
    ];
    expect(getAffectedActions(pol, input, emptyCtx).map((a) => a.id)).toEqual([
      "new",
      "old",
    ]);
  });

  it("recorta al límite indicado", () => {
    const pol = policy({
      id: "p1",
      conditions: { actionType: "issue_refund" },
    });
    const input = [
      action({
        id: "a1",
        actionType: "issue_refund",
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
      action({
        id: "a2",
        actionType: "issue_refund",
        createdAt: "2026-07-05T00:00:00.000Z",
      }),
      action({
        id: "a3",
        actionType: "issue_refund",
        createdAt: "2026-07-10T00:00:00.000Z",
      }),
    ];
    expect(
      getAffectedActions(pol, input, emptyCtx, 2).map((a) => a.id),
    ).toEqual(["a3", "a2"]);
  });

  it("incluye una política en borrador (previsualización de edición sin publicar)", () => {
    const pol = policy({
      id: "p1",
      status: "draft",
      conditions: { actionType: "issue_refund" },
    });
    const input = [action({ id: "a1", actionType: "issue_refund" })];
    expect(getAffectedActions(pol, input, emptyCtx).map((a) => a.id)).toEqual([
      "a1",
    ]);
  });

  it("devuelve vacío si ninguna acción casa", () => {
    const pol = policy({
      id: "p1",
      conditions: { actionType: "issue_refund" },
    });
    const input = [action({ id: "a1", actionType: "send_email" })];
    expect(getAffectedActions(pol, input, emptyCtx)).toEqual([]);
  });
});
