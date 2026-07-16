import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetCurrentUser = vi.fn();

vi.mock("@/lib/session-db", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

import { requireCan, requireRole } from "./authz";

function user(role: "admin" | "reviewer" | "auditor" | "developer") {
  return {
    id: "usr_test",
    organizationId: "org_acme",
    name: "Usuario de prueba",
    email: "test@acme.example",
    role,
    status: "active" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  mockGetCurrentUser.mockReset();
});

describe("requireCan", () => {
  it("devuelve «No autenticado.» sin sesión", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await requireCan("review:decide");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("un auditor no puede decidir revisiones (review:decide)", async () => {
    mockGetCurrentUser.mockResolvedValue(user("auditor"));

    const result = await requireCan("review:decide");

    expect(result).toEqual({ error: "No autorizado." });
  });

  it("un developer no puede escribir políticas (policy:write)", async () => {
    mockGetCurrentUser.mockResolvedValue(user("developer"));

    const result = await requireCan("policy:write");

    expect(result).toEqual({ error: "No autorizado." });
  });

  it("un reviewer no puede gestionar ajustes (settings:manage)", async () => {
    mockGetCurrentUser.mockResolvedValue(user("reviewer"));

    const result = await requireCan("settings:manage");

    expect(result).toEqual({ error: "No autorizado." });
  });

  it("devuelve el usuario cuando tiene la capacidad", async () => {
    const admin = user("admin");
    mockGetCurrentUser.mockResolvedValue(admin);

    const result = await requireCan("settings:manage");

    expect(result).toEqual({ user: admin });
  });
});

describe("requireRole", () => {
  it("devuelve «No autenticado.» sin sesión", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await requireRole("admin");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("devuelve «No autorizado.» si el rol no coincide", async () => {
    mockGetCurrentUser.mockResolvedValue(user("reviewer"));

    const result = await requireRole("admin");

    expect(result).toEqual({ error: "No autorizado." });
  });

  it("devuelve el usuario cuando el rol coincide", async () => {
    const admin = user("admin");
    mockGetCurrentUser.mockResolvedValue(admin);

    const result = await requireRole("admin");

    expect(result).toEqual({ user: admin });
  });
});
