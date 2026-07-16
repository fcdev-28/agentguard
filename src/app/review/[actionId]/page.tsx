import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ActionDetail } from "@/components/review/action-detail";
import { getActionById, getActions } from "@/data/actions";
import { getAgents } from "@/data/agents";
import { getTools } from "@/data/tools";
import { getPolicies } from "@/data/policies";
import { getPermissions } from "@/data/permissions";
import { getUsers } from "@/data/users";

export default async function ReviewActionPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId } = await params;
  const action = await getActionById(actionId);

  if (!action) {
    notFound();
  }

  const [actions, agents, tools, policies, permissions, users] =
    await Promise.all([
      getActions(),
      getAgents(),
      getTools(),
      getPolicies(),
      getPermissions(),
      getUsers(),
    ]);

  return (
    <div>
      <PageHeader title={action.title} description={action.summary} />
      <ActionDetail
        actionId={action.id}
        actions={actions}
        agents={agents}
        tools={tools}
        policies={policies}
        permissions={permissions}
        users={users}
      />
    </div>
  );
}
