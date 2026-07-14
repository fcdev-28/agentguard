"use client";

import { ErrorState } from "@/components/feedback/error-state";

/** Límite de error raíz (convención Next): cubre el dashboard y cualquier fallo no capturado por un segmento. */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Algo salió mal al cargar la pantalla."
      message={
        error.message ||
        "Ha ocurrido un error inesperado. Puedes intentarlo de nuevo."
      }
      onRetry={reset}
    />
  );
}
