import { PageHeader } from "@/components/app-shell/page-header";
import { AgentsList } from "@/components/agents/agents-list";
import { agents, actions, users } from "@/data/demo-data";

export default function AgentsPage() {
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
