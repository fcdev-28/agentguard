import Link from "next/link";
import type { Agent, AuditEvent, User } from "@/domain";
import { auditEventTypeLabel } from "@/domain";
import { KeyValueView } from "@/components/data-display/key-value-view";
import { formatRelativeTime } from "@/lib/format";
import { auditEventTypeClass } from "./audit-style";
import styles from "./audit.module.css";

/** Momento absoluto en castellano, fijado a UTC para que coincida entre servidor y cliente. */
function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Contexto completo de un evento de auditoría, para el panel o la ruta standalone. */
export function AuditDetail({
  event,
  agents,
  users,
}: {
  event: AuditEvent;
  agents: Agent[];
  users: User[];
}) {
  const agent = event.agentId
    ? agents.find((a) => a.id === event.agentId)
    : undefined;
  const actor = event.actorUserId
    ? users.find((u) => u.id === event.actorUserId)
    : undefined;
  const hasMetadata = Object.keys(event.metadata).length > 0;

  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <span
          className={`${styles.eventBadge} ${auditEventTypeClass[event.eventType]}`}
        >
          {auditEventTypeLabel[event.eventType]}
        </span>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          Agente: <strong>{agent?.name ?? event.agentId ?? "Sistema"}</strong>
        </span>
        <span className={styles.metaItem}>
          Actor:{" "}
          <strong>{actor?.name ?? event.actorUserId ?? "Automático"}</strong>
        </span>
        <span className={styles.metaItem}>
          Fecha: <strong>{formatAbsoluteTime(event.createdAt)}</strong>
        </span>
        <span className={styles.metaItem}>
          Hace: <strong>{formatRelativeTime(event.createdAt)}</strong>
        </span>
      </div>

      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Mensaje</h3>
        <p className={styles.summary}>{event.message}</p>
      </section>

      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Metadata</h3>
        {hasMetadata ? (
          <KeyValueView data={event.metadata} />
        ) : (
          <p className={styles.hint}>Sin datos adicionales.</p>
        )}
      </section>

      {event.actionId || event.agentId ? (
        <section className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>Relacionado</h3>
          <div className={styles.relatedLinks}>
            {event.actionId ? (
              <Link
                href={`/review/${event.actionId}`}
                className={styles.relatedLink}
              >
                Ver acción →
              </Link>
            ) : null}
            {event.agentId ? (
              <Link
                href={`/agents/${event.agentId}`}
                className={styles.relatedLink}
              >
                Ver agente →
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
