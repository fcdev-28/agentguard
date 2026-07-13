import { describe, it, expect } from "vitest";
import type { Agent, AgentAction, Permission, Policy, Tool } from "@/domain";
import { evaluatePolicy, type PolicyEvalContext } from "@/lib/policy-eval";

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

function tool(partial: Partial<Tool>): Tool {
  return {
    id: "t1",
    organizationId: "org1",
    name: "Herramienta",
    type: "email",
    status: "active",
    riskLevel: "medium",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

function agent(partial: Partial<Agent>): Agent {
  return {
    id: "ag1",
    organizationId: "org1",
    ownerId: "usr1",
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

function permission(partial: Partial<Permission>): Permission {
  return {
    id: "perm1",
    agentId: "ag1",
    toolId: "t1",
    scope: "read",
    status: "allowed",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

const emptyCtx: PolicyEvalContext = { tools: [], agents: [], permissions: [] };

describe("evaluatePolicy", () => {
  it("condición tool: casa cuando el tipo de la herramienta de la acción coincide", () => {
    const ctx: PolicyEvalContext = { ...emptyCtx, tools: [tool({ id: "t1", type: "billing" })] };
    const pol = policy({ id: "p1", conditions: { tool: "billing" }, effect: "block" });
    const act = action({ toolId: "t1" });
    expect(evaluatePolicy(act, [pol], ctx).policyId).toBe("p1");
  });

  it("condición tool: no casa cuando el tipo de la herramienta no coincide", () => {
    const ctx: PolicyEvalContext = { ...emptyCtx, tools: [tool({ id: "t1", type: "email" })] };
    const pol = policy({ id: "p1", conditions: { tool: "billing" }, effect: "block" });
    const act = action({ toolId: "t1" });
    expect(evaluatePolicy(act, [pol], ctx).policyId).toBeNull();
  });

  it("condición scope: casa cuando existe un permiso del agente con ese alcance sobre la herramienta", () => {
    const ctx: PolicyEvalContext = {
      ...emptyCtx,
      permissions: [permission({ agentId: "ag1", toolId: "t1", scope: "draft" })],
    };
    const pol = policy({ id: "p1", conditions: { scope: "draft" }, effect: "allow" });
    const act = action({ agentId: "ag1", toolId: "t1" });
    expect(evaluatePolicy(act, [pol], ctx).policyId).toBe("p1");
  });

  it("condición scope: no casa cuando no existe permiso con ese alcance", () => {
    const ctx: PolicyEvalContext = {
      ...emptyCtx,
      permissions: [permission({ agentId: "ag1", toolId: "t1", scope: "read" })],
    };
    const pol = policy({ id: "p1", conditions: { scope: "write" }, effect: "allow" });
    const act = action({ agentId: "ag1", toolId: "t1" });
    expect(evaluatePolicy(act, [pol], ctx).policyId).toBeNull();
  });

  it("condición actionType: casa cuando el tipo de acción coincide", () => {
    const pol = policy({ id: "p1", conditions: { actionType: "change_permission" }, effect: "escalate" });
    const act = action({ actionType: "change_permission" });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBe("p1");
  });

  it("condición actionType: no casa cuando el tipo de acción difiere", () => {
    const pol = policy({ id: "p1", conditions: { actionType: "change_permission" }, effect: "escalate" });
    const act = action({ actionType: "send_email" });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBeNull();
  });

  it("condición environment: casa cuando el entorno del agente coincide", () => {
    const ctx: PolicyEvalContext = { ...emptyCtx, agents: [agent({ id: "ag1", environment: "production" })] };
    const pol = policy({ id: "p1", conditions: { environment: "production" }, effect: "block" });
    const act = action({ agentId: "ag1" });
    expect(evaluatePolicy(act, [pol], ctx).policyId).toBe("p1");
  });

  it("condición environment: no casa cuando el entorno difiere", () => {
    const ctx: PolicyEvalContext = { ...emptyCtx, agents: [agent({ id: "ag1", environment: "sandbox" })] };
    const pol = policy({ id: "p1", conditions: { environment: "production" }, effect: "block" });
    const act = action({ agentId: "ag1" });
    expect(evaluatePolicy(act, [pol], ctx).policyId).toBeNull();
  });

  it("condición destructive: casa cuando el payload marca la acción como destructiva", () => {
    const pol = policy({ id: "p1", conditions: { destructive: true }, effect: "block" });
    const act = action({ payload: { destructive: true } });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBe("p1");
  });

  it("condición destructive: no casa cuando el payload no la marca como destructiva", () => {
    const pol = policy({ id: "p1", conditions: { destructive: true }, effect: "block" });
    const act = action({ payload: {} });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBeNull();
  });

  it("condición maxAmount: casa cuando el importe supera el umbral", () => {
    const pol = policy({ id: "p1", conditions: { maxAmount: 200 }, effect: "require_approval" });
    const act = action({ payload: { amount: 480 } });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBe("p1");
  });

  it("condición maxAmount: no casa cuando el importe está por debajo o igual al umbral", () => {
    const pol = policy({ id: "p1", conditions: { maxAmount: 200 }, effect: "require_approval" });
    const act = action({ payload: { amount: 150 } });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBeNull();
  });

  it("condición minRisk: casa cuando el riesgo de la acción es igual o mayor", () => {
    const pol = policy({ id: "p1", conditions: { minRisk: "high" }, effect: "require_approval" });
    const act = action({ riskLevel: "critical" });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBe("p1");
  });

  it("condición minRisk: no casa cuando el riesgo de la acción es menor", () => {
    const pol = policy({ id: "p1", conditions: { minRisk: "high" }, effect: "require_approval" });
    const act = action({ riskLevel: "medium" });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBeNull();
  });

  it("fail-closed: una clave de condición desconocida hace que la política no case", () => {
    const pol = policy({ id: "p1", conditions: { unknownKey: "valor" }, effect: "block" });
    const act = action({});
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBeNull();
  });

  it("ignora políticas en borrador aunque sus condiciones casen", () => {
    const pol = policy({ id: "p1", status: "draft", conditions: { minRisk: "high" }, effect: "require_approval" });
    const act = action({ riskLevel: "critical" });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBeNull();
  });

  it("ignora políticas archivadas aunque sus condiciones casen", () => {
    const pol = policy({ id: "p1", status: "archived", conditions: { minRisk: "high" }, effect: "require_approval" });
    const act = action({ riskLevel: "critical" });
    expect(evaluatePolicy(act, [pol], emptyCtx).policyId).toBeNull();
  });

  it("sin ninguna política que case, permite por defecto", () => {
    const pol = policy({ id: "p1", conditions: { actionType: "issue_refund" }, effect: "block" });
    const act = action({ actionType: "send_email" });
    const result = evaluatePolicy(act, [pol], emptyCtx);
    expect(result).toEqual({
      policyId: null,
      effect: "allow",
      reason: "Ninguna política aplica; permitida por defecto.",
      matched: [],
    });
  });

  it("precedencia: entre varias que casan, gana la de efecto más severo (block > escalate > require_approval > allow)", () => {
    const ctx: PolicyEvalContext = {
      ...emptyCtx,
      agents: [agent({ id: "ag1", environment: "production" })],
    };
    const allowPol = policy({ id: "allow", conditions: { environment: "production" }, effect: "allow" });
    const approvalPol = policy({
      id: "approval",
      conditions: { environment: "production" },
      effect: "require_approval",
    });
    const escalatePol = policy({ id: "escalate", conditions: { environment: "production" }, effect: "escalate" });
    const blockPol = policy({ id: "block", conditions: { environment: "production" }, effect: "block" });
    const act = action({ agentId: "ag1" });

    const result = evaluatePolicy(act, [allowPol, approvalPol, escalatePol, blockPol], ctx);
    expect(result.policyId).toBe("block");
    expect(result.matched.map((p) => p.id).sort()).toEqual(["allow", "approval", "block", "escalate"]);
  });

  it("desempate por publishedAt desc cuando varias políticas casan con el mismo efecto", () => {
    const ctx: PolicyEvalContext = { ...emptyCtx, agents: [agent({ id: "ag1", environment: "production" })] };
    const older = policy({
      id: "older",
      conditions: { environment: "production" },
      effect: "block",
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = policy({
      id: "newer",
      conditions: { environment: "production" },
      effect: "block",
      publishedAt: "2026-06-01T00:00:00.000Z",
    });
    const act = action({ agentId: "ag1" });
    expect(evaluatePolicy(act, [older, newer], ctx).policyId).toBe("newer");
  });

  it("desempate: las políticas sin publicar (publishedAt null) quedan al final", () => {
    const ctx: PolicyEvalContext = { ...emptyCtx, agents: [agent({ id: "ag1", environment: "production" })] };
    const unpublished = policy({
      id: "unpublished",
      conditions: { environment: "production" },
      effect: "block",
      publishedAt: null,
    });
    const published = policy({
      id: "published",
      conditions: { environment: "production" },
      effect: "block",
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const act = action({ agentId: "ag1" });
    expect(evaluatePolicy(act, [unpublished, published], ctx).policyId).toBe("published");
  });

  it("genera un reason legible a partir de la política ganadora", () => {
    const pol = policy({ id: "p1", name: "Bloqueo de borrados", effect: "block" });
    const act = action({});
    expect(evaluatePolicy(act, [pol], emptyCtx).reason).toBe("Bloqueo de borrados: Bloquear.");
  });
});
