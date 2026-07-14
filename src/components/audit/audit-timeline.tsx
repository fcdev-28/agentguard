"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import type { Agent, AuditEvent, User } from "@/domain";
import { auditEventTypeLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatRelativeTime } from "@/lib/format";
import {
  filterAuditEvents,
  getAuditEventById,
  getAuditEvents,
} from "@/lib/audit";
import {
  AuditFilters,
  emptyAuditFilters,
  type AuditFilterValues,
} from "./audit-filters";
import { AuditDetail } from "./audit-detail";
import { auditEventTypeClass } from "./audit-style";
import styles from "./audit.module.css";

/** Ancho de pantalla a partir del que la línea de tiempo convive con el panel lateral. */
const DESKTOP_BREAKPOINT = "(min-width: 900px)";

/** Línea de tiempo de auditoría: filtros locales + selección compartida por URL. */
export function AuditTimeline({
  events,
  agents,
  users,
  selectedId,
}: {
  events: AuditEvent[];
  agents: Agent[];
  users: User[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<AuditFilterValues>(emptyAuditFilters);

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  const sorted = getAuditEvents(events);
  const filtered = filterAuditEvents(sorted, {
    agentId: filters.agentId || undefined,
    eventType: filters.eventType || undefined,
    from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
    to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
  });

  const selectedEvent = selectedId
    ? getAuditEventById(events, selectedId)
    : undefined;

  function handleClick(event: MouseEvent<HTMLAnchorElement>, eventId: string) {
    // Clics para abrir en pestaña nueva o pantallas sin panel: navegación normal a /audit/[eventId].
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;
    if (!window.matchMedia(DESKTOP_BREAKPOINT).matches) return;

    event.preventDefault();
    router.replace(`/audit?selected=${eventId}`, { scroll: false });
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No hay eventos de auditoría registrados."
        hint="Cada acción, decisión y cambio de configuración relevante aparecerá aquí."
      />
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.timelinePane}>
        <AuditFilters agents={agents} values={filters} onChange={setFilters} />

        {filtered.length === 0 ? (
          <EmptyState
            title="Ningún evento coincide con los filtros aplicados."
            hint="Amplía el rango de fechas o quita algún filtro para ver más eventos."
          />
        ) : (
          <div className={styles.timeline}>
            {filtered.map((event) => (
              <Link
                key={event.id}
                href={`/audit/${event.id}`}
                onClick={(clickEvent) => handleClick(clickEvent, event.id)}
                className={`${styles.row} ${event.id === selectedId ? styles.rowSelected : ""}`}
              >
                <span
                  className={`${styles.dot} ${auditEventTypeClass[event.eventType]}`}
                  aria-hidden="true"
                />
                <div className={styles.rowMain}>
                  <div className={styles.rowHead}>
                    <span className={styles.rowTime}>
                      {formatRelativeTime(event.createdAt)}
                    </span>
                    <span
                      className={`${styles.eventBadge} ${auditEventTypeClass[event.eventType]}`}
                    >
                      {auditEventTypeLabel[event.eventType]}
                    </span>
                  </div>
                  <span className={styles.rowAgent}>
                    {event.agentId ? agentName(event.agentId) : "Sistema"}
                  </span>
                  <span className={styles.rowMessage}>{event.message}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {selectedEvent ? (
        <div className={styles.detailPane}>
          <AuditDetail event={selectedEvent} agents={agents} users={users} />
        </div>
      ) : null}
    </div>
  );
}
