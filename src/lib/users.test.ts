import { describe, it, expect } from "vitest";
import type { User, UserRole } from "@/domain";
import { getUsers, getUserById, roleCapabilities } from "@/lib/users";

function user(partial: Partial<User>): User {
  return {
    id: "u1",
    organizationId: "org1",
    name: "Usuario",
    email: "usuario@acme.example",
    role: "admin",
    status: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("getUsers", () => {
  it("ordena activos antes que invitados o deshabilitados", () => {
    const input = [
      user({ id: "disabled", name: "Zoe", status: "disabled" }),
      user({ id: "invited", name: "Ana", status: "invited" }),
      user({ id: "active", name: "Bea", status: "active" }),
    ];
    expect(getUsers(input).map((u) => u.id)).toEqual([
      "active",
      "invited",
      "disabled",
    ]);
  });

  it("dentro del mismo estado, ordena por nombre", () => {
    const input = [
      user({ id: "u2", name: "Zoe", status: "active" }),
      user({ id: "u1", name: "Ana", status: "active" }),
    ];
    expect(getUsers(input).map((u) => u.id)).toEqual(["u1", "u2"]);
  });
});

describe("getUserById", () => {
  it("devuelve el usuario cuando existe", () => {
    const input = [user({ id: "u1" }), user({ id: "u2" })];
    expect(getUserById(input, "u2")?.id).toBe("u2");
  });

  it("devuelve undefined si no existe", () => {
    const input = [user({ id: "u1" })];
    expect(getUserById(input, "nope")).toBeUndefined();
  });
});

describe("roleCapabilities", () => {
  const roles: UserRole[] = ["admin", "reviewer", "auditor", "developer"];

  it("cubre los cuatro roles con al menos una descripción", () => {
    for (const role of roles) {
      expect(roleCapabilities[role].length).toBeGreaterThan(0);
    }
  });
});
