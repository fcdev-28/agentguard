import { describe, it, expect } from "vitest";
import { mapUser } from "./users";

describe("mapUser", () => {
  it("traduce una fila de Prisma a la User de dominio", () => {
    const row = {
      id: "usr_admin",
      organizationId: "org_acme",
      name: "Lucía Marín",
      email: "lucia.marin@acme.example",
      role: "admin" as const,
      status: "active" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    };

    expect(mapUser(row)).toEqual({
      id: "usr_admin",
      organizationId: "org_acme",
      name: "Lucía Marín",
      email: "lucia.marin@acme.example",
      role: "admin",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("preserva role y status sin traducir (los enums de Prisma coinciden con el dominio)", () => {
    const row = {
      id: "usr_dev",
      organizationId: "org_acme",
      name: "Pablo Nieto",
      email: "pablo.nieto@acme.example",
      role: "developer" as const,
      status: "invited" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const result = mapUser(row);
    expect(result.role).toBe("developer");
    expect(result.status).toBe("invited");
  });
});
