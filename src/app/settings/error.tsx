"use client";

import { ErrorState } from "@/components/feedback/error-state";

/** Límite de error del segmento `/settings` (convención Next). */
export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="No se pudo cargar los ajustes."
      message={error.message || "Ha ocurrido un error al obtener usuarios, roles y herramientas."}
      onRetry={reset}
    />
  );
}
