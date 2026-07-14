import type { Tool, ToolStatus } from "@/domain";
import { toolStatusLabel, toolTypeLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { getTools } from "@/lib/tools";
import styles from "./settings.module.css";

/** Clase de color por estado de herramienta. */
const statusClass: Record<ToolStatus, string> = {
  active: styles.statusActive,
  paused: styles.statusPaused,
  disabled: styles.statusDisabled,
};

/** Listado de herramientas conectadas con cambio de estado (estado local, no persistido). */
export function ToolsSection({
  tools,
  onChangeStatus,
}: {
  tools: Tool[];
  onChangeStatus: (toolId: string, status: ToolStatus) => void;
}) {
  const sorted = getTools(tools);

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No hay herramientas conectadas."
        hint="Conecta una herramienta para que los agentes puedan usarla."
      />
    );
  }

  return (
    <div className={styles.list}>
      {sorted.map((tool) => (
        <div key={tool.id} className={styles.row}>
          <div className={styles.identity}>
            <span className={styles.name}>{tool.name}</span>
            <span className={styles.meta}>{toolTypeLabel[tool.type]}</span>
          </div>
          <RiskBadge level={tool.riskLevel} />
          <select
            className={`${styles.select} ${statusClass[tool.status]}`}
            value={tool.status}
            aria-label={`Estado de ${tool.name}`}
            onChange={(event) =>
              onChangeStatus(tool.id, event.target.value as ToolStatus)
            }
          >
            {Object.entries(toolStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
