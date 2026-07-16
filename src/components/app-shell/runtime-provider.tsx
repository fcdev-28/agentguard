"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Estado de la parada de emergencia global de la organización. */
export interface EmergencyStopState {
  active: boolean;
  byId: string | null;
  byName: string | null;
  at: string | null;
}

interface RuntimeContextValue {
  emergencyStop: EmergencyStopState;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

/**
 * Contexto runtime app-wide, ahora un simple pass-through: el layout raíz
 * calcula el estado de la parada de emergencia a partir de la organización
 * (BD) y lo inyecta aquí como prop, evitando prop-drilling en sus muchos
 * consumidores (banner, paleta de comandos, dashboard, revisión). Ya no hay
 * estado mutable en cliente: las mutaciones (activar/liberar parada,
 * pausar/reanudar agente) llaman directamente a las server actions de
 * `@/lib/runtime-actions`.
 */
export function RuntimeProvider({
  emergencyStop,
  children,
}: {
  emergencyStop: EmergencyStopState;
  children: ReactNode;
}) {
  return (
    <RuntimeContext.Provider value={{ emergencyStop }}>
      {children}
    </RuntimeContext.Provider>
  );
}

/** Acceso al estado runtime app-wide; debe usarse bajo `<RuntimeProvider>` (montado en el layout raíz). */
export function useRuntime(): RuntimeContextValue {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("useRuntime debe usarse dentro de <RuntimeProvider>.");
  }
  return context;
}
