import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationEvent } from "../events";

const createMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { createMany: (...a: unknown[]) => createMany(...a) },
  },
}));

import { notifyInApp } from "./in-app";

const event: NotificationEvent = {
  type: "approval_requested",
  organizationId: "org-1",
  actionId: "act-1",
  message: "Nueva acción pendiente de aprobación.",
};

function user(id: string) {
  return {
    id,
    organizationId: "org-1",
    name: id,
    email: `${id}@x.com`,
    role: "admin" as const,
    status: "active" as const,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  };
}

beforeEach(() => createMany.mockReset());

describe("notifyInApp", () => {
  it("crea una fila por destinatario", async () => {
    await notifyInApp(event, [user("a"), user("b")]);
    expect(createMany).toHaveBeenCalledTimes(1);
    const arg = createMany.mock.calls[0][0] as { data: unknown[] };
    expect(arg.data).toHaveLength(2);
  });

  it("sin destinatarios → no llama a createMany", async () => {
    await notifyInApp(event, []);
    expect(createMany).not.toHaveBeenCalled();
  });
});
