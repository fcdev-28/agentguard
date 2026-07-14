import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { AuditDetail } from "@/components/audit/audit-detail";
import { auditEventTypeLabel } from "@/domain";
import { getAuditEventById } from "@/lib/audit";
import { auditEvents, agents, users } from "@/data/demo-data";

export default async function AuditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getAuditEventById(auditEvents, eventId);

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
