import { describe, expect, it } from "vitest";
import { parseCssDuration } from "./motion";

describe("parseCssDuration", () => {
  it("lee milisegundos tal cual se declaran en tokens.css", () => {
    expect(parseCssDuration("320ms", 0)).toBe(320);
    expect(parseCssDuration("90ms", 0)).toBe(90);
  });

  it("lee segundos, que es como los normaliza getComputedStyle", () => {
    // Chrome devuelve ".32s" para un token declarado como "320ms".
    expect(parseCssDuration(".32s", 0)).toBe(320);
    expect(parseCssDuration("0.32s", 0)).toBe(320);
    expect(parseCssDuration("2s", 0)).toBe(2000);
  });

  it("no confunde 's' con 'ms' (ms también termina en s)", () => {
    expect(parseCssDuration("160ms", 0)).toBe(160);
    expect(parseCssDuration("160s", 0)).toBe(160_000);
  });

  it("tolera los espacios que deja getComputedStyle", () => {
    expect(parseCssDuration("  320ms  ", 0)).toBe(320);
  });

  it("cae al fallback si el token no existe o no es una duración", () => {
    expect(parseCssDuration("", 320)).toBe(320);
    expect(parseCssDuration("   ", 320)).toBe(320);
    // Sin unidad no es una duración CSS válida.
    expect(parseCssDuration("320", 320)).toBe(320);
    expect(parseCssDuration("auto", 320)).toBe(320);
    expect(parseCssDuration("ms", 320)).toBe(320);
  });
});
