import { describe, it, expect } from "vitest";
import { mapAgent } from "./agents";

describe("mapAgent", () => {
  it("traduce una fila de Prisma a la Agent de dominio", () => {
    const row = {
      id: "agt_billing",
      organizationId: "org_acme",
      ownerId: "usr_admin",
      name: "Agente de facturación",
      description: "Emite reembolsos y actualiza registros de facturación.",
      environment: "production" as const,
      status: "active" as const,
      mode: "enforce" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-10T00:00:00.000Z"),
    };

    expect(mapAgent(row)).toEqual({
      id: "agt_billing",
      organizationId: "org_acme",
      ownerId: "usr_admin",
      name: "Agente de facturación",
      description: "Emite reembolsos y actualiza registros de facturación.",
      environment: "production",
      status: "active",
      mode: "enforce",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    });
  });
});
