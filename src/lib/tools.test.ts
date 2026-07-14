import { describe, it, expect } from "vitest";
import type { Tool } from "@/domain";
import { getTools, getToolById } from "@/lib/tools";

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

describe("getTools", () => {
  it("ordena conectadas antes que en pausa o desconectadas", () => {
    const input = [
      tool({ id: "disabled", name: "Zoe", status: "disabled" }),
      tool({ id: "paused", name: "Ana", status: "paused" }),
      tool({ id: "active", name: "Bea", status: "active" }),
    ];
    expect(getTools(input).map((t) => t.id)).toEqual([
      "active",
      "paused",
      "disabled",
    ]);
  });

  it("dentro del mismo estado, ordena por nombre", () => {
    const input = [
      tool({ id: "t2", name: "Zoe", status: "active" }),
      tool({ id: "t1", name: "Ana", status: "active" }),
    ];
    expect(getTools(input).map((t) => t.id)).toEqual(["t1", "t2"]);
  });
});

describe("getToolById", () => {
  it("devuelve la herramienta cuando existe", () => {
    const input = [tool({ id: "t1" }), tool({ id: "t2" })];
    expect(getToolById(input, "t2")?.id).toBe("t2");
  });

  it("devuelve undefined si no existe", () => {
    const input = [tool({ id: "t1" })];
    expect(getToolById(input, "nope")).toBeUndefined();
  });
});
