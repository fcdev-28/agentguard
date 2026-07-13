import Link from "next/link";
import type { ActionStatus, AgentAction } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { getAgentActions } from "@/lib/agents";
import { formatRelativeTime } from "@/lib/format";
import styles from "./agents.module.css";

/**
 * Etiqueta legible del estado de la acción. Simplifica `ActionStatus` para
 * esta vista; si el producto necesita un sistema de estados más rico (con
 * color, orden, etc.) debería vivir junto a `riskLevelLabel` en el dominio.
 */
const actionStatusLabel: Record<ActionStatus, string> = {
  proposed: "Propuesta",
  allowed: "Permitida",
  blocked: "Bloqueada",
  needs_approval: "Pendiente de aprobación",
  approved: "Aprobada",
  rejected: "Rechazada",
  changes_requested: "Cambios solicitados",
  escalated: "Escalada",
  executed: "Ejecutada",
  failed: "Fallida",
};

/** Últimas acciones propuestas o ejecutadas por el agente. */
export function AgentActions({
  actions,
  agentId,
  limit = 8,
}: {
  actions: AgentAction[];
  agentId: string;
  limit?: number;
}) {
  const recent = getAgentActions(actions, agentId, limit);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Acciones recientes</h2>
      {recent.length === 0 ? (
        <EmptyState title="Este agente todavía no tiene acciones registradas." />
      ) : (
        <div className={styles.panel}>
          {recent.map((action) => (
            <Link key={action.id} href={`/review/${action.id}`} className={styles.panelRow}>
              <div className={styles.panelRowMain}>
                <span className={styles.panelRowTitle}>{action.title}</span>
                <span className={styles.panelRowMeta}>
                  {actionStatusLabel[action.status]} · {formatRelativeTime(action.createdAt)}
                </span>
              </div>
              <div className={styles.panelRowAside}>
                <RiskBadge level={action.riskLevel} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
