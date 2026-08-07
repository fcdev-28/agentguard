import type { AgentAction, RiskLevel } from "@/domain";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { CountUp } from "@/components/data-display/count-up";
import { RiskWord } from "@/components/data-display/risk-word";
import { getPendingActions, getRiskBreakdown } from "@/lib/dashboard";
import styles from "./dashboard.module.css";

/** Orden de presentación del desglose: de más grave a menos. */
const LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];

/** Bloque: riesgo agregado de las acciones pendientes. */
export function RiskBlock({ actions }: { actions: AgentAction[] }) {
  const pending = getPendingActions(actions);
  const breakdown = getRiskBreakdown(pending);
  const severe = breakdown.critical + breakdown.high;

  return (
    <DashboardBlock title="Riesgo agregado">
      {pending.length === 0 ? (
        <EmptyState title="Sin riesgo pendiente." />
      ) : (
        <>
          <div className={styles.metric}>
            <span className={styles.metricValue}>
              <CountUp value={severe} />
            </span>
            <span className={styles.metricLabel}>de riesgo alto o crítico</span>
          </div>
          <div className={styles.breakdown}>
            {LEVELS.map((level) => (
              <div key={level} className={styles.breakdownRow}>
                <RiskWord level={level} />
                <span className={styles.breakdownCount}>
                  <CountUp value={breakdown[level]} />
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardBlock>
  );
}
