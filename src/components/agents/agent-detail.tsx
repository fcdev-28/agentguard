"use client";

import { useTransition } from "react";
import type { Agent, User } from "@/domain";
import {
  agentEnvironmentLabel,
  agentModeLabel,
  agentStatusLabel,
} from "@/domain";
import { PageHeader } from "@/components/app-shell/page-header";
import { pauseAgent, resumeAgent } from "@/lib/runtime-actions";
import styles from "./agents.module.css";

/** Cabecera de identidad del agente: nombre, descripción, metadatos clave y control de pausa. */
export function AgentDetail({
  agent,
  owner,
}: {
  agent: Agent;
  owner: User | undefined;
}) {
  const [, startTransition] = useTransition();
  const status = agent.status;

  function togglePause() {
    startTransition(async () => {
      if (status === "active") {
        await pauseAgent(agent.id);
      } else {
        await resumeAgent(agent.id);
      }
    });
  }

  return (
    <div>
      <PageHeader title={agent.name} description={agent.description} />
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          Estado: <strong>{agentStatusLabel[status]}</strong>
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
            onClick={togglePause}
          >
            {status === "active" ? "Pausar agente" : "Reanudar agente"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
