import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { PolicyDetail } from "@/components/policies/policy-detail";
import { getPolicyById } from "@/data/policies";
import { getActions } from "@/data/actions";
import { getTools } from "@/data/tools";
import { getAgents } from "@/data/agents";
import { getPermissions } from "@/data/permissions";
import { getCurrentUser } from "@/lib/session-db";
import { can } from "@/lib/permissions";

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

  const [actions, tools, agents, permissions, currentUser] = await Promise.all([
    getActions(),
    getTools(),
    getAgents(),
    getPermissions(),
    getCurrentUser(),
  ]);

  // Defensa en profundidad: el middleware ya debería haber redirigido, pero
  // un usuario desactivado a mitad de sesión llega hasta aquí.
  if (!currentUser) {
    redirect("/login");
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
        canWrite={can(currentUser, "policy:write")}
        canPublish={can(currentUser, "policy:publish")}
      />
    </div>
  );
}
