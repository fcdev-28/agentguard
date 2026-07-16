import { PageHeader } from "@/components/app-shell/page-header";
import { PendingActionsBlock } from "@/components/dashboard/pending-actions-block";
import { ActiveAgentsBlock } from "@/components/dashboard/active-agents-block";
import { RiskBlock } from "@/components/dashboard/risk-block";
import { RecentPoliciesBlock } from "@/components/dashboard/recent-policies-block";
import { EmergencyStopBlock } from "@/components/dashboard/emergency-stop-block";
import { getAgents } from "@/data/agents";
import { getActions } from "@/data/actions";
import { getPolicies } from "@/data/policies";
import styles from "@/components/dashboard/dashboard.module.css";

export default async function Home() {
  const [agents, actions, policies] = await Promise.all([
    getAgents(),
    getActions(),
    getPolicies(),
  ]);

  return (
    <div>
      <PageHeader
        title="Panel de control"
        description="Estado operativo y prioridades del sistema."
      />
      <div className={styles.grid}>
        <PendingActionsBlock actions={actions} agents={agents} />
        <ActiveAgentsBlock agents={agents} />
        <RiskBlock actions={actions} />
        <RecentPoliciesBlock policies={policies} />
        <EmergencyStopBlock />
      </div>
    </div>
  );
}
