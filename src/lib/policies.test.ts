import { describe, it, expect } from "vitest";
import type { AgentAction, Policy } from "@/domain";
import {
  getPolicies,
  getPolicyById,
  getAffectedActions,
  validatePolicyInput,
  nextPolicyStatus,
  type PolicyInput,
} from "@/lib/policies";
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

function policyInput(partial: Partial<PolicyInput> = {}): PolicyInput {
  return {
    name: "Reembolsos altos",
    description: "Requiere aprobación por encima de 200 EUR.",
    effect: "require_approval",
    conditions: { maxAmount: 200 },
    approvalSlaMinutes: 30,
    ...partial,
  };
}

describe("validatePolicyInput", () => {
  it("acepta un input válido", () => {
    expect(validatePolicyInput(policyInput())).toEqual({ ok: true });
  });

  it("acepta approvalSlaMinutes null (sin SLA)", () => {
    expect(
      validatePolicyInput(policyInput({ approvalSlaMinutes: null })),
    ).toEqual({ ok: true });
  });

  it("rechaza un nombre vacío (o solo espacios)", () => {
    expect(validatePolicyInput(policyInput({ name: "   " }))).toEqual({
      error: "El nombre no puede estar vacío.",
    });
  });

  it("rechaza una descripción vacía (o solo espacios)", () => {
    expect(validatePolicyInput(policyInput({ description: "  " }))).toEqual({
      error: "La descripción no puede estar vacía.",
    });
  });

  it("rechaza un efecto que no sea un PolicyEffect válido", () => {
    expect(
      validatePolicyInput(
        policyInput({ effect: "not_an_effect" as Policy["effect"] }),
      ),
    ).toEqual({ error: "El efecto no es válido." });
  });

  it("rechaza approvalSlaMinutes no entero", () => {
    expect(
      validatePolicyInput(policyInput({ approvalSlaMinutes: 30.5 })),
    ).toEqual({
      error:
        "El SLA de aprobación debe ser un número entero positivo, o vacío.",
    });
  });

  it("rechaza approvalSlaMinutes negativo o cero", () => {
    expect(validatePolicyInput(policyInput({ approvalSlaMinutes: 0 }))).toEqual(
      {
        error:
          "El SLA de aprobación debe ser un número entero positivo, o vacío.",
      },
    );
  });

  it("rechaza conditions que no sea un objeto (array)", () => {
    expect(
      validatePolicyInput(
        policyInput({
          conditions: [] as unknown as Record<string, unknown>,
        }),
      ),
    ).toEqual({ error: "Las condiciones deben ser un objeto." });
  });
});

describe("nextPolicyStatus", () => {
  it("publica una política en borrador (fija publishedAt)", () => {
    const result = nextPolicyStatus("draft", "publish");
    expect("status" in result && result.status).toBe("active");
    expect("status" in result && result.publishedAt).toBeInstanceOf(Date);
  });

  it("no permite publicar una política ya activa", () => {
    expect(nextPolicyStatus("active", "publish")).toEqual({
      error: "La política ya está publicada.",
    });
  });

  it("no permite publicar una política archivada", () => {
    expect(nextPolicyStatus("archived", "publish")).toEqual({
      error: "No se puede publicar una política archivada.",
    });
  });

  it("archiva una política en borrador", () => {
    expect(nextPolicyStatus("draft", "archive")).toEqual({
      status: "archived",
    });
  });

  it("archiva una política activa", () => {
    expect(nextPolicyStatus("active", "archive")).toEqual({
      status: "archived",
    });
  });

  it("no permite archivar una política ya archivada", () => {
    expect(nextPolicyStatus("archived", "archive")).toEqual({
      error: "La política ya está archivada.",
    });
  });
});
