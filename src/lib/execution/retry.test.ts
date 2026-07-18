import { describe, expect, it } from "vitest";
import {
  MAX_RETRIES,
  backoffMs,
  isRetryableHttpStatus,
  planNextAttempt,
} from "./retry";

describe("isRetryableHttpStatus", () => {
  it("reintenta 429 y 5xx", () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
  });
  it("no reintenta 4xx (salvo 429) ni 2xx", () => {
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(200)).toBe(false);
  });
});

describe("backoffMs", () => {
  it("mapea el reintento k a su tramo", () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(3)).toBe(1_800_000);
    expect(backoffMs(5)).toBe(21_600_000);
  });
  it("clampa fuera de rango al primer/último tramo", () => {
    expect(backoffMs(0)).toBe(60_000);
    expect(backoffMs(99)).toBe(21_600_000);
  });
});

describe("planNextAttempt", () => {
  const now = new Date("2026-07-18T10:00:00.000Z");

  it("reprograma el reintento 1 tras el fallo inicial reintentable", () => {
    const plan = planNextAttempt(0, true, now);
    expect(plan.kind).toBe("retry");
    if (plan.kind === "retry") {
      expect(plan.nextRetryAt.getTime()).toBe(now.getTime() + 60_000);
    }
  });

  it("reprograma el reintento 5 (6h) cuando attempts=4", () => {
    const plan = planNextAttempt(4, true, now);
    expect(plan.kind).toBe("retry");
    if (plan.kind === "retry") {
      expect(plan.nextRetryAt.getTime()).toBe(now.getTime() + 21_600_000);
    }
  });

  it("terminaliza cuando se agotaron los reintentos (attempts=5)", () => {
    expect(planNextAttempt(5, true, now).kind).toBe("terminal");
  });

  it("terminaliza si el error no es reintentable", () => {
    expect(planNextAttempt(0, false, now).kind).toBe("terminal");
  });

  it("MAX_RETRIES es 5", () => {
    expect(MAX_RETRIES).toBe(5);
  });
});
