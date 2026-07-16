import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

vi.mock("@/lib/session-db", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: "usr_reviewer",
    organizationId: "org_acme",
    name: "Diego Ferrer",
    email: "diego.ferrer@acme.example",
    role: "reviewer",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "./notification-actions";

beforeEach(() => {
  mockFindUnique.mockReset();
  mockUpdate.mockReset().mockResolvedValue({});
  mockUpdateMany.mockReset().mockResolvedValue({});
  vi.mocked(revalidatePath).mockClear();
});

describe("markNotificationRead", () => {
  it("marca como leída una notificación del usuario actual", async () => {
    mockFindUnique.mockResolvedValue({ userId: "usr_reviewer" });

    const result = await markNotificationRead("ntf_1");

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "ntf_1" },
      data: { readAt: expect.any(Date) },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("devuelve error si la notificación no existe", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await markNotificationRead("ntf_missing");

    expect(result).toEqual({
      error: "La notificación no existe o no pertenece al usuario actual.",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("devuelve error si la notificación pertenece a otro usuario", async () => {
    mockFindUnique.mockResolvedValue({ userId: "usr_other" });

    const result = await markNotificationRead("ntf_1");

    expect(result).toEqual({
      error: "La notificación no existe o no pertenece al usuario actual.",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("markAllNotificationsRead", () => {
  it("marca como leídas todas las notificaciones sin leer del usuario actual", async () => {
    const result = await markAllNotificationsRead();

    expect(result).toEqual({ ok: true });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: "usr_reviewer", readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
