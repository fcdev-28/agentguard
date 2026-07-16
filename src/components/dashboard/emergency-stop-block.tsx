"use client";

import { useState, useTransition } from "react";
import { DashboardBlock } from "./dashboard-block";
import { formatRelativeTime } from "@/lib/format";
import { useRuntime } from "@/components/app-shell/runtime-provider";
import {
  engageEmergencyStop,
  releaseEmergencyStop,
} from "@/lib/runtime-actions";
import styles from "./dashboard.module.css";

/** Control de nivel organización: congela toda ejecución de agentes al instante (ver docs/FEATURES.md). */
export function EmergencyStopBlock({
  canEmergencyStop,
}: {
  canEmergencyStop: boolean;
}) {
  const { emergencyStop } = useRuntime();
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [, startTransition] = useTransition();

  function confirm() {
    setPendingConfirm(false);
    startTransition(async () => {
      if (emergencyStop.active) {
        await releaseEmergencyStop();
      } else {
        await engageEmergencyStop();
      }
    });
  }

  return (
    <DashboardBlock title="Parada de emergencia">
      <div className={styles.emergencyStatus}>
        <span
          className={`${styles.emergencyDot} ${emergencyStop.active ? styles.emergencyDotActive : ""}`}
          aria-hidden="true"
        />
        <span className={styles.emergencyStatusText}>
          {emergencyStop.active
            ? `Activa · ${emergencyStop.byName ?? "un administrador"} · ${formatRelativeTime(emergencyStop.at ?? new Date().toISOString())}`
            : "Inactiva: todos los agentes operan con normalidad."}
        </span>
      </div>

      {!canEmergencyStop ? null : pendingConfirm ? (
        <div className={styles.emergencyConfirm}>
          <p className={styles.emergencyWarning}>
            {emergencyStop.active
              ? "Se liberará la parada de emergencia y los agentes podrán volver a ejecutar acciones. ¿Confirmas?"
              : "Se detendrá toda ejecución de agentes en la organización de forma inmediata. ¿Confirmas?"}
          </p>
          <div className={styles.emergencyActions}>
            <button
              type="button"
              className={styles.emergencyButtonGhost}
              onClick={() => setPendingConfirm(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.emergencyButton}
              onClick={confirm}
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.emergencyActions}>
          <button
            type="button"
            className={styles.emergencyButton}
            onClick={() => setPendingConfirm(true)}
          >
            {emergencyStop.active
              ? "Liberar parada"
              : "Activar parada de emergencia"}
          </button>
        </div>
      )}
    </DashboardBlock>
  );
}
