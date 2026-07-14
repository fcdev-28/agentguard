"use client";

import { ErrorState } from "@/components/feedback/error-state";

/** Límite de error del segmento `/agents` (convención Next). */
export default function AgentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="No se pudo cargar el inventario de agentes."
      message={
        error.message ||
        "Ha ocurrido un error al obtener los agentes conectados."
      }
      onRetry={reset}
    />
  );
}
