import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ReviewScreen } from "@/components/review/review-screen";
import { getActions } from "@/data/actions";
import { getAgents } from "@/data/agents";
import { getTools } from "@/data/tools";
import { getPolicies } from "@/data/policies";
import { getPermissions } from "@/data/permissions";
import { getUsers } from "@/data/users";
import { getComments } from "@/data/comments";
import { getApprovals } from "@/data/approvals";
import { getCurrentUser } from "@/lib/session-db";

export default async function ReviewPage() {
  const [
    actions,
    agents,
    tools,
    policies,
    permissions,
    users,
    comments,
    approvals,
    currentUser,
  ] = await Promise.all([
    getActions(),
    getAgents(),
    getTools(),
    getPolicies(),
    getPermissions(),
    getUsers(),
    getComments(),
    getApprovals(),
    getCurrentUser(),
  ]);

  // Defensa en profundidad: el middleware ya debería haber redirigido, pero
  // un usuario desactivado a mitad de sesión llega hasta aquí.
  if (!currentUser) {
    redirect("/login");
  }

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
        comments={comments}
        approvals={approvals}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
