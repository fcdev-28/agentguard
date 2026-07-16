import { notFound } from "next/navigation";
import { AgentDetail } from "@/components/agents/agent-detail";
import { AgentTools } from "@/components/agents/agent-tools";
import { AgentActions } from "@/components/agents/agent-actions";
import { getAgentById } from "@/data/agents";
import { getActions } from "@/data/actions";
import { getPermissions } from "@/data/permissions";
import { getTools } from "@/data/tools";
import { getUsers } from "@/data/users";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const [agent, actions, permissions, tools, users] = await Promise.all([
    getAgentById(agentId),
    getActions(),
    getPermissions(),
    getTools(),
    getUsers(),
  ]);

  if (!agent) {
    notFound();
  }

  const owner = users.find((u) => u.id === agent.ownerId);

  return (
    <div>
      <AgentDetail agent={agent} owner={owner} />
      <AgentTools permissions={permissions} tools={tools} agentId={agent.id} />
      <AgentActions actions={actions} agentId={agent.id} />
    </div>
  );
}
