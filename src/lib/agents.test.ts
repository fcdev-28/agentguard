import { describe, it, expect } from "vitest";
import type { Agent, AgentAction, Permission, Tool } from "@/domain";
import {
  getAgents,
  getAgentById,
  getAgentRecentRisk,
  getAgentLastActivityAt,
  getAgentTools,
  getAgentActions,
} from "@/lib/agents";

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

describe("getAgents", () => {
  it("ordena por severidad de estado (error > active > paused > disabled)", () => {
    const input = [
      agent({
        id: "paused",
        status: "paused",
        updatedAt: "2026-07-10T00:00:00.000Z",
      }),
      agent({
        id: "disabled",
        status: "disabled",
        updatedAt: "2026-07-10T00:00:00.000Z",
      }),
      agent({
        id: "error",
        status: "error",
        updatedAt: "2026-07-10T00:00:00.000Z",
      }),
      agent({
        id: "active",
        status: "active",
        updatedAt: "2026-07-10T00:00:00.000Z",
      }),
    ];
    expect(getAgents(input).map((a) => a.id)).toEqual([
      "error",
      "active",
      "paused",
      "disabled",
    ]);
  });

  it("dentro de la misma severidad, ordena por updatedAt desc", () => {
    const input = [
      agent({
        id: "old",
        status: "active",
        updatedAt: "2026-07-01T00:00:00.000Z",
      }),
      agent({
        id: "new",
        status: "active",
        updatedAt: "2026-07-10T00:00:00.000Z",
      }),
    ];
    expect(getAgents(input).map((a) => a.id)).toEqual(["new", "old"]);
  });
});

describe("getAgentById", () => {
  it("devuelve el agente cuando existe", () => {
    const input = [agent({ id: "ag1" }), agent({ id: "ag2" })];
    expect(getAgentById(input, "ag2")?.id).toBe("ag2");
  });

  it("devuelve undefined si no existe", () => {
    const input = [agent({ id: "ag1" })];
    expect(getAgentById(input, "nope")).toBeUndefined();
  });
});

describe("getAgentRecentRisk", () => {
  it("devuelve el nivel de riesgo más alto entre las acciones del agente", () => {
    const input = [
      action({ id: "a1", agentId: "ag1", riskLevel: "low" }),
      action({ id: "a2", agentId: "ag1", riskLevel: "critical" }),
      action({ id: "a3", agentId: "ag1", riskLevel: "medium" }),
      action({ id: "a4", agentId: "otro", riskLevel: "critical" }),
    ];
    expect(getAgentRecentRisk(input, "ag1")).toBe("critical");
  });

  it("devuelve null si el agente no tiene acciones", () => {
    const input = [action({ agentId: "otro" })];
    expect(getAgentRecentRisk(input, "ag1")).toBeNull();
  });
});

describe("getAgentLastActivityAt", () => {
  it("devuelve el createdAt más reciente entre las acciones del agente", () => {
    const input = [
      action({
        id: "a1",
        agentId: "ag1",
        createdAt: "2026-07-10T00:00:00.000Z",
      }),
      action({
        id: "a2",
        agentId: "ag1",
        createdAt: "2026-07-12T00:00:00.000Z",
      }),
      action({
        id: "a3",
        agentId: "otro",
        createdAt: "2026-07-13T00:00:00.000Z",
      }),
    ];
    expect(getAgentLastActivityAt(input, "ag1")).toBe(
      "2026-07-12T00:00:00.000Z",
    );
  });

  it("devuelve null si el agente no tiene acciones", () => {
    const input = [action({ agentId: "otro" })];
    expect(getAgentLastActivityAt(input, "ag1")).toBeNull();
  });
});

describe("getAgentTools", () => {
  it("resuelve las herramientas conectadas a partir de los permisos del agente", () => {
    const tools = [
      tool({ id: "t1", name: "Correo" }),
      tool({ id: "t2", name: "CRM" }),
    ];
    const permissions = [
      permission({
        id: "p1",
        agentId: "ag1",
        toolId: "t1",
        scope: "draft",
        status: "allowed",
      }),
      permission({
        id: "p2",
        agentId: "ag1",
        toolId: "t2",
        scope: "write",
        status: "restricted",
      }),
      permission({ id: "p3", agentId: "otro", toolId: "t1" }),
    ];
    const result = getAgentTools(permissions, tools, "ag1");
    expect(result).toEqual([
      { tool: tools[0], scope: "draft", status: "allowed" },
      { tool: tools[1], scope: "write", status: "restricted" },
    ]);
  });

  it("ignora permisos cuyo tool no existe", () => {
    const tools = [tool({ id: "t1" })];
    const permissions = [
      permission({ id: "p1", agentId: "ag1", toolId: "t2" }),
    ];
    expect(getAgentTools(permissions, tools, "ag1")).toEqual([]);
  });

  it("devuelve vacío si el agente no tiene permisos", () => {
    expect(getAgentTools([], [], "ag1")).toEqual([]);
  });
});

describe("getAgentActions", () => {
  it("ordena las acciones del agente por createdAt desc", () => {
    const input = [
      action({
        id: "old",
        agentId: "ag1",
        createdAt: "2026-07-10T00:00:00.000Z",
      }),
      action({
        id: "new",
        agentId: "ag1",
        createdAt: "2026-07-12T00:00:00.000Z",
      }),
      action({
        id: "otro",
        agentId: "otro",
        createdAt: "2026-07-13T00:00:00.000Z",
      }),
    ];
    expect(getAgentActions(input, "ag1").map((a) => a.id)).toEqual([
      "new",
      "old",
    ]);
  });

  it("recorta al límite indicado", () => {
    const input = [
      action({
        id: "a1",
        agentId: "ag1",
        createdAt: "2026-07-10T00:00:00.000Z",
      }),
      action({
        id: "a2",
        agentId: "ag1",
        createdAt: "2026-07-11T00:00:00.000Z",
      }),
      action({
        id: "a3",
        agentId: "ag1",
        createdAt: "2026-07-12T00:00:00.000Z",
      }),
    ];
    expect(getAgentActions(input, "ag1", 2).map((a) => a.id)).toEqual([
      "a3",
      "a2",
    ]);
  });

  it("devuelve vacío si el agente no tiene acciones", () => {
    expect(getAgentActions([action({ agentId: "otro" })], "ag1")).toEqual([]);
  });
});
