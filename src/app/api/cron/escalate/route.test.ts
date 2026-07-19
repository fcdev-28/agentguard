import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getActions = vi.fn();
const updateMany = vi.fn();
const auditEventCreate = vi.fn();

vi.mock("@/data/actions", () => ({
  getActions: (...a: unknown[]) => getActions(...a),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        agentAction: { updateMany: (...a: unknown[]) => updateMany(...a) },
        auditEvent: { create: (...a: unknown[]) => auditEventCreate(...a) },
      }),
  },
}));

const notify = vi.fn();
vi.mock("@/lib/notify/notify", () => ({
  notify: (...a: unknown[]) => notify(...a),
}));

import { POST } from "./route";

function req(auth?: string): Request {
  return new Request("http://x/api/cron/escalate", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

const overdueAction = {
  id: "a1",
  organizationId: "org1",
  agentId: "ag1",
  title: "Enviar factura",
  status: "needs_approval",
  approvalDueAt: "2020-01-01T00:00:00.000Z",
};

beforeEach(() => {
  process.env.CRON_SECRET = "secreto";
  getActions.mockResolvedValue([]);
  updateMany.mockResolvedValue({ count: 1 });
  notify.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("POST /api/cron/escalate", () => {
  it("401 sin secret válido", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(notify).not.toHaveBeenCalled();
  });

  it("no hace nada si no hay acciones vencidas", async () => {
    const res = await POST(req("Bearer secreto"));
    expect(await res.json()).toEqual({ escalated: 0 });
    expect(notify).not.toHaveBeenCalled();
  });

  it("escala la acción vencida y notifica tras la transacción", async () => {
    getActions.mockResolvedValue([overdueAction]);
    const res = await POST(req("Bearer secreto"));

    expect(await res.json()).toEqual({ escalated: 1 });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({
      type: "action_escalated",
      actionId: overdueAction.id,
    });
  });

  it("no notifica la acción que otro barrido ya escaló (claim count=0)", async () => {
    getActions.mockResolvedValue([overdueAction]);
    updateMany.mockResolvedValue({ count: 0 });

    const res = await POST(req("Bearer secreto"));

    expect(await res.json()).toEqual({ escalated: 0 });
    expect(notify).not.toHaveBeenCalled();
  });
});
