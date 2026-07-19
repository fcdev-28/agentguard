import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationEvent } from "./events";

const findMany = vi.fn();
const notifyInApp = vi.fn();
const notifyEmail = vi.fn();
const notifySlack = vi.fn();
const metric = vi.fn();
const loggerError = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: (...a: unknown[]) => findMany(...a) } },
}));
vi.mock("./channels/in-app", () => ({
  notifyInApp: (...a: unknown[]) => notifyInApp(...a),
}));
vi.mock("./channels/email", () => ({
  notifyEmail: (...a: unknown[]) => notifyEmail(...a),
}));
vi.mock("./channels/slack", () => ({
  notifySlack: (...a: unknown[]) => notifySlack(...a),
}));
vi.mock("@/lib/observability/logger", () => ({
  metric: (...a: unknown[]) => metric(...a),
  logger: { error: (...a: unknown[]) => loggerError(...a), info: vi.fn() },
}));

import { notify } from "./notify";

const event: NotificationEvent = {
  type: "action_escalated",
  organizationId: "org-1",
  actionId: "act-1",
  message: "Acción escalada por SLA.",
};

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([
    {
      id: "a",
      organizationId: "org-1",
      name: "A",
      email: "a@x.com",
      role: "admin",
      createdAt: "2026-07-19T00:00:00.000Z",
    },
  ]);
  notifyInApp.mockReset().mockResolvedValue(undefined);
  notifyEmail.mockReset().mockResolvedValue(undefined);
  notifySlack.mockReset().mockResolvedValue(undefined);
  metric.mockReset();
  loggerError.mockReset();
});

describe("notify", () => {
  it("llama a los tres canales y emite metric sent por canal", async () => {
    await notify(event);
    expect(notifyInApp).toHaveBeenCalledTimes(1);
    expect(notifyEmail).toHaveBeenCalledTimes(1);
    expect(notifySlack).toHaveBeenCalledTimes(1);
    const sent = metric.mock.calls.filter((c) => c[0] === "notification.sent");
    expect(sent).toHaveLength(3);
  });

  it("un canal que lanza no impide los demás y no propaga", async () => {
    notifyEmail.mockRejectedValue(new Error("boom"));
    await expect(notify(event)).resolves.toBeUndefined();
    expect(notifyInApp).toHaveBeenCalled();
    expect(notifySlack).toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalled();
    expect(metric.mock.calls).toContainEqual([
      "notification.failed",
      { channel: "email", type: "action_escalated" },
    ]);
  });

  it("un fallo al resolver destinatarios degrada a lista vacía sin propagar y Slack sigue emitiendo", async () => {
    findMany.mockRejectedValue(new Error("db down"));

    await expect(notify(event)).resolves.toBeUndefined();

    expect(notifySlack).toHaveBeenCalledTimes(1);
    expect(notifyInApp).toHaveBeenCalledWith(event, []);
    expect(notifyEmail).toHaveBeenCalledWith(event, []);
    expect(loggerError).toHaveBeenCalledWith(
      "Fallo al resolver destinatarios de notificación",
      expect.objectContaining({ type: "action_escalated" }),
    );
    expect(metric.mock.calls).toContainEqual([
      "notification.failed",
      { channel: "recipients", type: "action_escalated" },
    ]);
  });
});
