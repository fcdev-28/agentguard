import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { AuditDetail } from "@/components/audit/audit-detail";
import { auditEventTypeLabel } from "@/domain";
import { getAuditEventById } from "@/data/audit";
import { getAgents } from "@/data/agents";
import { getUsers } from "@/data/users";

export default async function AuditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, agents, users] = await Promise.all([
    getAuditEventById(eventId),
    getAgents(),
    getUsers(),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={auditEventTypeLabel[event.eventType]}
        description={event.message}
      />
      <AuditDetail event={event} agents={agents} users={users} />
    </div>
  );
}
