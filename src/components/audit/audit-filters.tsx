"use client";

import type { Agent, AuditEventType } from "@/domain";
import { auditEventTypeLabel } from "@/domain";
import styles from "./audit.module.css";

/** Valores de filtro del registro de auditoría; cadena vacía = sin filtrar por esa clave. */
export interface AuditFilterValues {
  agentId: string;
  eventType: AuditEventType | "";
  from: string;
  to: string;
}

export const emptyAuditFilters: AuditFilterValues = {
  agentId: "",
  eventType: "",
  from: "",
  to: "",
};

/** Barra de filtros de auditoría: agente, tipo de evento y rango de fechas. Controlada por props. */
export function AuditFilters({
  agents,
  values,
  onChange,
}: {
  agents: Agent[];
  values: AuditFilterValues;
  onChange: (values: AuditFilterValues) => void;
}) {
  const hasActiveFilters =
    values.agentId !== "" ||
    values.eventType !== "" ||
    values.from !== "" ||
    values.to !== "";

  function update(partial: Partial<AuditFilterValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className={styles.filters}>
      <div className={styles.filterField}>
        <label className={styles.filterLabel} htmlFor="audit-filter-agent">
          Agente
        </label>
        <select
          id="audit-filter-agent"
          className={styles.filterSelect}
          value={values.agentId}
          onChange={(event) => update({ agentId: event.target.value })}
        >
          <option value="">Todos</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterField}>
        <label className={styles.filterLabel} htmlFor="audit-filter-type">
          Tipo de evento
        </label>
        <select
          id="audit-filter-type"
          className={styles.filterSelect}
          value={values.eventType}
          onChange={(event) =>
            update({ eventType: event.target.value as AuditEventType | "" })
          }
        >
          <option value="">Todos</option>
          {Object.entries(auditEventTypeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterField}>
        <label className={styles.filterLabel} htmlFor="audit-filter-from">
          Desde
        </label>
        <input
          id="audit-filter-from"
          type="date"
          className={styles.filterInput}
          value={values.from}
          onChange={(event) => update({ from: event.target.value })}
        />
      </div>

      <div className={styles.filterField}>
        <label className={styles.filterLabel} htmlFor="audit-filter-to">
          Hasta
        </label>
        <input
          id="audit-filter-to"
          type="date"
          className={styles.filterInput}
          value={values.to}
          onChange={(event) => update({ to: event.target.value })}
        />
      </div>

      <button
        type="button"
        className={`${styles.filterReset} ${hasActiveFilters ? "" : styles.filterResetHidden}`}
        onClick={() => onChange(emptyAuditFilters)}
        tabIndex={hasActiveFilters ? undefined : -1}
        aria-hidden={!hasActiveFilters}
      >
        Limpiar filtros
      </button>
    </div>
  );
}
