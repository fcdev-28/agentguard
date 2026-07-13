import type { Permission, Tool } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { getAgentTools } from "@/lib/agents";
import styles from "./agents.module.css";

/** Herramientas conectadas al agente vía permisos, con su alcance y estado. */
export function AgentTools({
  permissions,
  tools,
  agentId,
}: {
  permissions: Permission[];
  tools: Tool[];
  agentId: string;
}) {
  const connected = getAgentTools(permissions, tools, agentId);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Herramientas conectadas</h2>
      {connected.length === 0 ? (
        <EmptyState title="Este agente no tiene herramientas conectadas." />
      ) : (
        <div className={styles.panel}>
          {connected.map(({ tool, scope, status }) => (
            <div key={tool.id} className={styles.panelRow}>
              <div className={styles.panelRowMain}>
                <span className={styles.panelRowTitle}>{tool.name}</span>
                <span className={styles.panelRowMeta}>Alcance: {scope}</span>
              </div>
              <span className={styles.panelRowMeta}>{status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
