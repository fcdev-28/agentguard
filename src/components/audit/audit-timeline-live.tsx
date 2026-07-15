"use client";

import type { Agent, AuditEvent, User } from "@/domain";
import { useRuntime } from "@/components/app-shell/runtime-store";
import { AuditTimeline } from "./audit-timeline";

/**
 * Envuelve `AuditTimeline` mezclando el registro semilla con los eventos
 * runtime (p. ej. la parada de emergencia) generados durante la sesión.
 * El propio `AuditTimeline` se encarga del orden por fecha descendente.
 */
export function AuditTimelineLive({
  seedEvents,
  agents,
  users,
  selectedId,
}: {
  seedEvents: AuditEvent[];
  agents: Agent[];
  users: User[];
  selectedId: string | null;
}) {
  const { runtimeAuditEvents } = useRuntime();

  return (
    <AuditTimeline
      events={[...seedEvents, ...runtimeAuditEvents]}
      agents={agents}
      users={users}
      selectedId={selectedId}
    />
  );
}
