import { PageHeader } from "@/components/app-shell/page-header";
import { ReviewScreen } from "@/components/review/review-screen";
import { getActions } from "@/data/actions";
import { getAgents } from "@/data/agents";
import { getTools } from "@/data/tools";
import { getPolicies } from "@/data/policies";
import { getPermissions } from "@/data/permissions";
import { getUsers } from "@/data/users";

export default async function ReviewPage() {
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
      <PageHeader
        title="Revisión"
        description="Cola priorizada de acciones que requieren decisión humana."
      />
      <ReviewScreen
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
