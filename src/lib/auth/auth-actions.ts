"use server";

/**
 * Server actions de autenticación: login y logout. `login` sigue el flujo
 * endurecido del spec de fase 11: valida credenciales, busca el usuario con
 * `findFirst` (el email es único por organización, no global), y verifica
 * siempre contra un hash -real o dummy- para que el tiempo de respuesta no
 * revele si el email existe.
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateCredentials } from "./credentials";
import { verifyPassword, hashPassword } from "./password";
import { createSession, destroySession } from "./session";

/** Contraseña usada solo para generar el hash dummy de la comparación de timing. */
const DUMMY_PASSWORD = "no-existe-ningun-usuario-con-esta-contraseña";

/** Hash dummy memoizado: se calcula una vez por proceso, no en cada intento de login. */
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = hashPassword(DUMMY_PASSWORD);
  }
  return dummyHash;
}

/**
 * Intenta autenticar con email + contraseña. Si las credenciales son válidas
 * crea la sesión y redirige a "/"; si no, devuelve un error genérico (nunca
 * revela si el email existe).
 */
export async function login(
  email: string,
  password: string,
): Promise<{ error: string }> {
  const validation = validateCredentials(email, password);
  if ("error" in validation) {
    return validation;
  }

  // findFirst, no findUnique: el email es único por organización, no global
  // (anotado para multi-org).
  const user = await prisma.user.findFirst({
    where: { email: email.trim(), status: "active" },
  });

  // Se verifica siempre contra un hash -el real o el dummy- para que
  // comprobar un email inexistente tarde lo mismo que uno válido.
  const hashToCheck = user?.passwordHash ?? (await getDummyHash());
  const matches = await verifyPassword(password, hashToCheck);

  if (!user || !matches) {
    return { error: "Credenciales inválidas." };
  }

  await createSession(user.id);
  redirect("/");
}

/** Cierra la sesión y redirige a login. */
export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
