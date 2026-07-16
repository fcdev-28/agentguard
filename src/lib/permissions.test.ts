import { describe, it, expect } from "vitest";
import type { User, UserRole } from "@/domain";
import { can, type Capability } from "./permissions";

function userWithRole(role: UserRole): User {
  return {
    id: "usr_test",
    organizationId: "org_acme",
    name: "Usuario de prueba",
    email: "test@acme.example",
    role,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** Matriz exacta del spec (rol → capacidades permitidas). */
const EXPECTED: Record<UserRole, ReadonlySet<Capability>> = {
  admin: new Set([
    "review:decide",
    "review:comment",
    "policy:write",
    "policy:publish",
    "runtime:emergency_stop",
    "agent:pause",
    "settings:manage",
  ]),
  reviewer: new Set([
    "review:decide",
    "review:comment",
    "runtime:emergency_stop",
    "agent:pause",
  ]),
  auditor: new Set(),
  developer: new Set(["agent:pause"]),
};

const ALL_ROLES: UserRole[] = ["admin", "reviewer", "auditor", "developer"];
const ALL_CAPABILITIES: Capability[] = [
  "review:decide",
  "review:comment",
  "policy:write",
  "policy:publish",
  "runtime:emergency_stop",
  "agent:pause",
  "settings:manage",
];

describe("can", () => {
  for (const role of ALL_ROLES) {
    for (const capability of ALL_CAPABILITIES) {
      const expected = EXPECTED[role].has(capability);
      it(`${role} ${expected ? "sí" : "no"} tiene "${capability}"`, () => {
        expect(can(userWithRole(role), capability)).toBe(expected);
      });
    }
  }
});
