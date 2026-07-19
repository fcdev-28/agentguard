import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationEvent } from "../events";

const send = vi.fn();
vi.mock("@/lib/execution/transport", () => ({
  resolveTransport: () => ({
    name: "test",
    send: (...a: unknown[]) => send(...a),
  }),
}));

import { notifyEmail } from "./email";

const event: NotificationEvent = {
  type: "agent_error",
  organizationId: "org-1",
  actionId: "act-1",
  message: "El agente falló al ejecutar la acción.",
};

function user(id: string, email: string) {
  return {
    id,
    organizationId: "org-1",
    name: id,
    email,
    role: "admin" as const,
    status: "active" as const,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  };
}

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ ok: true, providerId: "x" });
});

describe("notifyEmail", () => {
  it("envía un email por destinatario con email", async () => {
    await notifyEmail(event, [user("a", "a@x.com"), user("b", "b@x.com")]);
    expect(send).toHaveBeenCalledTimes(2);
    const msg = send.mock.calls[0][0] as {
      to: string;
      subject: string;
      body: string;
    };
    expect(msg.to).toBe("a@x.com");
    expect(msg.subject).toContain("AgentGuard");
    expect(msg.body).toBe(event.message);
  });

  it("se salta destinatarios sin email", async () => {
    await notifyEmail(event, [user("a", "")]);
    expect(send).not.toHaveBeenCalled();
  });
});
