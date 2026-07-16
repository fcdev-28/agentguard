/**
 * Validación pura de credenciales de login: formato de email y campos no
 * vacíos. No consulta BD ni compara contraseñas — eso vive en `auth-actions`.
 */

/** Formato de email suficiente para un formulario de login (no exhaustivo). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CredentialsValidation = { ok: true } | { error: string };

/** Valida email y contraseña antes de tocar BD. */
export function validateCredentials(
  email: string,
  password: string,
): CredentialsValidation {
  if (!email.trim() || !password) {
    return { error: "Introduce email y contraseña." };
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return { error: "El email no tiene un formato válido." };
  }
  return { ok: true };
}
