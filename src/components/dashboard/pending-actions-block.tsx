import Link from "next/link";
import type { Agent, AgentAction } from "@/domain";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskWord } from "@/components/data-display/risk-word";
import { StopBar } from "@/components/data-display/stop-bar";
import { getPendingActions } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
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
      wide
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
            className={`${styles.row} ${styles.actionRow}`}
          >
            {/* Misma barra que la cola: el tiempo parado se lee igual en las
                dos pantallas. El vencimiento ya lo dice la barra llena, así
                que aquí no hay badge "Vencida" que lo repita. */}
            <StopBar
              status={action.status}
              createdAt={action.createdAt}
              approvalDueAt={action.approvalDueAt}
            />
            <div className={styles.actionRowBody}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{action.title}</span>
                <span className={styles.rowMeta}>
                  {agentName(action.agentId)} ·{" "}
                  {formatRelativeTime(action.createdAt)}
                </span>
              </div>
              <span className={styles.rowRisk}>
                <RiskWord level={action.riskLevel} />
              </span>
            </div>
          </Link>
        ))
      )}
    </DashboardBlock>
  );
}
