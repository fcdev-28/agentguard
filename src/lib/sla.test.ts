import { describe, it, expect } from "vitest";
import { computeApprovalDueAt } from "@/lib/sla";

describe("computeApprovalDueAt", () => {
  it("devuelve null si la política no define SLA de aprobación", () => {
    expect(computeApprovalDueAt("2026-07-12T09:00:00.000Z", null)).toBeNull();
  });

  it("suma los minutos del SLA al momento de entrada", () => {
    expect(computeApprovalDueAt("2026-07-12T09:00:00.000Z", 30)).toBe(
      "2026-07-12T09:30:00.000Z",
    );
  });

  it("acepta un Date como momento de entrada", () => {
    const enteredAt = new Date("2026-07-12T09:00:00.000Z");
    expect(computeApprovalDueAt(enteredAt, 60)).toBe(
      "2026-07-12T10:00:00.000Z",
    );
  });
});
