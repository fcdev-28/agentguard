import { describe, it, expect, vi } from "vitest";

vi.mock("@/data/users", () => ({
  getUsers: vi.fn(async () => [
    {
      id: "usr_reviewer",
      organizationId: "org_acme",
      name: "Diego Ferrer",
      email: "diego.ferrer@acme.example",
      role: "reviewer",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "usr_admin",
      organizationId: "org_acme",
      name: "Lucía Marín",
      email: "lucia.marin@acme.example",
      role: "admin",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ]),
}));

vi.mock("@/data/organizations", () => ({
  getOrganization: vi.fn(async () => ({
    id: "org_acme",
    name: "Acme Operations",
    slug: "acme",
    emergencyStop: false,
    emergencyStopById: null,
    emergencyStopAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

import { getCurrentUser, getCurrentOrganization } from "./session";

describe("getCurrentUser", () => {
  it("devuelve el usuario administrador de la organización", async () => {
    const user = await getCurrentUser();
    expect(user.role).toBe("admin");
    expect(user.id).toBe("usr_admin");
  });
});

describe("getCurrentOrganization", () => {
  it("devuelve la organización activa leída de la BD", async () => {
    const org = await getCurrentOrganization();
    expect(org.id).toBe("org_acme");
  });
});
