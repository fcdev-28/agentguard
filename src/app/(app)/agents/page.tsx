import { PageHeader } from "@/components/app-shell/page-header";
import { AgentsList } from "@/components/agents/agents-list";
import { getAgents } from "@/data/agents";
import { getActions } from "@/data/actions";
import { getUsers } from "@/data/users";

export default async function AgentsPage() {
  const [agents, actions, users] = await Promise.all([
    getAgents(),
    getActions(),
    getUsers(),
  ]);

  return (
    <div>
      <PageHeader
        title="Agentes"
        description="Inventario de agentes conectados, su estado y su riesgo reciente."
      />
      <AgentsList agents={agents} actions={actions} users={users} />
    </div>
  );
}
