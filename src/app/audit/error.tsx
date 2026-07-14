"use client";

import { ErrorState } from "@/components/feedback/error-state";

/** Límite de error del segmento `/audit` (convención Next). */
export default function AuditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="No se pudo cargar el registro de auditoría."
      message={error.message || "Ha ocurrido un error al obtener los eventos de auditoría."}
      onRetry={reset}
    />
  );
}
