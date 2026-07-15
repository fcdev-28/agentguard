import { describe, it, expect } from "vitest";
import { searchCommands, type CommandPaletteData } from "@/lib/command-palette";
import type { Agent, AgentAction, Policy } from "@/domain";

/** Construye un agente de prueba con los campos relevantes para la búsqueda. */
function makeAgent(overrides: Partial<Agent>): Agent {
  return {
    id: "agt_test",
    organizationId: "org_test",
    ownerId: "usr_test",
    name: "Agente de prueba",
    description: "Descripción de prueba",
    environment: "production",
    status: "active",
    mode: "enforce",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Construye una acción de prueba con los campos relevantes para la búsqueda. */
function makeAction(overrides: Partial<AgentAction>): AgentAction {
  return {
    id: "act_test",
    organizationId: "org_test",
    agentId: "agt_test",
    toolId: "tool_test",
    policyId: null,
    title: "Acción de prueba",
    summary: "Resumen de prueba",
    actionType: "send_email",
    status: "needs_approval",
    riskLevel: "medium",
    payload: {},
    policyResult: null,
    approvalDueAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    executedAt: null,
    ...overrides,
  };
}

/** Construye una política de prueba con los campos relevantes para la búsqueda. */
function makePolicy(overrides: Partial<Policy>): Policy {
  return {
    id: "pol_test",
    organizationId: "org_test",
    name: "Política de prueba",
    description: "Descripción de prueba",
    status: "active",
    version: 1,
    conditions: {},
    effect: "require_approval",
    approvalSlaMinutes: null,
    createdById: "usr_test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const emptyData: CommandPaletteData = { agents: [], actions: [], policies: [] };

describe("searchCommands", () => {
  it("con query vacío devuelve solo navegación, sin resultados de búsqueda", () => {
    const data: CommandPaletteData = {
      agents: [makeAgent({})],
      actions: [makeAction({})],
      policies: [makePolicy({})],
    };
    const result = searchCommands("", data);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.kind === "navigation")).toBe(true);
  });

  it("encuentra un agente por name, sin distinguir mayúsculas/minúsculas", () => {
    const agent = makeAgent({ id: "agt_1", name: "Agente de Soporte" });
    const result = searchCommands("soporte", { ...emptyData, agents: [agent] });
    expect(result).toContainEqual(
      expect.objectContaining({ kind: "agent", href: "/agents/agt_1" }),
    );
  });

  it("encuentra un agente por id", () => {
    const agent = makeAgent({ id: "agt_facturacion", name: "Agente Cobros" });
    const result = searchCommands("agt_factur", {
      ...emptyData,
      agents: [agent],
    });
    expect(result).toContainEqual(
      expect.objectContaining({
        kind: "agent",
        href: "/agents/agt_facturacion",
      }),
    );
  });

  it("no incluye entidades que no matchean el query", () => {
    const data: CommandPaletteData = {
      agents: [makeAgent({ id: "agt_1", name: "Agente Cobros" })],
      actions: [makeAction({ id: "act_1", title: "Enviar recordatorio" })],
      policies: [makePolicy({ id: "pol_1", name: "Bloqueo de reembolsos" })],
    };
    const result = searchCommands("zzz_no_existe", data);
    expect(result).toEqual([]);
  });

  it("respeta el límite de 5 resultados por entidad", () => {
    const agents = Array.from({ length: 10 }, (_, i) =>
      makeAgent({ id: `agt_${i}`, name: `Agente Cobros ${i}` }),
    );
    const result = searchCommands("cobros", { ...emptyData, agents });
    const agentResults = result.filter((item) => item.kind === "agent");
    expect(agentResults).toHaveLength(5);
  });
});
