import { describe, expect, it } from "vitest";
import {
  generateApiKeyToken,
  hashApiKey,
  parseBearer,
} from "@/lib/auth/agent-keys";

describe("parseBearer", () => {
  it("extrae el token de un header Bearer", () => {
    expect(parseBearer("Bearer ag_live_abc")).toBe("ag_live_abc");
  });

  it("devuelve null si falta el header o el esquema", () => {
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer("ag_live_abc")).toBeNull();
    expect(parseBearer("Basic xyz")).toBeNull();
  });
});

describe("hashApiKey", () => {
  it("es determinista y devuelve sha256 hex de 64 chars", () => {
    const h = hashApiKey("ag_live_abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey("ag_live_abc")).toBe(h);
  });

  it("cambia con la entrada", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});

describe("generateApiKeyToken", () => {
  it("genera token con prefijo ag_live_, prefix visible y hash coherente", () => {
    const { token, prefix, keyHash } = generateApiKeyToken();
    expect(token.startsWith("ag_live_")).toBe(true);
    expect(prefix).toBe(token.slice(0, 12));
    expect(keyHash).toBe(hashApiKey(token));
  });

  it("genera tokens distintos en cada llamada", () => {
    expect(generateApiKeyToken().token).not.toBe(generateApiKeyToken().token);
  });
});
