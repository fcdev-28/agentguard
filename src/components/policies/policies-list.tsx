import Link from "next/link";
import type { Policy } from "@/domain";
import { policyEffectLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { getPolicies } from "@/lib/policies";
import {
  policyStatusClass,
  policyStatusLabel,
  policyEffectClass,
} from "./policies-style";
import styles from "./policies.module.css";

/** Inventario de políticas: fila enlazada al detalle con estado, efecto, versión y SLA. */
export function PoliciesList({
  policies,
  canWrite,
}: {
  policies: Policy[];
  canWrite: boolean;
}) {
  const sorted = getPolicies(policies);

  return (
    <div>
      {canWrite ? (
        <div className={styles.listActions}>
          <Link href="/policies/new" className={styles.primaryButton}>
            Nueva política
          </Link>
        </div>
      ) : null}
      {sorted.length === 0 ? (
        <EmptyState
          title="No hay políticas configuradas."
          hint="Crea una política para empezar a controlar qué acciones se permiten, bloquean o requieren aprobación."
        />
      ) : (
        <div className={styles.list}>
          {sorted.map((policy) => (
            <Link
              key={policy.id}
              href={`/policies/${policy.id}`}
              className={styles.row}
            >
              <div className={styles.identity}>
                <span className={styles.name}>{policy.name}</span>
                <span className={styles.description}>{policy.description}</span>
              </div>
              <span
                className={`${styles.statusBadge} ${policyStatusClass[policy.status]}`}
              >
                {policyStatusLabel[policy.status]}
              </span>
              <span
                className={`${styles.effectBadge} ${policyEffectClass[policy.effect]}`}
              >
                {policyEffectLabel[policy.effect]}
              </span>
              <span className={styles.version}>v{policy.version}</span>
              <span className={styles.sla}>
                {policy.approvalSlaMinutes
                  ? `SLA ${policy.approvalSlaMinutes} min`
                  : "—"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
