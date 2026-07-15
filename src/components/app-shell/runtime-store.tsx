"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuditEvent } from "@/domain";
import { currentOrganization, currentUser } from "@/lib/session";

/** Estado de la parada de emergencia global de la organización. */
export interface EmergencyStopState {
  active: boolean;
  byId: string | null;
  byName: string | null;
  at: string | null;
}

/** Estado inicial a partir del seed de la organización. */
function buildInitialEmergencyStop(): EmergencyStopState {
  if (!currentOrganization.emergencyStop) {
    return { active: false, byId: null, byName: null, at: null };
  }
  return {
    active: true,
    byId: currentOrganization.emergencyStopById,
    byName:
      currentUser.id === currentOrganization.emergencyStopById
        ? currentUser.name
        : null,
    at: currentOrganization.emergencyStopAt,
  };
}

interface RuntimeContextValue {
  emergencyStop: EmergencyStopState;
  engageEmergencyStop: () => void;
  releaseEmergencyStop: () => void;
  runtimeAuditEvents: AuditEvent[];
  recordAudit: (event: AuditEvent) => void;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

/**
 * Store efímero (no persistido) del estado runtime de la aplicación: la
 * parada de emergencia y los eventos de auditoría que genera en caliente.
 * Vive en memoria mientras dure la sesión del navegador; al llegar la
 * persistencia real (fase 10) se sustituye por lecturas y mutaciones contra
 * la base de datos.
 */
export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [emergencyStop, setEmergencyStop] = useState<EmergencyStopState>(
    buildInitialEmergencyStop,
  );
  const [runtimeAuditEvents, setRuntimeAuditEvents] = useState<AuditEvent[]>(
    [],
  );

  const value = useMemo<RuntimeContextValue>(() => {
    function recordAudit(event: AuditEvent) {
      setRuntimeAuditEvents((events) => [...events, event]);
    }

    function engageEmergencyStop() {
      const at = new Date().toISOString();
      setEmergencyStop({
        active: true,
        byId: currentUser.id,
        byName: currentUser.name,
        at,
      });
      recordAudit({
        id: `evt-${Date.now()}`,
        organizationId: currentOrganization.id,
        actorUserId: currentUser.id,
        agentId: null,
        actionId: null,
        eventType: "emergency_stop_engaged",
        message: "Parada de emergencia activada",
        metadata: {},
        createdAt: at,
      });
    }

    function releaseEmergencyStop() {
      const at = new Date().toISOString();
      recordAudit({
        id: `evt-${Date.now()}`,
        organizationId: currentOrganization.id,
        actorUserId: currentUser.id,
        agentId: null,
        actionId: null,
        eventType: "emergency_stop_released",
        message: "Parada de emergencia desactivada",
        metadata: {},
        createdAt: at,
      });
      setEmergencyStop({ active: false, byId: null, byName: null, at: null });
    }

    return {
      emergencyStop,
      engageEmergencyStop,
      releaseEmergencyStop,
      runtimeAuditEvents,
      recordAudit,
    };
  }, [emergencyStop, runtimeAuditEvents]);

  return (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  );
}

/** Acceso al store runtime app-wide; debe usarse bajo `<RuntimeProvider>` (montado en el layout raíz). */
export function useRuntime(): RuntimeContextValue {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("useRuntime debe usarse dentro de <RuntimeProvider>.");
  }
  return context;
}
