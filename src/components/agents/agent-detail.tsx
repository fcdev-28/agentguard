"use client";

import { useTransition } from "react";
import type { Agent, User } from "@/domain";
import {
  agentEnvironmentLabel,
  agentModeLabel,
  agentStatusLabel,
} from "@/domain";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatusTag } from "@/components/data-display/status-tag";
import { agentStatusVariant } from "./agent-status";
import { pauseAgent, resumeAgent } from "@/lib/runtime-actions";
import styles from "./agents.module.css";

/** Cabecera de identidad del agente: nombre, descripción, metadatos clave y control de pausa. */
export function AgentDetail({
  agent,
  owner,
  canPause,
}: {
  agent: Agent;
  owner: User | undefined;
  canPause: boolean;
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
        <StatusTag variant={agentStatusVariant[status]}>
          {agentStatusLabel[status]}
        </StatusTag>
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
      {canPause && (status === "active" || status === "paused") ? (
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
