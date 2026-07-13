import Link from "next/link";
import { DashboardBlock } from "./dashboard-block";
import { EmptyState } from "@/components/feedback/empty-state";
import { getRecentPolicies } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
import { policyEffectLabel } from "@/domain";
import { policies } from "@/data/demo-data";
import styles from "./dashboard.module.css";

/** Bloque: políticas que pasaron a activas más recientemente. */
export function RecentPoliciesBlock() {
  const recent = getRecentPolicies(policies);

  return (
    <DashboardBlock
      title="Políticas activadas recientemente"
      action={
        <Link href="/policies" className={styles.blockAction}>
          Ver políticas →
        </Link>
      }
    >
      {recent.length === 0 ? (
        <EmptyState title="No hay políticas activas." />
      ) : (
        recent.map((policy) => (
          <Link
            key={policy.id}
            href={`/policies/${policy.id}`}
            className={styles.row}
          >
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{policy.name}</span>
              <span className={styles.rowMeta}>
                {policyEffectLabel[policy.effect]}
              </span>
            </div>
            <div className={styles.rowAside}>
              <span className={styles.rowMeta}>
                {policy.publishedAt
                  ? formatRelativeTime(policy.publishedAt)
                  : "—"}
              </span>
            </div>
          </Link>
        ))
      )}
    </DashboardBlock>
  );
}
