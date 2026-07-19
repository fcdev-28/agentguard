import type { Agent, AuditEvent, AuditEventType, User } from "@/domain";
import { auditEventTypeLabel } from "@/domain";

/** Eventos de auditoría ordenados por fecha desc (más recientes primero). */
export function getAuditEvents(events: AuditEvent[]): AuditEvent[] {
  return [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Filtros combinables sobre el registro de auditoría; clave ausente o vacía no filtra. */
export interface AuditEventFilters {
  agentId?: string;
  eventType?: AuditEventType;
  /** ISO string; límite inferior inclusivo. */
  from?: string;
  /** ISO string; límite superior inclusivo. */
  to?: string;
}

/** Eventos que cumplen todos los filtros indicados a la vez. */
export function filterAuditEvents(
  events: AuditEvent[],
  filters: AuditEventFilters,
): AuditEvent[] {
  return events.filter((event) => {
    if (filters.agentId && event.agentId !== filters.agentId) return false;
    if (filters.eventType && event.eventType !== filters.eventType)
      return false;
    if (filters.from && event.createdAt < filters.from) return false;
    if (filters.to && event.createdAt > filters.to) return false;
    return true;
  });
}

/** Busca un evento de auditoría por id. */
export function getAuditEventById(
  events: AuditEvent[],
  id: string,
): AuditEvent | undefined {
  return events.find((e) => e.id === id);
}

/**
 * Convierte los valores de filtro crudos (de la UI o de query params) a
 * `AuditEventFilters` de dominio: descarta cadenas vacías, valida `eventType`
 * contra los tipos conocidos, y expande `from`/`to` a límites de día ISO
 * inclusivos. Fuente única de la conversión, compartida por el timeline y la
 * ruta de exportación.
 */
export function toAuditEventFilters(raw: {
  agentId?: string;
  eventType?: string;
  from?: string;
  to?: string;
}): AuditEventFilters {
  const filters: AuditEventFilters = {};
  if (raw.agentId) filters.agentId = raw.agentId;
  if (raw.eventType && raw.eventType in auditEventTypeLabel) {
    filters.eventType = raw.eventType as AuditEventType;
  }
  if (raw.from) filters.from = `${raw.from}T00:00:00.000Z`;
  if (raw.to) filters.to = `${raw.to}T23:59:59.999Z`;
  return filters;
}

/** Fila plana de un evento de auditoría, lista para una futura exportación (CSV/JSON). */
export interface AuditExportRow {
  id: string;
  createdAt: string;
  eventType: AuditEventType;
  eventTypeLabel: string;
  agentName: string | null;
  actorName: string | null;
  message: string;
  metadata: string;
}

/** Convierte un evento de auditoría en una fila plana serializable para exportación. */
export function toAuditExportRow(
  event: AuditEvent,
  { agents, users }: { agents: Agent[]; users: User[] },
): AuditExportRow {
  return {
    id: event.id,
    createdAt: event.createdAt,
    eventType: event.eventType,
    eventTypeLabel: auditEventTypeLabel[event.eventType],
    agentName: event.agentId
      ? (agents.find((a) => a.id === event.agentId)?.name ?? event.agentId)
      : null,
    actorName: event.actorUserId
      ? (users.find((u) => u.id === event.actorUserId)?.name ??
        event.actorUserId)
      : null,
    message: event.message,
    metadata: JSON.stringify(event.metadata),
  };
}
