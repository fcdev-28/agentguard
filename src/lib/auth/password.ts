/**
 * Contraseñas: hash y verificación con `bcryptjs`. Solo se usa en runtime
 * Node (server actions, seed) — nunca en el middleware (Edge Runtime), donde
 * bcrypt no es viable.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Genera el hash bcrypt de una contraseña en texto plano. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra un hash. Falla cerrado si el
 * hash es `null` (usuario sin credenciales, p. ej. `invited`/`disabled`): un
 * hash nulo nunca hace match.
 */
export async function verifyPassword(
  plain: string,
  hash: string | null,
): Promise<boolean> {
  if (hash === null) return false;
  return bcrypt.compare(plain, hash);
}
