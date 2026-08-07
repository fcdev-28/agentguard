import type { Tool, ToolStatus } from "@/domain";
import { toolStatusLabel, toolTypeLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskWord } from "@/components/data-display/risk-word";
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
          <RiskWord level={tool.riskLevel} />
          {/* El select no se colorea por estado: las cuatro clases que lo
              hacían llevaban desde la fase 7 renderizando lo mismo, y un
              control editable no es sitio para señalar severidad. */}
          <select
            className={styles.select}
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
