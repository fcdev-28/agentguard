import type { RiskLevel } from "@/domain";
import { riskLevelLabel } from "@/domain";
import styles from "./risk-word.module.css";

/** Mapa de nivel de riesgo a clase de ancho/peso (eje font-variation-settings). */
const riskWordClass: Record<RiskLevel, string> = {
  low: styles.low,
  medium: styles.medium,
  high: styles.high,
  critical: styles.critical,
};

/**
 * El riesgo escrito, no pintado (IDENTITY §3). Sustituye a RiskBadge: sin
 * pill, sin color por severidad, escala por ancho y peso de Archivo vía
 * font-variation-settings.
 */
export function RiskWord({ level }: { level: RiskLevel }) {
  return (
    <span className={`${styles.riskWord} ${riskWordClass[level]}`}>
      {riskLevelLabel[level]}
    </span>
  );
}
