import Link from "next/link";
import type { Agent, AgentAction, Tool } from "@/domain";
import { actionStatusLabel } from "@/domain";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskWord } from "@/components/data-display/risk-word";
import { StatusTag } from "@/components/data-display/status-tag";
import { StopBar } from "@/components/data-display/stop-bar";
import {
  actionStatusVariant,
  showsStatusTag,
} from "@/components/data-display/action-status";
import { getPendingActions } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
import styles from "./dashboard.module.css";

/** Cuántas acciones caben antes de mandar a la cola completa. */
const VISIBLE_LIMIT = 5;

/** Bloque: acciones a la espera de decisión, las más urgentes primero. */
export function PendingActionsBlock({
  actions,
  agents,
  tools,
}: {
  actions: AgentAction[];
  agents: Agent[];
  tools: Tool[];
}) {
  const pending = getPendingActions(actions);
  // El panel resume; la cola es la que las lista todas. Sin el corte, con
  // las filas altas del rediseño el bloque enterraba a los otros cuatro.
  const visible = pending.slice(0, VISIBLE_LIMIT);
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;
  const toolName = (id: string) => tools.find((t) => t.id === id)?.name ?? id;

  return (
    <DashboardBlock
      title="Acciones pendientes"
      wide
      action={
        <Link href="/review" className={styles.blockAction}>
          {pending.length > VISIBLE_LIMIT
            ? `Ver las ${pending.length} en cola →`
            : "Ver cola →"}
        </Link>
      }
    >
      {pending.length === 0 ? (
        <EmptyState title="No hay acciones pendientes de revisión." />
      ) : (
        <div className={styles.actionList}>
          {visible.map((action) => (
            <Link
              key={action.id}
              href={`/review/${action.id}`}
              className={styles.actionRow}
            >
              {/* Misma barra que la cola: el tiempo parado se lee igual en
                  las dos pantallas, y por eso el estado sigue la misma regla
                  (needs_approval no lleva tag, la barra ya lo dice). */}
              <StopBar
                status={action.status}
                createdAt={action.createdAt}
                approvalDueAt={action.approvalDueAt}
              />
              <div className={styles.actionMain}>
                <span className={styles.rowTitle}>{action.title}</span>
                <span className={styles.rowMeta}>
                  {agentName(action.agentId)} ·{" "}
                  {formatRelativeTime(action.createdAt)}
                </span>
              </div>
              <span className={styles.actionStatus}>
                {showsStatusTag(action.status) ? (
                  <StatusTag variant={actionStatusVariant[action.status]}>
                    {actionStatusLabel[action.status]}
                  </StatusTag>
                ) : null}
              </span>
              <span className={styles.actionTool}>
                {toolName(action.toolId)}
              </span>
              <span className={styles.rowRisk}>
                <RiskWord level={action.riskLevel} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </DashboardBlock>
  );
}
