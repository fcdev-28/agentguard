"use client";

import { ErrorState } from "@/components/feedback/error-state";

/** Límite de error del segmento `/policies` (convención Next). */
export default function PoliciesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="No se pudo cargar la gestión de políticas."
      message={
        error.message || "Ha ocurrido un error al obtener las políticas."
      }
      onRetry={reset}
    />
  );
}
