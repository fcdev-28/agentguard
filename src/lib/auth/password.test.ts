import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("un hash generado verifica correctamente contra su contraseña original", async () => {
    const hash = await hashPassword("agentguard-demo");
    await expect(verifyPassword("agentguard-demo", hash)).resolves.toBe(true);
  });

  it("no verifica contra una contraseña distinta", async () => {
    const hash = await hashPassword("agentguard-demo");
    await expect(verifyPassword("otra-contraseña", hash)).resolves.toBe(
      false,
    );
  });

  it("falla cerrado cuando el hash es null", async () => {
    await expect(verifyPassword("agentguard-demo", null)).resolves.toBe(
      false,
    );
  });
});
