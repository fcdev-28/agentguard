import { describe, it, expect } from "vitest";
import type { Notification } from "@/domain";
import { unreadCount } from "@/lib/notifications";

function notification(partial: Partial<Notification>): Notification {
  return {
    id: "ntf_test",
    organizationId: "org_test",
    userId: "usr_test",
    type: "approval_requested",
    actionId: null,
    message: "Notificación de prueba",
    readAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("unreadCount", () => {
  it("cuenta solo las notificaciones con readAt nulo", () => {
    const input = [
      notification({ id: "n1", readAt: null }),
      notification({ id: "n2", readAt: "2026-07-01T00:00:00.000Z" }),
      notification({ id: "n3", readAt: null }),
    ];
    expect(unreadCount(input)).toBe(2);
  });

  it("devuelve 0 si la lista está vacía", () => {
    expect(unreadCount([])).toBe(0);
  });
});
