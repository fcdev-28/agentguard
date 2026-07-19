import { describe, expect, it } from "vitest";
import type { User } from "@/domain";
import { recipientsFor } from "./recipients";

function user(id: string, role: User["role"]): User {
  return {
    id,
    organizationId: "org-1",
    name: `User ${id}`,
    email: `${id}@example.com`,
    role,
    status: "active",
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  };
}

const org: User[] = [
  user("a", "admin"),
  user("r", "reviewer"),
  user("d", "developer"),
  user("u", "auditor"),
];

describe("recipientsFor", () => {
  it("approval_requested → reviewer + admin", () => {
    const ids = recipientsFor("approval_requested", org).map((u) => u.id);
    expect(ids.sort()).toEqual(["a", "r"]);
  });

  it("action_escalated → solo admin", () => {
    expect(recipientsFor("action_escalated", org).map((u) => u.id)).toEqual([
      "a",
    ]);
  });

  it("agent_error → developer + admin", () => {
    const ids = recipientsFor("agent_error", org).map((u) => u.id);
    expect(ids.sort()).toEqual(["a", "d"]);
  });

  it("emergency_stop → solo admin", () => {
    expect(recipientsFor("emergency_stop", org).map((u) => u.id)).toEqual([
      "a",
    ]);
  });

  it("org sin usuarios del rol → lista vacía", () => {
    const onlyAuditors = [user("x", "auditor")];
    expect(recipientsFor("action_escalated", onlyAuditors)).toEqual([]);
  });
});
