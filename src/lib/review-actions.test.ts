import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentAction: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    approval: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
    actionComment: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const reviewerUser = {
  id: "usr_reviewer",
  organizationId: "org_acme",
  name: "Diego Ferrer",
  email: "diego.ferrer@acme.example",
  role: "reviewer",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockRequireCan = vi.fn();

vi.mock("@/lib/auth/authz", () => ({
  requireCan: (...args: unknown[]) => mockRequireCan(...args),
}));

const mockExecuteAction = vi.fn();

vi.mock("@/lib/execution/runner", () => ({
  executeAction: (...args: unknown[]) => mockExecuteAction(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  decideAction,
  decideManyActions,
  escalateAction,
  addComment,
} from "./review-actions";

beforeEach(() => {
  mockFindUnique.mockReset();
  mockFindMany.mockReset();
  mockUpdate.mockReset().mockResolvedValue({});
  mockUpsert.mockReset().mockResolvedValue({});
  mockCreate.mockReset().mockResolvedValue({});
  mockTransaction.mockReset();
  mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  mockRequireCan.mockReset().mockResolvedValue({ user: reviewerUser });
  mockExecuteAction
    .mockReset()
    .mockResolvedValue({ ok: true, status: "executed" });
});

describe("decideAction", () => {
  it("persiste la aprobación (upsert) y actualiza el status cuando la decisión es válida", async () => {
    mockFindUnique.mockResolvedValue({ status: "needs_approval" });

    const result = await decideAction("act_1", "approved", null);

    expect(result).toEqual({ ok: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { actionId: "act_1" },
        create: expect.objectContaining({
          actionId: "act_1",
          reviewerId: "usr_reviewer",
          decision: "approved",
          reason: null,
        }),
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "act_1" },
      data: { status: "approved" },
    });
    expect(mockExecuteAction).toHaveBeenCalledWith("act_1");
  });

  it("no ejecuta la acción cuando la decisión no es una aprobación", async () => {
    mockFindUnique.mockResolvedValue({ status: "needs_approval" });

    const result = await decideAction("act_1", "rejected", "No procede.");

    expect(result).toEqual({ ok: true });
    expect(mockExecuteAction).not.toHaveBeenCalled();
  });

  it("devuelve error si la acción no existe", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await decideAction("act_missing", "approved", null);

    expect(result).toEqual({ error: "La acción no existe." });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("devuelve error si la acción ya no está pendiente de revisión", async () => {
    mockFindUnique.mockResolvedValue({ status: "approved" });

    const result = await decideAction("act_1", "approved", null);

    expect(result).toEqual({
      error: "La acción ya no está pendiente de revisión.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("exige un motivo para rechazar", async () => {
    mockFindUnique.mockResolvedValue({ status: "needs_approval" });

    const result = await decideAction("act_1", "rejected", null);

    expect(result).toEqual({ error: "Esta decisión requiere un motivo." });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("decideManyActions", () => {
  it("aplica la decisión solo a las acciones que siguen pendientes, sin romper el lote", async () => {
    mockFindMany.mockResolvedValue([
      { id: "act_1", status: "needs_approval" },
      { id: "act_2", status: "approved" }, // ya decidida: se omite
    ]);

    const result = await decideManyActions(
      ["act_1", "act_2"],
      "approved",
      null,
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "act_1" },
      data: { status: "approved" },
    });
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("es un no-op (pero devuelve éxito) cuando ninguna acción es válida", async () => {
    mockFindMany.mockResolvedValue([{ id: "act_1", status: "approved" }]);

    const result = await decideManyActions(["act_1"], "approved", null);

    expect(result).toEqual({ ok: true });
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("escalateAction", () => {
  it("persiste el escalado (sin destinatario) y actualiza el status", async () => {
    mockFindUnique.mockResolvedValue({ status: "needs_approval" });

    const result = await escalateAction("act_1");

    expect(result).toEqual({ ok: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          actionId: "act_1",
          reviewerId: "usr_reviewer",
          decision: "escalated",
          reason: null,
        }),
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "act_1" },
      data: { status: "escalated" },
    });
  });

  it("devuelve error si la acción ya no está pendiente de revisión", async () => {
    mockFindUnique.mockResolvedValue({ status: "executed" });

    const result = await escalateAction("act_1");

    expect(result).toEqual({
      error: "La acción ya no está pendiente de revisión.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("addComment", () => {
  it("crea el comentario (recortado) cuando el cuerpo es válido", async () => {
    const result = await addComment("act_1", "  Confirmado con el cliente.  ");

    expect(result).toEqual({ ok: true });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        actionId: "act_1",
        authorId: "usr_reviewer",
        body: "Confirmado con el cliente.",
      },
    });
  });

  it("devuelve error cuando el cuerpo está vacío", async () => {
    const result = await addComment("act_1", "   ");

    expect(result).toEqual({ error: "El comentario no puede estar vacío." });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("autorización (requireCan)", () => {
  it("decideAction no ejecuta si requireCan deniega", async () => {
    mockRequireCan.mockResolvedValue({ error: "No autorizado." });

    const result = await decideAction("act_1", "approved", null);

    expect(result).toEqual({ error: "No autorizado." });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("addComment no ejecuta si requireCan deniega", async () => {
    mockRequireCan.mockResolvedValue({ error: "No autorizado." });

    const result = await addComment("act_1", "Comentario válido.");

    expect(result).toEqual({ error: "No autorizado." });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
