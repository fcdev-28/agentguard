import { afterEach, describe, expect, it, vi } from "vitest";
import { LoggingTransport, SmtpTransport } from "./transport";

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

describe("SmtpTransport retryable", () => {
  afterEach(() => vi.restoreAllMocks());

  const msg = { to: "x@example.com", subject: "Hola", body: "b" };

  it("marca retryable en un 500 del proveedor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const res = await new SmtpTransport("k", "from@x.com").send(msg);
    expect(res.ok).toBe(false);
    expect(res.retryable).toBe(true);
  });

  it("no marca retryable en un 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    );
    const res = await new SmtpTransport("k", "from@x.com").send(msg);
    expect(res.ok).toBe(false);
    expect(res.retryable).toBe(false);
  });

  it("marca retryable cuando fetch lanza (fallo de red)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red caída")));
    const res = await new SmtpTransport("k", "from@x.com").send(msg);
    expect(res.ok).toBe(false);
    expect(res.retryable).toBe(true);
  });
});
