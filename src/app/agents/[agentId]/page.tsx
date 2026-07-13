import { notFound } from "next/navigation";
import { AgentDetail } from "@/components/agents/agent-detail";
import { AgentTools } from "@/components/agents/agent-tools";
import { AgentActions } from "@/components/agents/agent-actions";
import { getAgentById } from "@/lib/agents";
import { agents, actions, permissions, tools, users } from "@/data/demo-data";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const agent = getAgentById(agents, agentId);

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
