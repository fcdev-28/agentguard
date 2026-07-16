"use client";

import { ErrorState } from "@/components/feedback/error-state";

/** Límite de error del segmento `/review` (convención Next). */
export default function ReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="No se pudo cargar la cola de revisión."
      message={
        error.message ||
        "Ha ocurrido un error al obtener las acciones pendientes."
      }
      onRetry={reset}
    />
  );
}
