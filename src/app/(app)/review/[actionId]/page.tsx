import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ActionDetail } from "@/components/review/action-detail";
import { getActionById, getActions } from "@/data/actions";
import { getAgents } from "@/data/agents";
import { getTools } from "@/data/tools";
import { getPolicies } from "@/data/policies";
import { getPermissions } from "@/data/permissions";
import { getUsers } from "@/data/users";
import { getComments } from "@/data/comments";
import { getApprovalByActionId } from "@/data/approvals";
import { commentsForAction } from "@/lib/comments";
import { getCurrentUser } from "@/lib/session-db";
import { can } from "@/lib/permissions";

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

  const [
    actions,
    agents,
    tools,
    policies,
    permissions,
    users,
    comments,
    approval,
    currentUser,
  ] = await Promise.all([
    getActions(),
    getAgents(),
    getTools(),
    getPolicies(),
    getPermissions(),
    getUsers(),
    getComments(),
    getApprovalByActionId(actionId),
    getCurrentUser(),
  ]);

  // Defensa en profundidad: el middleware ya debería haber redirigido, pero
  // un usuario desactivado a mitad de sesión llega hasta aquí.
  if (!currentUser) {
    redirect("/login");
  }

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
        comments={commentsForAction(comments, action.id)}
        approval={approval}
        currentUserId={currentUser.id}
        canDecide={can(currentUser, "review:decide")}
        canComment={can(currentUser, "review:comment")}
      />
    </div>
  );
}
