import { describe, it, expect } from "vitest";
import { actions } from "@/data/demo-data";
import { riskLevelLabel } from "@/domain";
import type { ActionStatus } from "@/domain";

const ALL_STATUSES: ActionStatus[] = [
  "proposed",
  "allowed",
  "blocked",
  "needs_approval",
  "approved",
  "rejected",
  "changes_requested",
  "escalated",
  "executed",
  "failed",
];

describe("datos semilla de acciones", () => {
  it("cubren todos los estados de AgentAction", () => {
    const present = new Set(actions.map((a) => a.status));
    for (const status of ALL_STATUSES) {
      expect(present.has(status), `falta el estado ${status}`).toBe(true);
    }
  });

  it("toda acción tiene un nivel de riesgo con etiqueta", () => {
    for (const action of actions) {
      expect(riskLevelLabel[action.riskLevel]).toBeTruthy();
    }
  });
});
