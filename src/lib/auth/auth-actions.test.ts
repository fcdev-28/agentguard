import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { hashPassword } from "./password";

const mockFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

const mockCreateSession = vi.fn();
const mockDestroySession = vi.fn();

vi.mock("./session", () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  destroySession: (...args: unknown[]) => mockDestroySession(...args),
}));

// `redirect` de Next lanza una excepción especial que interrumpe la
// ejecución; se simula igual para poder comprobar que el resto del código no
// se ejecuta después de una redirección.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { login, logout } from "./auth-actions";

let validHash: string;

beforeAll(async () => {
  validHash = await hashPassword("agentguard-demo");
});

beforeEach(() => {
  mockFindFirst.mockReset();
  mockCreateSession.mockReset().mockResolvedValue(undefined);
  mockDestroySession.mockReset().mockResolvedValue(undefined);
});

describe("login", () => {
  it("crea la sesión y redirige a «/» con credenciales válidas", async () => {
    mockFindFirst.mockResolvedValue({
      id: "usr_admin",
      email: "lucia.marin@acme.example",
      passwordHash: validHash,
    });

    await expect(
      login("lucia.marin@acme.example", "agentguard-demo"),
    ).rejects.toThrow("REDIRECT:/");

    expect(mockCreateSession).toHaveBeenCalledWith("usr_admin");
  });

  it("devuelve un error genérico con la contraseña incorrecta", async () => {
    mockFindFirst.mockResolvedValue({
      id: "usr_admin",
      email: "lucia.marin@acme.example",
      passwordHash: validHash,
    });

    const result = await login(
      "lucia.marin@acme.example",
      "contraseña-incorrecta",
    );

    expect(result).toEqual({ error: "Credenciales inválidas." });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("devuelve un error genérico cuando el email no existe", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await login("no-existe@acme.example", "agentguard-demo");

    expect(result).toEqual({ error: "Credenciales inválidas." });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("filtra por status «active»: un usuario invited/disabled nunca aparece en la query", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await login("jorge.salas@acme.example", "agentguard-demo");

    expect(result).toEqual({ error: "Credenciales inválidas." });
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { email: "jorge.salas@acme.example", status: "active" },
    });
  });

  it("rechaza credenciales con formato inválido sin consultar la BD", async () => {
    const result = await login("no-es-un-email", "agentguard-demo");

    expect(result).toEqual({ error: "El email no tiene un formato válido." });
    expect(mockFindFirst).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("destruye la sesión y redirige a /login", async () => {
    await expect(logout()).rejects.toThrow("REDIRECT:/login");

    expect(mockDestroySession).toHaveBeenCalled();
  });
});
