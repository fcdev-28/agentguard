import Link from "next/link";
import type { Agent } from "@/domain";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { CountUp } from "@/components/data-display/count-up";
import { getActiveAgents } from "@/lib/dashboard";
import styles from "./dashboard.module.css";

/** Bloque: cuántos agentes están activos y cuáles. */
export function ActiveAgentsBlock({ agents }: { agents: Agent[] }) {
  const active = getActiveAgents(agents);

  return (
    <DashboardBlock
      title="Agentes activos"
      action={
        <Link href="/agents" className={styles.blockAction}>
          Ver agentes →
        </Link>
      }
    >
      {active.length === 0 ? (
        <EmptyState title="No hay agentes activos." />
      ) : (
        <>
          <div className={styles.metric}>
            <span className={styles.metricValue}>
              <CountUp value={active.length} />
            </span>
            <span className={styles.metricLabel}>en ejecución</span>
          </div>
          {active.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className={styles.row}
            >
              <span className={styles.dot} aria-hidden="true" />
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{agent.name}</span>
              </div>
            </Link>
          ))}
        </>
      )}
    </DashboardBlock>
  );
}
