import { describe, it, expect } from "vitest";
import type { Notification } from "@/domain";
import { notificationsForUser, unreadCount } from "@/lib/notifications";

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

describe("notificationsForUser", () => {
  it("filtra por usuario", () => {
    const input = [
      notification({ id: "n1", userId: "usr_a" }),
      notification({ id: "n2", userId: "usr_b" }),
      notification({ id: "n3", userId: "usr_a" }),
    ];
    expect(notificationsForUser(input, "usr_a").map((n) => n.id)).toEqual([
      "n1",
      "n3",
    ]);
  });

  it("ordena de más reciente a más antigua", () => {
    const input = [
      notification({
        id: "old",
        userId: "usr_a",
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
      notification({
        id: "new",
        userId: "usr_a",
        createdAt: "2026-07-03T00:00:00.000Z",
      }),
      notification({
        id: "mid",
        userId: "usr_a",
        createdAt: "2026-07-02T00:00:00.000Z",
      }),
    ];
    expect(notificationsForUser(input, "usr_a").map((n) => n.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("devuelve lista vacía si el usuario no tiene notificaciones", () => {
    const input = [notification({ id: "n1", userId: "usr_a" })];
    expect(notificationsForUser(input, "usr_sin_notificaciones")).toEqual([]);
  });
});

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
