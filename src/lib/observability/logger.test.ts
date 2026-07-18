import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLogRecord, logger, metric, shouldLog } from "./logger";

describe("buildLogRecord", () => {
  it("produce ts ISO, level y msg, y mezcla los fields", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    const r = buildLogRecord("info", "hola", { a: 1 }, now);
    expect(r).toEqual({
      ts: "2026-07-18T10:00:00.000Z",
      level: "info",
      msg: "hola",
      a: 1,
    });
  });

  it("no deja que fields sobreescriba level, msg ni ts", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    const r = buildLogRecord(
      "info",
      "real",
      { level: "error", msg: "fake", ts: "fake" },
      now,
    );
    expect(r.level).toBe("info");
    expect(r.msg).toBe("real");
    expect(r.ts).toBe("2026-07-18T10:00:00.000Z");
  });
});

describe("shouldLog", () => {
  it("warn pasa con config info", () => {
    expect(shouldLog("info", "warn")).toBe(true);
  });
  it("debug no pasa con config info", () => {
    expect(shouldLog("info", "debug")).toBe(false);
  });
  it("error pasa con config error", () => {
    expect(shouldLog("error", "error")).toBe(true);
  });
});

describe("logger / write", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it("con LOG_LEVEL=warn, logger.info no escribe", () => {
    process.env.LOG_LEVEL = "warn";
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("silenciado");
    expect(spy).not.toHaveBeenCalled();
  });

  it("logger.error escribe JSON parseable a console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("boom", { a: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("boom");
    expect(parsed.a).toBe(1);
  });
});

describe("metric", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it("emite un record con metric:name y los labels, a nivel info", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    metric("action.executed", { transport: "resend" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.metric).toBe("action.executed");
    expect(parsed.msg).toBe("action.executed");
    expect(parsed.transport).toBe("resend");
    expect(parsed.level).toBe("info");
  });

  it("un label homónimo no pisa el nombre de la métrica", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    metric("action.executed", { metric: "malicioso" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.metric).toBe("action.executed");
  });

  it("respeta LOG_LEVEL: con warn, metric (info) no escribe", () => {
    process.env.LOG_LEVEL = "warn";
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    metric("action.executed");
    expect(spy).not.toHaveBeenCalled();
  });
});
