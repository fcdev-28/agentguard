import { describe, expect, it } from "vitest";
import { LoggingTransport } from "@/lib/execution/transport";

describe("LoggingTransport", () => {
  it("acepta el envío y se identifica como 'logging'", async () => {
    const t = new LoggingTransport();
    expect(t.name).toBe("logging");
    const r = await t.send({
      to: "x@example.com",
      subject: "Hola",
      body: "Cuerpo",
    });
    expect(r.ok).toBe(true);
    expect(r.providerId).toBe("logged");
  });
});
