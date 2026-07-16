import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PolicyInput } from "@/lib/policies";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    policy: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const adminUser = {
  id: "usr_admin",
  organizationId: "org_acme",
  name: "Lucía Marín",
  email: "lucia.marin@acme.example",
  role: "admin",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockRequireCan = vi.fn();

vi.mock("@/lib/auth/authz", () => ({
  requireCan: (...args: unknown[]) => mockRequireCan(...args),
}));

vi.mock("@/lib/session-db", () => ({
  getCurrentOrganization: vi.fn(async () => ({
    id: "org_acme",
    name: "Acme Operations",
    slug: "acme",
    emergencyStop: false,
    emergencyStopById: null,
    emergencyStopAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createPolicy,
  updatePolicy,
  publishPolicy,
  archivePolicy,
} from "./policy-actions";

function policyInput(partial: Partial<PolicyInput> = {}): PolicyInput {
  return {
    name: "Reembolsos altos",
    description: "Requiere aprobación por encima de 200 EUR.",
    effect: "require_approval",
    conditions: { maxAmount: 200 },
    approvalSlaMinutes: 30,
    ...partial,
  };
}

beforeEach(() => {
  mockFindUnique.mockReset();
  mockCreate.mockReset().mockResolvedValue({ id: "pol_new" });
  mockUpdate.mockReset().mockResolvedValue({});
  vi.mocked(revalidatePath).mockClear();
  mockRequireCan.mockReset().mockResolvedValue({ user: adminUser });
});

describe("createPolicy", () => {
  it("crea la política en borrador con el usuario y la organización en sesión", async () => {
    const result = await createPolicy(policyInput());

    expect(result).toEqual({ ok: true, id: "pol_new" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "org_acme",
        name: "Reembolsos altos",
        description: "Requiere aprobación por encima de 200 EUR.",
        status: "draft",
        version: 1,
        conditions: { maxAmount: 200 },
        effect: "require_approval",
        approvalSlaMinutes: 30,
        createdById: "usr_admin",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/policies");
  });

  it("devuelve error si el input no es válido, sin llegar a crear", async () => {
    const result = await createPolicy(policyInput({ name: "   " }));

    expect(result).toEqual({ error: "El nombre no puede estar vacío." });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("updatePolicy", () => {
  it("actualiza los campos editables cuando la política existe y el input es válido", async () => {
    mockFindUnique.mockResolvedValue({ id: "pol_1" });

    const result = await updatePolicy(
      "pol_1",
      policyInput({ name: "Nuevo nombre" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "pol_1" },
      data: {
        name: "Nuevo nombre",
        description: "Requiere aprobación por encima de 200 EUR.",
        effect: "require_approval",
        conditions: { maxAmount: 200 },
        approvalSlaMinutes: 30,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/policies");
    expect(revalidatePath).toHaveBeenCalledWith("/policies/[policyId]", "page");
  });

  it("devuelve error si la política no existe", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await updatePolicy("pol_missing", policyInput());

    expect(result).toEqual({ error: "La política no existe." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("devuelve error si el input no es válido, sin llegar a actualizar", async () => {
    mockFindUnique.mockResolvedValue({ id: "pol_1" });

    const result = await updatePolicy(
      "pol_1",
      policyInput({ description: "  " }),
    );

    expect(result).toEqual({
      error: "La descripción no puede estar vacía.",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("publishPolicy", () => {
  it("publica una política en borrador (fija publishedAt)", async () => {
    mockFindUnique.mockResolvedValue({ status: "draft" });

    const result = await publishPolicy("pol_1");

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "pol_1" },
      data: { status: "active", publishedAt: expect.any(Date) },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/policies");
    expect(revalidatePath).toHaveBeenCalledWith("/policies/[policyId]", "page");
  });

  it("devuelve error si la política no existe", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await publishPolicy("pol_missing");

    expect(result).toEqual({ error: "La política no existe." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("devuelve error si la transición no procede (ya publicada)", async () => {
    mockFindUnique.mockResolvedValue({ status: "active" });

    const result = await publishPolicy("pol_1");

    expect(result).toEqual({ error: "La política ya está publicada." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("archivePolicy", () => {
  it("archiva una política en borrador o activa", async () => {
    mockFindUnique.mockResolvedValue({ status: "active" });

    const result = await archivePolicy("pol_1");

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "pol_1" },
      data: { status: "archived" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/policies");
    expect(revalidatePath).toHaveBeenCalledWith("/policies/[policyId]", "page");
  });

  it("devuelve error si la política no existe", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await archivePolicy("pol_missing");

    expect(result).toEqual({ error: "La política no existe." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("devuelve error si la transición no procede (ya archivada)", async () => {
    mockFindUnique.mockResolvedValue({ status: "archived" });

    const result = await archivePolicy("pol_1");

    expect(result).toEqual({ error: "La política ya está archivada." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("autorización (requireCan)", () => {
  it("createPolicy no ejecuta si requireCan deniega", async () => {
    mockRequireCan.mockResolvedValue({ error: "No autorizado." });

    const result = await createPolicy(policyInput());

    expect(result).toEqual({ error: "No autorizado." });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("updatePolicy no ejecuta si requireCan deniega", async () => {
    mockRequireCan.mockResolvedValue({ error: "No autorizado." });

    const result = await updatePolicy("pol_1", policyInput());

    expect(result).toEqual({ error: "No autorizado." });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("publishPolicy no ejecuta si requireCan deniega", async () => {
    mockRequireCan.mockResolvedValue({ error: "No autorizado." });

    const result = await publishPolicy("pol_1");

    expect(result).toEqual({ error: "No autorizado." });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("archivePolicy no ejecuta si requireCan deniega", async () => {
    mockRequireCan.mockResolvedValue({ error: "No autorizado." });

    const result = await archivePolicy("pol_1");

    expect(result).toEqual({ error: "No autorizado." });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
