import type { RiskLevel } from "@/domain";
import { riskLevelLabel } from "@/domain";
import styles from "./risk-badge.module.css";

/** Pill con el nivel de riesgo, coloreada por severidad. */
export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`${styles.badge} ${styles[level]}`}>
      {riskLevelLabel[level]}
    </span>
  );
}
