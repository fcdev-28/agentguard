import type { Tool, ToolStatus } from "@/domain";
import { toolStatusLabel, toolTypeLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { Select } from "@/components/forms/select";
import { getTools } from "@/lib/tools";
import styles from "./settings.module.css";

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
          <Select
            value={tool.status}
            ariaLabel={`Estado de ${tool.name}`}
            onChange={(value) => onChangeStatus(tool.id, value as ToolStatus)}
            options={Object.entries(toolStatusLabel).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
      ))}
    </div>
  );
}
