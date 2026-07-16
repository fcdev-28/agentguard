import { notFound, redirect } from "next/navigation";
import { AgentDetail } from "@/components/agents/agent-detail";
import { AgentTools } from "@/components/agents/agent-tools";
import { AgentActions } from "@/components/agents/agent-actions";
import { getAgentById } from "@/data/agents";
import { getActions } from "@/data/actions";
import { getPermissions } from "@/data/permissions";
import { getTools } from "@/data/tools";
import { getUsers } from "@/data/users";
import { getCurrentUser } from "@/lib/session-db";
import { can } from "@/lib/permissions";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const [agent, actions, permissions, tools, users, currentUser] =
    await Promise.all([
      getAgentById(agentId),
      getActions(),
      getPermissions(),
      getTools(),
      getUsers(),
      getCurrentUser(),
    ]);

  if (!agent) {
    notFound();
  }

  // Defensa en profundidad: el middleware ya debería haber redirigido, pero
  // un usuario desactivado a mitad de sesión llega hasta aquí.
  if (!currentUser) {
    redirect("/login");
  }

  const owner = users.find((u) => u.id === agent.ownerId);
  const canPause = can(currentUser, "agent:pause");

  return (
    <div>
      <AgentDetail agent={agent} owner={owner} canPause={canPause} />
      <AgentTools permissions={permissions} tools={tools} agentId={agent.id} />
      <AgentActions actions={actions} agentId={agent.id} />
    </div>
  );
}
