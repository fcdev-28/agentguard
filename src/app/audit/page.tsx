import { PageHeader } from "@/components/app-shell/page-header";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { auditEvents, agents, users } from "@/data/demo-data";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const { selected } = await searchParams;

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
