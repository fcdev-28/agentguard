import { describe, it, expect } from "vitest";
import type { Agent, AuditEvent, User } from "@/domain";
import {
  getAuditEvents,
  filterAuditEvents,
  getAuditEventById,
  toAuditEventFilters,
  toAuditExportRow,
} from "@/lib/audit";

function event(partial: Partial<AuditEvent>): AuditEvent {
  return {
    id: "aud1",
    organizationId: "org1",
    actorUserId: null,
    agentId: null,
    actionId: null,
    eventType: "action_executed",
    message: "Evento de prueba.",
    metadata: {},
    createdAt: "2026-07-12T09:00:00.000Z",
    ...partial,
  };
}

function agent(partial: Partial<Agent>): Agent {
  return {
    id: "agt1",
    organizationId: "org1",
    ownerId: "usr1",
    name: "Agente de prueba",
    description: "",
    environment: "production",
    status: "active",
    mode: "enforce",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

function user(partial: Partial<User>): User {
  return {
    id: "usr1",
    organizationId: "org1",
    name: "Usuaria de prueba",
    email: "usuaria@example.com",
    role: "admin",
    status: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("getAuditEvents", () => {
  it("ordena por createdAt desc (más recientes primero)", () => {
    const input = [
      event({ id: "old", createdAt: "2026-07-01T00:00:00.000Z" }),
      event({ id: "new", createdAt: "2026-07-10T00:00:00.000Z" }),
      event({ id: "mid", createdAt: "2026-07-05T00:00:00.000Z" }),
    ];
    expect(getAuditEvents(input).map((e) => e.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("no muta el array original", () => {
    const input = [
      event({ id: "a", createdAt: "2026-07-01T00:00:00.000Z" }),
      event({ id: "b", createdAt: "2026-07-10T00:00:00.000Z" }),
    ];
    getAuditEvents(input);
    expect(input.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("filterAuditEvents", () => {
  const input = [
    event({
      id: "e1",
      agentId: "agt_a",
      eventType: "action_executed",
      createdAt: "2026-07-01T00:00:00.000Z",
    }),
    event({
      id: "e2",
      agentId: "agt_b",
      eventType: "action_blocked",
      createdAt: "2026-07-05T00:00:00.000Z",
    }),
    event({
      id: "e3",
      agentId: "agt_a",
      eventType: "action_blocked",
      createdAt: "2026-07-10T00:00:00.000Z",
    }),
  ];

  it("filtra por agentId", () => {
    expect(
      filterAuditEvents(input, { agentId: "agt_a" }).map((e) => e.id),
    ).toEqual(["e1", "e3"]);
  });

  it("filtra por eventType", () => {
    expect(
      filterAuditEvents(input, { eventType: "action_blocked" }).map(
        (e) => e.id,
      ),
    ).toEqual(["e2", "e3"]);
  });

  it("filtra por rango de fechas inclusivo", () => {
    expect(
      filterAuditEvents(input, {
        from: "2026-07-05T00:00:00.000Z",
        to: "2026-07-05T00:00:00.000Z",
      }).map((e) => e.id),
    ).toEqual(["e2"]);
  });

  it("combina varios filtros a la vez", () => {
    expect(
      filterAuditEvents(input, {
        agentId: "agt_a",
        eventType: "action_blocked",
      }).map((e) => e.id),
    ).toEqual(["e3"]);
  });

  it("sin filtros (objeto vacío) devuelve todos los eventos", () => {
    expect(filterAuditEvents(input, {}).map((e) => e.id)).toEqual([
      "e1",
      "e2",
      "e3",
    ]);
  });
});

describe("getAuditEventById", () => {
  it("devuelve el evento cuando existe", () => {
    const input = [event({ id: "e1" }), event({ id: "e2" })];
    expect(getAuditEventById(input, "e2")?.id).toBe("e2");
  });

  it("devuelve undefined si no existe", () => {
    const input = [event({ id: "e1" })];
    expect(getAuditEventById(input, "nope")).toBeUndefined();
  });
});

describe("toAuditExportRow", () => {
  it("resuelve nombre de agente y de actor cuando existen", () => {
    const e = event({
      id: "e1",
      agentId: "agt1",
      actorUserId: "usr1",
      eventType: "policy_published",
      message: "Política actualizada.",
      metadata: { version: 2 },
    });
    const row = toAuditExportRow(e, { agents: [agent({})], users: [user({})] });
    expect(row).toEqual({
      id: "e1",
      createdAt: e.createdAt,
      eventType: "policy_published",
      eventTypeLabel: "Política publicada",
      agentName: "Agente de prueba",
      actorName: "Usuaria de prueba",
      message: "Política actualizada.",
      metadata: JSON.stringify({ version: 2 }),
    });
  });

  it("agentName es null cuando agentId es null", () => {
    const e = event({ agentId: null, actorUserId: "usr1" });
    const row = toAuditExportRow(e, { agents: [], users: [user({})] });
    expect(row.agentName).toBeNull();
  });

  it("actorName es null cuando actorUserId es null", () => {
    const e = event({ agentId: "agt1", actorUserId: null });
    const row = toAuditExportRow(e, { agents: [agent({})], users: [] });
    expect(row.actorName).toBeNull();
  });
});

describe("toAuditEventFilters", () => {
  it("cadenas vacías o ausentes → sin filtros", () => {
    expect(toAuditEventFilters({})).toEqual({});
    expect(
      toAuditEventFilters({ agentId: "", eventType: "", from: "", to: "" }),
    ).toEqual({});
  });

  it("convierte from/to a límites de día ISO inclusivos", () => {
    expect(
      toAuditEventFilters({ from: "2026-07-19", to: "2026-07-20" }),
    ).toEqual({
      from: "2026-07-19T00:00:00.000Z",
      to: "2026-07-20T23:59:59.999Z",
    });
  });

  it("pasa agentId y eventType tal cual cuando están presentes", () => {
    expect(
      toAuditEventFilters({ agentId: "agt_a", eventType: "action_blocked" }),
    ).toEqual({ agentId: "agt_a", eventType: "action_blocked" });
  });

  it("ignora un eventType que no es un AuditEventType válido", () => {
    expect(toAuditEventFilters({ eventType: "no_existe" })).toEqual({});
  });
});
