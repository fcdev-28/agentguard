/**
 * Política de reintentos de ejecución (pura, sin I/O). Clasifica errores como
 * reintentables o permanentes y calcula el backoff. La persistencia y el barrido
 * viven en el runner y el cron `retry-executions`.
 */
export const MAX_RETRIES = 5;

/** HTTP reintentable: 429 (rate limit) o 5xx (fallo del proveedor). */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Tramos de backoff antes del reintento k (1-indexado): 1m, 5m, 30m, 2h, 6h. */
const BACKOFF_MS: readonly number[] = [
  60_000, // 1m — reintento 1
  300_000, // 5m — reintento 2
  1_800_000, // 30m — reintento 3
  7_200_000, // 2h — reintento 4
  21_600_000, // 6h — reintento 5
];

/** Backoff en ms antes del reintento `retryNumber`; clampa fuera de rango. */
export function backoffMs(retryNumber: number): number {
  const idx = Math.min(Math.max(retryNumber, 1), BACKOFF_MS.length) - 1;
  return BACKOFF_MS[idx];
}

export type NextAttempt =
  | { kind: "retry"; nextRetryAt: Date }
  | { kind: "terminal" };

/**
 * Decide el siguiente paso tras un fallo de envío, dados los reintentos ya
 * hechos (`attempts`, 0..MAX_RETRIES) y si el error es reintentable.
 */
export function planNextAttempt(
  attempts: number,
  retryable: boolean,
  now: Date,
): NextAttempt {
  const nextRetryNumber = attempts + 1;
  if (!retryable || nextRetryNumber > MAX_RETRIES) return { kind: "terminal" };
  return {
    kind: "retry",
    nextRetryAt: new Date(now.getTime() + backoffMs(nextRetryNumber)),
  };
}
