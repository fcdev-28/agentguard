"use client";

import Link from "next/link";
import type { Agent, AgentAction, User } from "@/domain";
import { agentModeLabel, agentStatusLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { useRuntime } from "@/components/app-shell/runtime-store";
import {
  getAgents,
  getAgentLastActivityAt,
  getAgentRecentRisk,
} from "@/lib/agents";
import { formatRelativeTime } from "@/lib/format";
import styles from "./agents.module.css";

/** Clase de color por estado de agente, coherente con la severidad del inventario. */
const statusClass: Record<Agent["status"], string> = {
  active: styles.statusActive,
  paused: styles.statusPaused,
  disabled: styles.statusDisabled,
  error: styles.statusError,
};

/** Inventario de agentes: fila enlazada al detalle con estado, riesgo y actividad. */
export function AgentsList({
  agents,
  actions,
  users,
}: {
  agents: Agent[];
  actions: AgentAction[];
  users: User[];
}) {
  const { getAgentStatus } = useRuntime();
  const sorted = getAgents(agents);

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No hay agentes conectados."
        hint="Conecta un agente para empezar a supervisar sus acciones."
      />
    );
  }

  const ownerName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  return (
    <div className={styles.list}>
      {sorted.map((agent) => {
        const risk = getAgentRecentRisk(actions, agent.id);
        const lastActivityAt = getAgentLastActivityAt(actions, agent.id);
        const status = getAgentStatus(agent.id, agent.status);

        return (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className={styles.row}
          >
            <div className={styles.identity}>
              <span className={styles.name}>{agent.name}</span>
              <span className={styles.description}>{agent.description}</span>
            </div>
            <span className={styles.owner}>{ownerName(agent.ownerId)}</span>
            <span className={`${styles.statusBadge} ${statusClass[status]}`}>
              {agentStatusLabel[status]}
            </span>
            <span className={styles.mode}>{agentModeLabel[agent.mode]}</span>
            {risk ? (
              <RiskBadge level={risk} />
            ) : (
              <span className={styles.noRisk}>—</span>
            )}
            <span className={styles.activity}>
              {lastActivityAt
                ? formatRelativeTime(lastActivityAt)
                : "Sin actividad"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
