"use client";

import { useEffect, useRef, useState } from "react";

/** ¿El usuario pidió reducir el movimiento? */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Easing de desaceleración (rápido al principio, suave al final). */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Número que cuenta desde 0 hasta `value` al montar. Aclara que la métrica se
 * asienta; no decora. Honra prefers-reduced-motion mostrando el valor final sin
 * animar. Adaptación nativa del patrón CountUp de reactbits.dev (sin deps).
 */
export function CountUp({
  value,
  durationMs = 700,
}: {
  value: number;
  durationMs?: number;
}) {
  // Inicia en 0 en servidor y cliente (hidratación consistente) y sube al montar.
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplay(Math.round(easeOut(progress) * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, durationMs]);

  return <span>{display}</span>;
}
