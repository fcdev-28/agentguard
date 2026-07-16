import { describe, it, expect } from "vitest";
import { mapPermission } from "./permissions";

describe("mapPermission", () => {
  it("traduce una fila de Prisma a la Permission de dominio", () => {
    const row = {
      id: "perm_1",
      agentId: "agt_billing",
      toolId: "tool_email",
      scope: "write" as const,
      status: "allowed" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
    };

    expect(mapPermission(row)).toEqual({
      id: "perm_1",
      agentId: "agt_billing",
      toolId: "tool_email",
      scope: "write",
      status: "allowed",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    });
  });
});
