import Link from "next/link";
import type { AgentAction } from "@/domain";
import { actionStatusLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskWord } from "@/components/data-display/risk-word";
import { StatusTag } from "@/components/data-display/status-tag";
import { actionStatusVariant } from "@/components/data-display/action-status";
import { getAgentActions } from "@/lib/agents";
import { formatRelativeTime } from "@/lib/format";
import styles from "./agents.module.css";

/** Últimas acciones propuestas o ejecutadas por el agente. */
export function AgentActions({
  actions,
  agentId,
  limit = 8,
}: {
  actions: AgentAction[];
  agentId: string;
  limit?: number;
}) {
  const recent = getAgentActions(actions, agentId, limit);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Acciones recientes</h2>
      {recent.length === 0 ? (
        <EmptyState title="Este agente todavía no tiene acciones registradas." />
      ) : (
        <div className={styles.panel}>
          {recent.map((action) => (
            <Link
              key={action.id}
              href={`/review/${action.id}`}
              className={styles.panelRow}
            >
              <div className={styles.panelRowMain}>
                {/* Título y estado en línea, como en la cola: aquí no hay
                    barra de parada que diga el estado, así que el tag no es
                    redundante y se muestra siempre. */}
                <span className={styles.panelRowTitleLine}>
                  <span className={styles.panelRowTitle}>{action.title}</span>
                  <StatusTag variant={actionStatusVariant[action.status]}>
                    {actionStatusLabel[action.status]}
                  </StatusTag>
                </span>
                <span className={styles.panelRowMeta}>
                  {formatRelativeTime(action.createdAt)}
                </span>
              </div>
              <div className={styles.panelRowAside}>
                <RiskWord level={action.riskLevel} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
