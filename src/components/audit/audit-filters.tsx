"use client";

import type { Agent, AuditEventType } from "@/domain";
import { auditEventTypeLabel } from "@/domain";
import { Select } from "@/components/forms/select";
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
        <Select
          id="audit-filter-agent"
          value={values.agentId}
          onChange={(value) => update({ agentId: value })}
          options={[
            { value: "", label: "Todos" },
            ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
          ]}
        />
      </div>

      <div className={styles.filterField}>
        <label className={styles.filterLabel} htmlFor="audit-filter-type">
          Tipo de evento
        </label>
        <Select
          id="audit-filter-type"
          value={values.eventType}
          onChange={(value) =>
            update({ eventType: value as AuditEventType | "" })
          }
          options={[
            { value: "", label: "Todos" },
            ...Object.entries(auditEventTypeLabel).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
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

      {hasActiveFilters ? (
        <button
          type="button"
          className={styles.filterReset}
          onClick={() => onChange(emptyAuditFilters)}
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
