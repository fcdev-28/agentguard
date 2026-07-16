import Link from "next/link";
import type { Agent, AgentAction } from "@/domain";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { getPendingActions } from "@/lib/dashboard";
import { formatRelativeTime, isOverdue } from "@/lib/format";
import styles from "./dashboard.module.css";

/** Bloque: acciones a la espera de decisión, las más urgentes primero. */
export function PendingActionsBlock({
  actions,
  agents,
}: {
  actions: AgentAction[];
  agents: Agent[];
}) {
  const pending = getPendingActions(actions);
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  return (
    <DashboardBlock
      title="Acciones pendientes"
      action={
        <Link href="/review" className={styles.blockAction}>
          Ver cola →
        </Link>
      }
    >
      {pending.length === 0 ? (
        <EmptyState title="No hay acciones pendientes de revisión." />
      ) : (
        pending.map((action) => (
          <Link
            key={action.id}
            href={`/review/${action.id}`}
            className={styles.row}
          >
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{action.title}</span>
              <span className={styles.rowMeta}>
                {agentName(action.agentId)} ·{" "}
                {formatRelativeTime(action.createdAt)}
              </span>
            </div>
            <div className={styles.rowAside}>
              {isOverdue(action.approvalDueAt) ? (
                <span className={styles.overdue}>Vencida</span>
              ) : null}
              <RiskBadge level={action.riskLevel} />
            </div>
          </Link>
        ))
      )}
    </DashboardBlock>
  );
}
