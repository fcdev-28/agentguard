import { PageHeader } from "@/components/app-shell/page-header";
import { PendingActionsBlock } from "@/components/dashboard/pending-actions-block";
import { ActiveAgentsBlock } from "@/components/dashboard/active-agents-block";
import styles from "@/components/dashboard/dashboard.module.css";

export default function Home() {
  return (
    <div>
      <PageHeader
        title="Panel de control"
        description="Estado operativo y prioridades del sistema."
      />
      <div className={styles.grid}>
        <PendingActionsBlock />
        <ActiveAgentsBlock />
      </div>
    </div>
  );
}
