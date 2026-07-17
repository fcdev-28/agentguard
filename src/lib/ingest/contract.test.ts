import { describe, expect, it } from "vitest";
import { validateIngestInput } from "@/lib/ingest/contract";

const base = {
  actionType: "send_email",
  toolId: "tool_email",
  title: "Enviar respuesta al ticket",
  summary: "Responder al cliente sobre el reembolso",
  payload: { to: "cliente@example.com" },
};

describe("validateIngestInput", () => {
  it("acepta un input mínimo válido", () => {
    const r = validateIngestInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.actionType).toBe("send_email");
      expect(r.value.riskLevel).toBeUndefined();
    }
  });

  it("acepta riskLevel y externalId opcionales", () => {
    const r = validateIngestInput({
      ...base,
      riskLevel: "high",
      externalId: "ext-1",
    });
    expect(r.ok && r.value.riskLevel).toBe("high");
    expect(r.ok && r.value.externalId).toBe("ext-1");
  });

  it("rechaza un body que no es objeto", () => {
    expect(validateIngestInput(null)).toEqual({
      ok: false,
      error: expect.any(String),
    });
  });

  it("rechaza actionType desconocido", () => {
    const r = validateIngestInput({ ...base, actionType: "hack" });
    expect(r.ok).toBe(false);
  });

  it("rechaza riskLevel inválido", () => {
    const r = validateIngestInput({ ...base, riskLevel: "extreme" });
    expect(r.ok).toBe(false);
  });

  it("rechaza si falta toolId, title, summary o payload", () => {
    for (const key of ["toolId", "title", "summary", "payload"]) {
      const bad = { ...base };
      delete (bad as Record<string, unknown>)[key];
      expect(validateIngestInput(bad).ok).toBe(false);
    }
  });

  it("rechaza payload que no es objeto", () => {
    expect(validateIngestInput({ ...base, payload: "x" }).ok).toBe(false);
  });
});
