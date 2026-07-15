"use client";

import { useRuntime } from "./runtime-store";
import { formatRelativeTime } from "@/lib/format";
import styles from "./emergency-stop-banner.module.css";

/**
 * Banner a ancho completo visible en toda la aplicación mientras la parada
 * de emergencia esté activa. No renderiza nada si está desactivada.
 */
export function EmergencyStopBanner() {
  const { emergencyStop } = useRuntime();

  if (!emergencyStop.active) return null;

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.message}>Parada de emergencia activa</span>
      <span className={styles.detail}>
        Activada por {emergencyStop.byName ?? "un administrador"}
        {emergencyStop.at ? ` · ${formatRelativeTime(emergencyStop.at)}` : ""}
      </span>
    </div>
  );
}
