import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();
const integrationLogCreate = vi.fn();
const auditEventCreate = vi.fn();
const orgFindUnique = vi.fn();
const toolFindUnique = vi.fn();
const send = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: (...a: unknown[]) => orgFindUnique(...a) },
    tool: { findUnique: (...a: unknown[]) => toolFindUnique(...a) },
    agentAction: {
      findUnique: vi.fn().mockResolvedValue({ attempts: 0 }),
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
vi.mock("@/lib/emergency", () => ({ canExecute: () => true }));

import { getActionById } from "@/data/actions";
import { executeAction } from "./runner";

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
});
