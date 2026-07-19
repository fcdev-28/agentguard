import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getAuditEventsData = vi.fn();
const getAgents = vi.fn();
const getUsers = vi.fn();

vi.mock("@/lib/session-db", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));
vi.mock("@/data/audit", () => ({
  getAuditEvents: (...a: unknown[]) => getAuditEventsData(...a),
}));
vi.mock("@/data/agents", () => ({
  getAgents: (...a: unknown[]) => getAgents(...a),
}));
vi.mock("@/data/users", () => ({
  getUsers: (...a: unknown[]) => getUsers(...a),
}));

import { GET } from "./route";

function event(over: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    organizationId: "org-1",
    actorUserId: null,
    agentId: "agt-a",
    actionId: null,
    eventType: "action_blocked",
    message: "m",
    metadata: {},
    createdAt: "2026-07-19T10:00:00.000Z",
    ...over,
  };
}

function req(query = ""): Request {
  return new Request(`http://x/api/audit/export${query}`);
}

beforeEach(() => {
  getCurrentUser.mockReset().mockResolvedValue({ id: "u-1", role: "auditor" });
  getAuditEventsData.mockReset().mockResolvedValue([
    event(),
    event({
      id: "evt-2",
      agentId: "agt-b",
      createdAt: "2026-07-18T10:00:00.000Z",
    }),
  ]);
  getAgents.mockReset().mockResolvedValue([
    { id: "agt-a", name: "Agente A" },
    { id: "agt-b", name: "Agente B" },
  ]);
  getUsers.mockReset().mockResolvedValue([]);
});

describe("GET /api/audit/export", () => {
  it("sin sesión → 401", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("CSV por defecto con Content-Disposition de descarga", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(
      /attachment; filename="audit-log-\d{4}-\d{2}-\d{2}\.csv"/,
    );
    const text = await res.text();
    expect(text.split("\n")[0]).toContain("id,createdAt,eventType");
    expect(text).toContain("Agente A");
  });

  it("filtra por agentId (menos filas)", async () => {
    const res = await GET(req("?agentId=agt-a"));
    const text = await res.text();
    const dataLines = text.split("\n").slice(1).filter(Boolean);
    expect(dataLines).toHaveLength(1);
    expect(text).toContain("Agente A");
    expect(text).not.toContain("Agente B");
  });

  it("format=json → Content-Type JSON y cuerpo array", async () => {
    const res = await GET(req("?format=json"));
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toContain(".json");
    const parsed = JSON.parse(await res.text());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });
});
