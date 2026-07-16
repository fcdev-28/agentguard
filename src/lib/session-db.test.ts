import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadSessionToken = vi.fn();
const mockGetUserById = vi.fn();
const mockGetOrganization = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  readSessionToken: (...args: unknown[]) => mockReadSessionToken(...args),
}));

vi.mock("@/data/users", () => ({
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
}));

vi.mock("@/data/organizations", () => ({
  getOrganization: (...args: unknown[]) => mockGetOrganization(...args),
}));

import { getCurrentUser, getCurrentOrganization } from "./session-db";

const activeUser = {
  id: "usr_admin",
  organizationId: "org_acme",
  name: "Lucía Marín",
  email: "lucia.marin@acme.example",
  role: "admin" as const,
  status: "active" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  mockReadSessionToken.mockReset();
  mockGetUserById.mockReset();
  mockGetOrganization.mockReset();
});

describe("getCurrentUser", () => {
  it("devuelve el usuario cuando la cookie es válida y el usuario sigue activo", async () => {
    mockReadSessionToken.mockResolvedValue("usr_admin");
    mockGetUserById.mockResolvedValue(activeUser);

    const user = await getCurrentUser();
    expect(user).toEqual(activeUser);
  });

  it("devuelve null sin cookie de sesión", async () => {
    mockReadSessionToken.mockResolvedValue(null);

    const user = await getCurrentUser();
    expect(user).toBeNull();
    expect(mockGetUserById).not.toHaveBeenCalled();
  });

  it("devuelve null si el usuario del token ya no existe en BD", async () => {
    mockReadSessionToken.mockResolvedValue("usr_borrado");
    mockGetUserById.mockResolvedValue(null);

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it("devuelve null si el usuario está disabled (revalidación de status en cada request)", async () => {
    mockReadSessionToken.mockResolvedValue("usr_admin");
    mockGetUserById.mockResolvedValue({ ...activeUser, status: "disabled" });

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});

describe("getCurrentOrganization", () => {
  it("devuelve la organización cuando hay usuario en sesión", async () => {
    mockReadSessionToken.mockResolvedValue("usr_admin");
    mockGetUserById.mockResolvedValue(activeUser);
    mockGetOrganization.mockResolvedValue({ id: "org_acme" });

    const org = await getCurrentOrganization();
    expect(org).toEqual({ id: "org_acme" });
  });

  it("devuelve null sin sesión válida, sin llegar a consultar la organización", async () => {
    mockReadSessionToken.mockResolvedValue(null);

    const org = await getCurrentOrganization();
    expect(org).toBeNull();
    expect(mockGetOrganization).not.toHaveBeenCalled();
  });
});
