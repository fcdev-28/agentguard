import { describe, it, expect } from "vitest";
import { mapAuditEvent } from "./audit";

describe("mapAuditEvent", () => {
  it("traduce una fila de Prisma a la AuditEvent de dominio, con metadata", () => {
    const row = {
      id: "evt_1",
      organizationId: "org_acme",
      actorUserId: "usr_admin",
      agentId: "agt_billing",
      actionId: "act_1",
      eventType: "action_escalated" as const,
      message: "La acción se escaló a un administrador.",
      metadata: { escalatedTo: "usr_admin2" },
      createdAt: new Date("2026-07-12T08:10:00.000Z"),
    };

    expect(mapAuditEvent(row)).toEqual({
      id: "evt_1",
      organizationId: "org_acme",
      actorUserId: "usr_admin",
      agentId: "agt_billing",
      actionId: "act_1",
      eventType: "action_escalated",
      message: "La acción se escaló a un administrador.",
      metadata: { escalatedTo: "usr_admin2" },
      createdAt: "2026-07-12T08:10:00.000Z",
    });
  });

  it("deja actorUserId, agentId y actionId en null cuando el evento no los tiene", () => {
    const row = {
      id: "evt_2",
      organizationId: "org_acme",
      actorUserId: null,
      agentId: null,
      actionId: null,
      eventType: "policy_published" as const,
      message: "Se publicó una política.",
      metadata: {},
      createdAt: new Date("2026-07-12T08:10:00.000Z"),
    };

    const result = mapAuditEvent(row);
    expect(result.actorUserId).toBeNull();
    expect(result.agentId).toBeNull();
    expect(result.actionId).toBeNull();
  });
});
