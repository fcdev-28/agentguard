import type { Agent, User } from "@/domain";
import { agentEnvironmentLabel, agentModeLabel, agentStatusLabel } from "@/domain";
import { PageHeader } from "@/components/app-shell/page-header";
import styles from "./agents.module.css";

/** Cabecera de identidad del agente: nombre, descripción y metadatos clave. */
export function AgentDetail({ agent, owner }: { agent: Agent; owner: User | undefined }) {
  return (
    <div>
      <PageHeader title={agent.name} description={agent.description} />
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          Estado: <strong>{agentStatusLabel[agent.status]}</strong>
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
    </div>
  );
}
