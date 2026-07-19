import type { AuditExportRow } from "@/lib/audit";

/** Columnas del CSV, en orden estable (coinciden con AuditExportRow). */
const CSV_COLUMNS: readonly (keyof AuditExportRow)[] = [
  "id",
  "createdAt",
  "eventType",
  "eventTypeLabel",
  "agentName",
  "actorName",
  "message",
  "metadata",
];

/** Escapa una celda CSV: la entrecomilla si contiene coma, comilla o salto; duplica comillas internas. */
function csvCell(value: string | null): string {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serializa las filas a CSV con cabecera. Lista vacía → solo la cabecera. */
export function toCsv(rows: AuditExportRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c])).join(","));
  return [header, ...body].join("\n");
}

/** Serializa las filas a JSON indentado. */
export function toJson(rows: AuditExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}
