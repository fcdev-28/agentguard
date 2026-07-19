import { describe, expect, it } from "vitest";
import type { AuditExportRow } from "@/lib/audit";
import { toCsv, toJson } from "./audit-export";

function row(over: Partial<AuditExportRow> = {}): AuditExportRow {
  return {
    id: "evt-1",
    createdAt: "2026-07-19T10:00:00.000Z",
    eventType: "action_blocked",
    eventTypeLabel: "Acción bloqueada",
    agentName: "Agente A",
    actorName: null,
    message: "Mensaje simple",
    metadata: "{}",
    ...over,
  };
}

describe("toCsv", () => {
  it("emite la cabecera en orden estable", () => {
    const csv = toCsv([]);
    expect(csv).toBe(
      "id,createdAt,eventType,eventTypeLabel,agentName,actorName,message,metadata",
    );
  });

  it("una fila normal sin caracteres especiales no se entrecomilla", () => {
    const csv = toCsv([row()]);
    const line = csv.split("\n")[1];
    expect(line).toBe(
      "evt-1,2026-07-19T10:00:00.000Z,action_blocked,Acción bloqueada,Agente A,,Mensaje simple,{}",
    );
  });

  it("entrecomilla y escapa comas, comillas y saltos de línea", () => {
    const csv = toCsv([
      row({
        message: 'texto con "comillas", coma\ny salto',
        metadata: '{"k":"v,v"}',
      }),
    ]);
    const line = csv.split("\n").slice(1).join("\n");
    expect(line).toContain('"texto con ""comillas"", coma\ny salto"');
    expect(line).toContain('"{""k"":""v,v""}"');
  });

  it("null → celda vacía", () => {
    const csv = toCsv([row({ agentName: null, actorName: null })]);
    const cells = csv.split("\n")[1].split(",");
    expect(cells[4]).toBe(""); // agentName
    expect(cells[5]).toBe(""); // actorName
  });
});

describe("toJson", () => {
  it("lista vacía → []", () => {
    expect(toJson([])).toBe("[]");
  });

  it("serializa las filas como array indentado", () => {
    const parsed = JSON.parse(toJson([row()]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("evt-1");
    expect(parsed[0].eventTypeLabel).toBe("Acción bloqueada");
  });
});
