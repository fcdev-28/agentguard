import { describe, it, expect } from "vitest";
import { mapNotification } from "./notifications";

describe("mapNotification", () => {
  it("traduce una fila de Prisma a la Notification de dominio, sin leer", () => {
    const row = {
      id: "ntf_1",
      organizationId: "org_acme",
      userId: "usr_reviewer",
      type: "approval_requested" as const,
      actionId: "act_1",
      message: "Una acción necesita tu aprobación.",
      readAt: null,
      createdAt: new Date("2026-07-12T08:10:00.000Z"),
    };

    expect(mapNotification(row)).toEqual({
      id: "ntf_1",
      organizationId: "org_acme",
      userId: "usr_reviewer",
      type: "approval_requested",
      actionId: "act_1",
      message: "Una acción necesita tu aprobación.",
      readAt: null,
      createdAt: "2026-07-12T08:10:00.000Z",
    });
  });

  it("traduce readAt cuando la notificación ya se leyó, y deja actionId en null cuando no aplica", () => {
    const row = {
      id: "ntf_2",
      organizationId: "org_acme",
      userId: "usr_reviewer",
      type: "emergency_stop" as const,
      actionId: null,
      message: "Parada de emergencia activada.",
      readAt: new Date("2026-07-12T09:00:00.000Z"),
      createdAt: new Date("2026-07-12T08:10:00.000Z"),
    };

    const result = mapNotification(row);
    expect(result.readAt).toBe("2026-07-12T09:00:00.000Z");
    expect(result.actionId).toBeNull();
  });
});
