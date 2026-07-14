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
