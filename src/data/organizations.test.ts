import { describe, it, expect } from "vitest";
import { mapOrganization } from "./organizations";

describe("mapOrganization", () => {
  it("traduce una fila de Prisma a la Organization de dominio", () => {
    const row = {
      id: "org_acme",
      name: "Acme Operations",
      slug: "acme",
      emergencyStop: false,
      emergencyStopById: null,
      emergencyStopAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-12T08:30:00.000Z"),
    };

    expect(mapOrganization(row)).toEqual({
      id: "org_acme",
      name: "Acme Operations",
      slug: "acme",
      emergencyStop: false,
      emergencyStopById: null,
      emergencyStopAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-07-12T08:30:00.000Z",
    });
  });

  it("convierte emergencyStopAt a ISO string cuando la parada está activa", () => {
    const row = {
      id: "org_acme",
      name: "Acme Operations",
      slug: "acme",
      emergencyStop: true,
      emergencyStopById: "usr_admin",
      emergencyStopAt: new Date("2026-07-12T08:45:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-12T08:45:00.000Z"),
    };

    const result = mapOrganization(row);
    expect(result.emergencyStop).toBe(true);
    expect(result.emergencyStopById).toBe("usr_admin");
    expect(result.emergencyStopAt).toBe("2026-07-12T08:45:00.000Z");
  });
});
