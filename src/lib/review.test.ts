import { describe, it, expect } from "vitest";
import { applyDecision } from "@/lib/review";

describe("applyDecision", () => {
  it("aprueba una acción pendiente sin exigir motivo", () => {
    expect(applyDecision("needs_approval", "approved", null)).toEqual({
      status: "approved",
    });
  });

  it("rechaza con motivo válido", () => {
    expect(applyDecision("proposed", "rejected", "Importe injustificado")).toEqual({
      status: "rejected",
    });
  });

  it("pide cambios con motivo válido", () => {
    expect(
      applyDecision("escalated", "changes_requested", "Revisar el destinatario"),
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
});
