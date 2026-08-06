import { demoNow } from "@/data/demo-data";

/**
 * Tiempo relativo en castellano ("hace 8 min", "en 35 min", "ahora").
 * Se calcula contra el reloj simulado (`demoNow`) para que la demo sea
 * determinista; al llegar la persistencia se comparará con el tiempo real.
 */
export function formatRelativeTime(
  iso: string,
  reference: Date = demoNow,
): string {
  const diffMinutes = Math.round(
    (new Date(iso).getTime() - reference.getTime()) / 60_000,
  );

  if (diffMinutes === 0) return "ahora";

  const past = diffMinutes < 0;
  const abs = Math.abs(diffMinutes);

  let value: number;
  let unit: string;
  if (abs < 60) {
    value = abs;
    unit = "min";
  } else if (abs < 60 * 24) {
    value = Math.round(abs / 60);
    unit = "h";
  } else {
    value = Math.round(abs / (60 * 24));
    unit = "d";
  }

  return past ? `hace ${value} ${unit}` : `en ${value} ${unit}`;
}

/**
 * Tiempo transcurrido en forma compacta para caber en 56px ("8m", "3h", "2d").
 * Mismo criterio de salto de unidad que formatRelativeTime: <60 min, <24 h, resto.
 * Usado por el contador de la barra de parada (StopBar).
 */
export function formatElapsedCompact(
  iso: string,
  reference: Date = demoNow,
): string {
  const diffMinutes = Math.max(
    0,
    Math.round((reference.getTime() - new Date(iso).getTime()) / 60_000),
  );

  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffMinutes < 60 * 24) return `${Math.round(diffMinutes / 60)}h`;
  return `${Math.round(diffMinutes / (60 * 24))}d`;
}

/** ¿La fecha ISO es anterior al reloj simulado? (aprobación vencida). */
export function isOverdue(
  iso: string | null,
  reference: Date = demoNow,
): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < reference.getTime();
}
