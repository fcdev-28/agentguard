import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationEvent } from "../events";
import { notifySlack } from "./slack";

const event: NotificationEvent = {
  type: "emergency_stop",
  organizationId: "org-1",
  actionId: null,
  message: "Parada de emergencia activada.",
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SLACK_WEBHOOK_URL;
});

describe("notifySlack", () => {
  it("sin SLACK_WEBHOOK_URL → no llama a fetch", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    await notifySlack(event);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("con webhook → POST con text que incluye el mensaje", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/abc";
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    await notifySlack(event);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://hooks.slack.test/abc");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.text).toContain(event.message);
  });

  it("respuesta no-ok → lanza", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/abc";
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 500 }),
    );
    await expect(notifySlack(event)).rejects.toThrow();
  });
});
