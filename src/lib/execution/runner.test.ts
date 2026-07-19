import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();
const integrationLogCreate = vi.fn();
const auditEventCreate = vi.fn();
const orgFindUnique = vi.fn();
const toolFindUnique = vi.fn();
const agentActionFindUnique = vi.fn();
const send = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: (...a: unknown[]) => orgFindUnique(...a) },
    tool: { findUnique: (...a: unknown[]) => toolFindUnique(...a) },
    agentAction: {
      findUnique: (...a: unknown[]) => agentActionFindUnique(...a),
    },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        agentAction: { updateMany: (...a: unknown[]) => updateMany(...a) },
        integrationLog: {
          create: (...a: unknown[]) => integrationLogCreate(...a),
        },
        auditEvent: { create: (...a: unknown[]) => auditEventCreate(...a) },
      }),
  },
}));

vi.mock("@/data/actions", () => ({ getActionById: vi.fn() }));
vi.mock("@/lib/execution/transport", () => ({
  resolveTransport: () => ({ name: "resend", send }),
}));
vi.mock("@/lib/emergency", () => ({ canExecute: vi.fn(() => true) }));
vi.mock("@/lib/observability/logger", () => ({
  metric: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getActionById } from "@/data/actions";
import { canExecute } from "@/lib/emergency";
import { metric } from "@/lib/observability/logger";
import { executeAction, retryExecution } from "./runner";

const action = {
  id: "a1",
  organizationId: "org1",
  agentId: "ag1",
  toolId: "t1",
  status: "allowed",
  payload: { to: "x@example.com", subject: "S", body: "B" },
  title: "T",
  summary: "R",
};

beforeEach(() => {
  vi.mocked(getActionById).mockResolvedValue(action as never);
  orgFindUnique.mockResolvedValue({ emergencyStop: false });
  toolFindUnique.mockResolvedValue({ type: "email" });
  agentActionFindUnique.mockResolvedValue({ attempts: 0 });
  updateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => vi.clearAllMocks());

describe("executeAction — reintentos", () => {
  it("reprograma (nextRetryAt seteado) ante un fallo reintentable", async () => {
    send.mockResolvedValue({ ok: false, error: "500", retryable: true });
    const out = await executeAction("a1");
    expect(out).toEqual({ ok: true, status: "failed" });
    const data = updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("failed");
    expect(data.nextRetryAt).toBeInstanceOf(Date);
  });

  it("terminaliza (nextRetryAt null) ante un fallo no reintentable", async () => {
    send.mockResolvedValue({ ok: false, error: "400", retryable: false });
    await executeAction("a1");
    const data = updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("failed");
    expect(data.nextRetryAt).toBeNull();
  });

  it("marca executed y limpia nextRetryAt en éxito", async () => {
    send.mockResolvedValue({ ok: true, providerId: "p1" });
    const out = await executeAction("a1");
    expect(out).toEqual({ ok: true, status: "executed" });
    const data = updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("executed");
    expect(data.nextRetryAt).toBeNull();
  });

  it("el reschedule no toca `attempts` y emite la métrica de reintento programado", async () => {
    send.mockResolvedValue({ ok: false, error: "500", retryable: true });
    await executeAction("a1");
    const data = updateMany.mock.calls[0][0].data;
    expect("attempts" in data).toBe(false);
    expect(metric).toHaveBeenCalledWith(
      "action.retry_scheduled",
      expect.objectContaining({ attempt: 1 }),
    );
  });

  it("la idempotencia del persist (carrera perdida) no crea log ni evento y devuelve error", async () => {
    send.mockResolvedValue({ ok: false, error: "500", retryable: true });
    updateMany.mockResolvedValue({ count: 0 });
    const out = await executeAction("a1");
    expect(out).toEqual({ error: expect.stringContaining("ya fue procesada") });
    expect(integrationLogCreate).not.toHaveBeenCalled();
    expect(auditEventCreate).not.toHaveBeenCalled();
  });

  it("bloquea la ejecución si la parada de emergencia está activa", async () => {
    vi.mocked(canExecute).mockReturnValueOnce(false);
    const out = await executeAction("a1");
    expect(out).toEqual({
      error: expect.stringContaining("Parada de emergencia"),
    });
    expect(send).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(metric).toHaveBeenCalledWith(
      "execution.blocked_emergency",
      expect.objectContaining({ organizationId: "org1" }),
    );
  });
});

describe("retryExecution", () => {
  it("reprograma con attempts=2 usando el whereGuard status=failed", async () => {
    vi.mocked(getActionById).mockResolvedValue({
      ...action,
      status: "failed",
    } as never);
    agentActionFindUnique.mockResolvedValue({ attempts: 2 });
    send.mockResolvedValue({ ok: false, error: "500", retryable: true });

    const out = await retryExecution("a1");
    expect(out).toEqual({ ok: true, status: "failed" });
    const data = updateMany.mock.calls[0][0].data;
    expect(data.nextRetryAt).toBeInstanceOf(Date);
    expect(updateMany.mock.calls[0][0].where.status).toBe("failed");
    expect(metric).toHaveBeenCalledWith(
      "action.retry_scheduled",
      expect.objectContaining({ attempt: 3 }),
    );
  });
});
