import { PageHeader } from "@/components/app-shell/page-header";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { getAuditEvents } from "@/data/audit";
import { getAgents } from "@/data/agents";
import { getUsers } from "@/data/users";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const { selected } = await searchParams;
  const [auditEvents, agents, users] = await Promise.all([
    getAuditEvents(),
    getAgents(),
    getUsers(),
  ]);

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description="Registro inmutable de acciones, decisiones y cambios de configuración."
      />
      <AuditTimeline
        events={auditEvents}
        agents={agents}
        users={users}
        selectedId={selected ?? null}
      />
    </div>
  );
}
