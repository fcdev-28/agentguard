/**
 * Configuración compartida de autenticación: secreto de firma y nombre de la
 * cookie de sesión. Sin `server-only` a propósito: lo importan tanto código
 * de servidor Node (`auth/session.ts`) como el middleware, que corre en el
 * Edge Runtime — un módulo `server-only` no debería cruzar esa frontera.
 *
 * Lee `AUTH_SECRET` una única vez al cargar el módulo y falla rápido si no
 * está definido o es demasiado corto: un secreto ausente o débil equivale a
 * no firmar la cookie de sesión.
 */
const rawSecret = process.env.AUTH_SECRET;

if (!rawSecret || rawSecret.length < 32) {
  throw new Error(
    "AUTH_SECRET no está definido o mide menos de 32 caracteres. " +
      "Genera uno con `openssl rand -base64 48` y añádelo a `.env`.",
  );
}

/** Secreto de firma codificado para `jose`: HS256 espera un `Uint8Array`. */
export const authSecret: Uint8Array = new TextEncoder().encode(rawSecret);

/** Nombre de la cookie que guarda el JWT de sesión. */
export const SESSION_COOKIE_NAME = "agentguard_session";
