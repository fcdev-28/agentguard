"use client";

import type { Agent, User } from "@/domain";
import {
  agentEnvironmentLabel,
  agentModeLabel,
  agentStatusLabel,
} from "@/domain";
import { PageHeader } from "@/components/app-shell/page-header";
import { useRuntime } from "@/components/app-shell/runtime-store";
import { formatRelativeTime } from "@/lib/format";
import styles from "./agents.module.css";

/** Cabecera de identidad del agente: nombre, descripción, metadatos clave y control de pausa. */
export function AgentDetail({
  agent,
  owner,
}: {
  agent: Agent;
  owner: User | undefined;
}) {
  const { agentOverrides, getAgentStatus, pauseAgent, resumeAgent } =
    useRuntime();
  const status = getAgentStatus(agent.id, agent.status);
  const override = agentOverrides[agent.id];

  return (
    <div>
      <PageHeader title={agent.name} description={agent.description} />
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          Estado: <strong>{agentStatusLabel[status]}</strong>
          {override ? (
            <>
              {" "}
              · {override.byName} · {formatRelativeTime(override.at)}
            </>
          ) : null}
        </span>
        <span className={styles.metaItem}>
          Modo: <strong>{agentModeLabel[agent.mode]}</strong>
        </span>
        <span className={styles.metaItem}>
          Entorno: <strong>{agentEnvironmentLabel[agent.environment]}</strong>
        </span>
        <span className={styles.metaItem}>
          Propietario: <strong>{owner?.name ?? agent.ownerId}</strong>
        </span>
      </div>
      {status === "active" || status === "paused" ? (
        <div className={styles.pauseActions}>
          <button
            type="button"
            className={styles.pauseButton}
            onClick={() =>
              status === "active" ? pauseAgent(agent.id) : resumeAgent(agent.id)
            }
          >
            {status === "active" ? "Pausar agente" : "Reanudar agente"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
