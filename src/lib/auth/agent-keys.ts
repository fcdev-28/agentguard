/**
 * Helpers puros de API keys de agente (sin Prisma, testeables). El I/O contra
 * BD vive en `agent-keys-db.ts` (patrón session.ts / session-db.ts).
 *
 * La key se muestra en claro una sola vez al crearla; en BD solo se guarda su
 * hash sha256. El `prefix` (primeros chars) se guarda aparte para mostrarla en
 * la UI sin revelar el secreto.
 */
import { createHash, randomBytes } from "node:crypto";

/** Extrae el token de un header `Authorization: Bearer <token>`. */
export function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/** sha256 hex del token: lo que se guarda y se compara en BD. */
export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Genera una key nueva: el secreto en claro, su prefijo visible y su hash. */
export function generateApiKeyToken(): {
  token: string;
  prefix: string;
  keyHash: string;
} {
  const token = `ag_live_${randomBytes(24).toString("hex")}`;
  return { token, prefix: token.slice(0, 12), keyHash: hashApiKey(token) };
}
