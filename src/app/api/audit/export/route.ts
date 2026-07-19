import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session-db";
import { getAuditEvents } from "@/data/audit";
import { getAgents } from "@/data/agents";
import { getUsers } from "@/data/users";
import {
  filterAuditEvents,
  getAuditEvents as sortAuditEvents,
  toAuditEventFilters,
  toAuditExportRow,
} from "@/lib/audit";
import { toCsv, toJson } from "@/lib/audit-export";

/**
 * Descarga el registro de auditoría de la organización en CSV (por defecto) o
 * JSON, aplicando los mismos filtros que la UI (agente, tipo, rango de fechas).
 * Requiere sesión, en paridad con la página `/audit`.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "csv";

  const filters = toAuditEventFilters({
    agentId: searchParams.get("agentId") ?? undefined,
    eventType: searchParams.get("eventType") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const [events, agents, users] = await Promise.all([
    getAuditEvents(),
    getAgents(),
    getUsers(),
  ]);

  const rows = filterAuditEvents(sortAuditEvents(events), filters).map((e) =>
    toAuditExportRow(e, { agents, users }),
  );

  const date = new Date().toISOString().slice(0, 10);
  const body = format === "json" ? toJson(rows) : toCsv(rows);
  const contentType =
    format === "json"
      ? "application/json; charset=utf-8"
      : "text/csv; charset=utf-8";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="audit-log-${date}.${format}"`,
    },
  });
}
