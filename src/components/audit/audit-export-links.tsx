import type { AuditFilterValues } from "./audit-filters";
import styles from "./audit.module.css";

/** Construye la query string de export a partir de los filtros activos (omite vacíos). */
function exportQuery(
  filters: AuditFilterValues,
  format: "csv" | "json",
): string {
  const params = new URLSearchParams({ format });
  if (filters.agentId) params.set("agentId", filters.agentId);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

/** Enlaces de descarga del registro de auditoría (CSV/JSON) con los filtros activos. */
export function AuditExportLinks({
  filters,
  count,
}: {
  filters: AuditFilterValues;
  count: number;
}) {
  return (
    <div className={styles.exportLinks}>
      <span className={styles.exportLabel}>
        Exportar {count} {count === 1 ? "evento" : "eventos"}:
      </span>
      <a
        className={styles.exportLink}
        href={`/api/audit/export?${exportQuery(filters, "csv")}`}
        download
      >
        CSV
      </a>
      <a
        className={styles.exportLink}
        href={`/api/audit/export?${exportQuery(filters, "json")}`}
        download
      >
        JSON
      </a>
    </div>
  );
}
