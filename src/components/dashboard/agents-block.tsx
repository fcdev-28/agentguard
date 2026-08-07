import Link from "next/link";
import type { Agent } from "@/domain";
import { agentStatusLabel } from "@/domain";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { CountUp } from "@/components/data-display/count-up";
import { StatusTag } from "@/components/data-display/status-tag";
import { agentStatusVariant } from "@/components/agents/agent-status";
import { getActiveAgents, getAgentsByAttention } from "@/lib/dashboard";
import styles from "./dashboard.module.css";

/** Cuántos agentes caben antes de mandar al inventario completo. */
const VISIBLE_LIMIT = 5;

/**
 * Bloque: cuántos agentes están en ejecución y cuáles piden atención. La
 * métrica cuenta los activos, pero la lista no los filtra: un agente en
 * error es lo que hay que ver desde el panel, y filtrando por "activos" era
 * justo el que desaparecía.
 */
export function AgentsBlock({ agents }: { agents: Agent[] }) {
  const active = getActiveAgents(agents);
  const visible = getAgentsByAttention(agents).slice(0, VISIBLE_LIMIT);

  return (
    <DashboardBlock
      title="Agentes"
      action={
        <Link href="/agents" className={styles.blockAction}>
          Ver agentes →
        </Link>
      }
    >
      {agents.length === 0 ? (
        <EmptyState title="No hay agentes conectados." />
      ) : (
        <>
          <div className={styles.metric}>
            <span className={styles.metricValue}>
              <CountUp value={active.length} />
            </span>
            <span className={styles.metricLabel}>en ejecución</span>
          </div>
          {visible.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className={styles.row}
            >
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{agent.name}</span>
              </div>
              <div className={styles.rowAside}>
                <StatusTag variant={agentStatusVariant[agent.status]}>
                  {agentStatusLabel[agent.status]}
                </StatusTag>
              </div>
            </Link>
          ))}
        </>
      )}
    </DashboardBlock>
  );
}
