import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { PendingActionsBlock } from "@/components/dashboard/pending-actions-block";
import { ActiveAgentsBlock } from "@/components/dashboard/active-agents-block";
import { RiskBlock } from "@/components/dashboard/risk-block";
import { RecentPoliciesBlock } from "@/components/dashboard/recent-policies-block";
import { EmergencyStopBlock } from "@/components/dashboard/emergency-stop-block";
import { getAgents } from "@/data/agents";
import { getActions } from "@/data/actions";
import { getPolicies } from "@/data/policies";
import { getCurrentUser } from "@/lib/session-db";
import { can } from "@/lib/permissions";
import styles from "@/components/dashboard/dashboard.module.css";

export default async function Home() {
  const [agents, actions, policies, currentUser] = await Promise.all([
    getAgents(),
    getActions(),
    getPolicies(),
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
        title="Panel de control"
        description="Estado operativo y prioridades del sistema."
      />
      <div className={styles.grid}>
        <PendingActionsBlock actions={actions} agents={agents} />
        <RiskBlock actions={actions} />
        <ActiveAgentsBlock agents={agents} />
        <RecentPoliciesBlock policies={policies} />
        <EmergencyStopBlock
          canEmergencyStop={can(currentUser, "runtime:emergency_stop")}
        />
      </div>
    </div>
  );
}
