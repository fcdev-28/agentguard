import { describe, it, expect } from "vitest";
import { applyDecision, eligibleEscalationTargets } from "@/lib/review";
import type { User } from "@/domain";

/** Construye un usuario de prueba con los campos relevantes para el escalado. */
function makeUser(overrides: Partial<User>): User {
  return {
    id: "usr_test",
    organizationId: "org_test",
    name: "Usuario de prueba",
    email: "test@example.com",
    role: "reviewer",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("applyDecision", () => {
  it("aprueba una acción pendiente sin exigir motivo", () => {
    expect(applyDecision("needs_approval", "approved", null)).toEqual({
      status: "approved",
    });
  });

  it("rechaza con motivo válido", () => {
    expect(
      applyDecision("proposed", "rejected", "Importe injustificado"),
    ).toEqual({
      status: "rejected",
    });
  });

  it("pide cambios con motivo válido", () => {
    expect(
      applyDecision(
        "escalated",
        "changes_requested",
        "Revisar el destinatario",
      ),
    ).toEqual({ status: "changes_requested" });
  });

  it("exige motivo para rechazar", () => {
    const result = applyDecision("needs_approval", "rejected", null);
    expect("error" in result).toBe(true);
  });

  it("exige motivo no vacío (solo espacios) para pedir cambios", () => {
    const result = applyDecision("needs_approval", "changes_requested", "   ");
    expect("error" in result).toBe(true);
  });

  it("no permite decidir sobre una acción que ya no está pendiente", () => {
    const result = applyDecision("approved", "approved", null);
    expect("error" in result).toBe(true);
  });

  it("no permite decidir sobre una acción ejecutada", () => {
    const result = applyDecision("executed", "rejected", "motivo");
    expect("error" in result).toBe(true);
  });

  it("escala una acción pendiente sin exigir motivo", () => {
    expect(applyDecision("needs_approval", "escalated", null)).toEqual({
      status: "escalated",
    });
  });
});

describe("eligibleEscalationTargets", () => {
  const admin = makeUser({ id: "usr_admin", role: "admin" });
  const reviewer = makeUser({ id: "usr_reviewer", role: "reviewer" });
  const auditor = makeUser({ id: "usr_auditor", role: "auditor" });
  const developer = makeUser({ id: "usr_developer", role: "developer" });
  const invitedReviewer = makeUser({
    id: "usr_invited",
    role: "reviewer",
    status: "invited",
  });

  it("incluye administradores y revisores activos", () => {
    const targets = eligibleEscalationTargets(
      [admin, reviewer, auditor, developer],
      "usr_other",
    );
    expect(targets.map((u) => u.id)).toEqual(["usr_admin", "usr_reviewer"]);
  });

  it("excluye al usuario que escala", () => {
    const targets = eligibleEscalationTargets([admin, reviewer], "usr_admin");
    expect(targets.map((u) => u.id)).toEqual(["usr_reviewer"]);
  });

  it("excluye usuarios no activos aunque tengan rol elegible", () => {
    const targets = eligibleEscalationTargets(
      [reviewer, invitedReviewer],
      "usr_other",
    );
    expect(targets.map((u) => u.id)).toEqual(["usr_reviewer"]);
  });
});
