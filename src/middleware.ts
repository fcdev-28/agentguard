import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { authSecret, SESSION_COOKIE_NAME } from "@/lib/auth/config";

/**
 * Middleware de solo UX: redirige a `/login` si la cookie de sesión no está
 * presente o no es válida (firma/expiración). No consulta BD ni bcrypt (Edge
 * Runtime no los soporta), así que NO revalida `status` ni rol.
 *
 * Esto NO es la frontera de autorización real: esa la imponen
 * `getCurrentUser` (fail-closed, revalida `status` en BD en cada request) y,
 * en el slice de RBAC, `requireCan` en cada mutación. Un usuario desactivado
 * a mitad de sesión pasa este middleware (su JWT sigue siendo válido) pero
 * es bloqueado por `getCurrentUser`.
 *
 * Las rutas `/api/*` quedan fuera de este middleware de sesión: cada una
 * autentica por su cuenta (API key para ingesta, CRON_SECRET para el barrido).
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, authSecret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
