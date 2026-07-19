import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const updateMany = vi.fn();
const retryExecution = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentAction: {
      findMany: (...a: unknown[]) => findMany(...a),
      updateMany: (...a: unknown[]) => updateMany(...a),
    },
  },
}));
vi.mock("@/lib/execution/runner", () => ({
  retryExecution: (...a: unknown[]) => retryExecution(...a),
}));

import { POST } from "./route";

function req(auth?: string): Request {
  return new Request("http://x/api/cron/retry-executions", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "secreto";
  retryExecution.mockResolvedValue({ ok: true, status: "executed" });
});
afterEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("POST /api/cron/retry-executions", () => {
  it("401 sin secret válido", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
  });

  it("reintenta las acciones reclamadas", async () => {
    findMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    updateMany.mockResolvedValue({ count: 1 });
    const res = await POST(req("Bearer secreto"));
    expect(await res.json()).toEqual({ retried: 2 });
    expect(retryExecution).toHaveBeenCalledTimes(2);
  });

  it("no reintenta la acción que otro barrido ya reclamó (claim count=0)", async () => {
    findMany.mockResolvedValue([{ id: "a1" }]);
    updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(req("Bearer secreto"));
    expect(await res.json()).toEqual({ retried: 0 });
    expect(retryExecution).not.toHaveBeenCalled();
  });
});
