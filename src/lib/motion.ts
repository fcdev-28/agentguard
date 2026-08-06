/**
 * Lectura de los tokens de motion desde CSS.
 *
 * Existe para no duplicar en JavaScript valores que ya viven en
 * `src/styles/tokens.css`. Cuando una animación CSS y un temporizador de JS
 * tienen que durar lo mismo —por ejemplo, la descarga de la barra de parada
 * y el tiempo que su fila sigue montada— escribir el número en los dos
 * sitios es una bomba de relojería: cambiar el token deja el temporizador
 * atrás y la animación se corta a medias.
 */

/** Duración CSS por defecto si el token no existe o no se puede leer. */
const FALLBACK_UNIT_ERROR = null;

/**
 * Convierte una duración CSS a milisegundos. Devuelve `fallbackMs` si el
 * valor está vacío o no tiene una unidad de tiempo válida.
 *
 * Es pura y se exporta aparte de `readMotionToken` para poder testearla sin
 * DOM: el navegador normaliza al leer con `getComputedStyle`, así que el
 * mismo token puede llegar como `"320ms"` o como `".32s"` según el motor.
 */
export function parseCssDuration(raw: string, fallbackMs: number): number {
  const value = raw.trim();
  if (value === "") return fallbackMs;

  // El orden importa: "ms" termina en "s", así que se comprueba primero.
  const unit = value.endsWith("ms")
    ? "ms"
    : value.endsWith("s")
      ? "s"
      : FALLBACK_UNIT_ERROR;
  if (unit === FALLBACK_UNIT_ERROR) return fallbackMs;

  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return fallbackMs;

  return unit === "ms" ? amount : amount * 1000;
}

/**
 * Lee una duración declarada en `tokens.css` (p. ej. `--duration-settle`) en
 * milisegundos. En servidor no hay `getComputedStyle`, así que devuelve el
 * fallback; los usos previstos viven dentro de efectos, que solo corren en
 * cliente.
 */
export function readMotionToken(name: string, fallbackMs: number): number {
  if (typeof window === "undefined") return fallbackMs;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return parseCssDuration(raw, fallbackMs);
}
