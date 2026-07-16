import { describe, it, expect } from "vitest";
import { mapTool } from "./tools";

describe("mapTool", () => {
  it("traduce una fila de Prisma a la Tool de dominio", () => {
    const row = {
      id: "tool_email",
      organizationId: "org_acme",
      name: "Correo corporativo",
      type: "email" as const,
      status: "active" as const,
      riskLevel: "medium" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    };

    expect(mapTool(row)).toEqual({
      id: "tool_email",
      organizationId: "org_acme",
      name: "Correo corporativo",
      type: "email",
      status: "active",
      riskLevel: "medium",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
  });
});
