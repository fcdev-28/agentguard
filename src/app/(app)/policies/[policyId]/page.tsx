import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { PolicyDetail } from "@/components/policies/policy-detail";
import { getPolicyById } from "@/data/policies";
import { getActions } from "@/data/actions";
import { getTools } from "@/data/tools";
import { getAgents } from "@/data/agents";
import { getPermissions } from "@/data/permissions";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const { policyId } = await params;
  const policy = await getPolicyById(policyId);

  if (!policy) {
    notFound();
  }

  const [actions, tools, agents, permissions] = await Promise.all([
    getActions(),
    getTools(),
    getAgents(),
    getPermissions(),
  ]);

  return (
    <div>
      <PageHeader title={policy.name} description={policy.description} />
      <PolicyDetail
        policy={policy}
        actions={actions}
        tools={tools}
        agents={agents}
        permissions={permissions}
      />
    </div>
  );
}
