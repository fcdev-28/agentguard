import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { PolicyDetail } from "@/components/policies/policy-detail";
import { getPolicyById } from "@/lib/policies";
import { policies, actions, tools, agents, permissions } from "@/data/demo-data";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ policyId: string }>;
}) {
  const { policyId } = await params;
  const policy = getPolicyById(policies, policyId);

  if (!policy) {
    notFound();
  }

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
