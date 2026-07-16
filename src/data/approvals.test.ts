import { describe, it, expect } from "vitest";
import { mapApproval } from "./approvals";

describe("mapApproval", () => {
  it("traduce una fila de Prisma (con el revisor incluido) a ApprovalWithReviewer", () => {
    const row = {
      actionId: "act_billing_refund",
      reviewer: { name: "Diego Ferrer" },
      decision: "rejected" as const,
      reason: "Falta justificación del importe.",
      createdAt: new Date("2026-07-12T09:00:00.000Z"),
    };

    expect(mapApproval(row)).toEqual({
      actionId: "act_billing_refund",
      reviewer: { name: "Diego Ferrer" },
      decision: "rejected",
      reason: "Falta justificación del importe.",
      createdAt: "2026-07-12T09:00:00.000Z",
    });
  });

  it("deja reason en null cuando la decisión no lo requiere", () => {
    const row = {
      actionId: "act_billing_refund",
      reviewer: { name: "Lucía Marín" },
      decision: "approved" as const,
      reason: null,
      createdAt: new Date("2026-07-12T09:00:00.000Z"),
    };

    expect(mapApproval(row).reason).toBeNull();
  });
});
