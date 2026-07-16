import "server-only";

/**
 * Cookie de sesión: JWT HS256 firmado con `jose` (sin revocación explícita,
 * de ahí la expiración corta). `server-only` porque usa `cookies()` de
 * `next/headers`, solo disponible en contexto RSC/Server Action.
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { authSecret, SESSION_COOKIE_NAME } from "./config";

/** Vida de la sesión: única palanca frente a un token robado (no hay revocación). */
const SESSION_DURATION = "2d";

/** Firma un JWT para `userId` y lo guarda en una cookie httpOnly. */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(authSecret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}

/** Borra la cookie de sesión. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Lee la cookie de sesión y verifica su firma y expiración. Devuelve el
 * `userId` (claim `sub`) o `null` si no hay cookie, la firma no es válida o
 * el token ha expirado. No consulta BD: la revalidación de `status` vive en
 * `getCurrentUser` (`session-db.ts`).
 */
export async function readSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, authSecret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
