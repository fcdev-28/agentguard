import { describe, it, expect } from "vitest";
import { validateCredentials } from "./credentials";

describe("validateCredentials", () => {
  it("acepta un email y contraseña con formato válido", () => {
    expect(
      validateCredentials("lucia.marin@acme.example", "agentguard-demo"),
    ).toEqual({ ok: true });
  });

  it("rechaza el email vacío", () => {
    expect(validateCredentials("", "agentguard-demo")).toEqual({
      error: "Introduce email y contraseña.",
    });
  });

  it("rechaza la contraseña vacía", () => {
    expect(validateCredentials("lucia.marin@acme.example", "")).toEqual({
      error: "Introduce email y contraseña.",
    });
  });

  it("rechaza un email sin formato válido", () => {
    expect(validateCredentials("lucia.marin", "agentguard-demo")).toEqual({
      error: "El email no tiene un formato válido.",
    });
  });
});
