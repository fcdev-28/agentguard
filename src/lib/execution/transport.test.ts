import { afterEach, describe, expect, it, vi } from "vitest";
import { LoggingTransport } from "./transport";

describe("LoggingTransport", () => {
  afterEach(() => vi.restoreAllMocks());

  it("acepta el envío y se identifica como 'logging'", async () => {
    const t = new LoggingTransport();
    expect(t.name).toBe("logging");
    const res = await t.send({
      to: "x@example.com",
      subject: "Hola",
      body: "b",
    });
    expect(res).toEqual({ ok: true, providerId: "logged" });
  });

  it("emite un log estructurado JSON al enviar", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await new LoggingTransport().send({
      to: "x@example.com",
      subject: "Hola",
      body: "b",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("info");
    expect(parsed.to).toBe("x@example.com");
    expect(parsed.subject).toBe("Hola");
  });
});
