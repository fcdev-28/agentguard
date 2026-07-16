import { describe, it, expect } from "vitest";
import { mapPolicy } from "./policies";

describe("mapPolicy", () => {
  it("traduce una fila de Prisma a la Policy de dominio, incluido el JSON de condiciones", () => {
    const row = {
      id: "pol_refund_limit",
      organizationId: "org_acme",
      name: "Límite de reembolso",
      description: "Requiere aprobación para reembolsos superiores a 500€.",
      status: "active" as const,
      version: 2,
      conditions: { field: "amount", operator: "gt", value: 500 },
      effect: "require_approval" as const,
      approvalSlaMinutes: 120,
      createdById: "usr_admin",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-15T00:00:00.000Z"),
      publishedAt: new Date("2026-06-15T00:00:00.000Z"),
    };

    expect(mapPolicy(row)).toEqual({
      id: "pol_refund_limit",
      organizationId: "org_acme",
      name: "Límite de reembolso",
      description: "Requiere aprobación para reembolsos superiores a 500€.",
      status: "active",
      version: 2,
      conditions: { field: "amount", operator: "gt", value: 500 },
      effect: "require_approval",
      approvalSlaMinutes: 120,
      createdById: "usr_admin",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
      publishedAt: "2026-06-15T00:00:00.000Z",
    });
  });

  it("deja publishedAt y approvalSlaMinutes en null cuando la política no está publicada", () => {
    const row = {
      id: "pol_draft",
      organizationId: "org_acme",
      name: "Borrador",
      description: "Política en borrador.",
      status: "draft" as const,
      version: 1,
      conditions: {},
      effect: "block" as const,
      approvalSlaMinutes: null,
      createdById: "usr_admin",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      publishedAt: null,
    };

    const result = mapPolicy(row);
    expect(result.publishedAt).toBeNull();
    expect(result.approvalSlaMinutes).toBeNull();
  });
});
