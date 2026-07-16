import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUniqueAgent = vi.fn();
const mockUpdateOrganization = vi.fn();
const mockUpdateAgent = vi.fn();
const mockCreateAuditEvent = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      update: (...args: unknown[]) => mockUpdateOrganization(...args),
    },
    agent: {
      findUnique: (...args: unknown[]) => mockFindUniqueAgent(...args),
      update: (...args: unknown[]) => mockUpdateAgent(...args),
    },
    auditEvent: {
      create: (...args: unknown[]) => mockCreateAuditEvent(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/session-db", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: "usr_admin",
    organizationId: "org_acme",
    name: "Ada Martín",
    email: "ada.martin@acme.example",
    role: "admin",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  engageEmergencyStop,
  releaseEmergencyStop,
  pauseAgent,
  resumeAgent,
} from "./runtime-actions";

beforeEach(() => {
  mockFindUniqueAgent.mockReset();
  mockUpdateOrganization.mockReset().mockResolvedValue({});
  mockUpdateAgent.mockReset().mockResolvedValue({});
  mockCreateAuditEvent.mockReset().mockResolvedValue({});
  mockTransaction.mockReset();
  mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  vi.mocked(revalidatePath).mockClear();
});

describe("engageEmergencyStop", () => {
  it("activa la parada de la organización y registra el evento de auditoría", async () => {
    const result = await engageEmergencyStop();

    expect(result).toEqual({ ok: true });
    expect(mockUpdateOrganization).toHaveBeenCalledWith({
      where: { id: "org_acme" },
      data: {
        emergencyStop: true,
        emergencyStopById: "usr_admin",
        emergencyStopAt: expect.any(Date),
      },
    });
    expect(mockCreateAuditEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_acme",
        actorUserId: "usr_admin",
        eventType: "emergency_stop_engaged",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("releaseEmergencyStop", () => {
  it("libera la parada y registra el evento de auditoría", async () => {
    const result = await releaseEmergencyStop();

    expect(result).toEqual({ ok: true });
    expect(mockUpdateOrganization).toHaveBeenCalledWith({
      where: { id: "org_acme" },
      data: {
        emergencyStop: false,
        emergencyStopById: null,
        emergencyStopAt: null,
      },
    });
    expect(mockCreateAuditEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: "emergency_stop_released" }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("pauseAgent", () => {
  it("pausa el agente y registra el evento de auditoría", async () => {
    mockFindUniqueAgent.mockResolvedValue({ name: "Sincronizador de datos" });

    const result = await pauseAgent("agt_datasync");

    expect(result).toEqual({ ok: true });
    expect(mockUpdateAgent).toHaveBeenCalledWith({
      where: { id: "agt_datasync" },
      data: { status: "paused" },
    });
    expect(mockCreateAuditEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: "agt_datasync",
        eventType: "agent_paused",
        message: "Sincronizador de datos pausado.",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/agents");
    expect(revalidatePath).toHaveBeenCalledWith("/agents/[agentId]", "page");
  });

  it("devuelve error si el agente no existe", async () => {
    mockFindUniqueAgent.mockResolvedValue(null);

    const result = await pauseAgent("agt_missing");

    expect(result).toEqual({ error: "El agente no existe." });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("resumeAgent", () => {
  it("reanuda el agente y registra el evento de auditoría", async () => {
    mockFindUniqueAgent.mockResolvedValue({ name: "Sincronizador de datos" });

    const result = await resumeAgent("agt_datasync");

    expect(result).toEqual({ ok: true });
    expect(mockUpdateAgent).toHaveBeenCalledWith({
      where: { id: "agt_datasync" },
      data: { status: "active" },
    });
    expect(mockCreateAuditEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "agent_resumed",
        message: "Sincronizador de datos reanudado.",
      }),
    });
  });

  it("devuelve error si el agente no existe", async () => {
    mockFindUniqueAgent.mockResolvedValue(null);

    const result = await resumeAgent("agt_missing");

    expect(result).toEqual({ error: "El agente no existe." });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
