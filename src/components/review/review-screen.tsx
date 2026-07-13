"use client";

import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/feedback/empty-state";
import { getPendingActions } from "@/lib/dashboard";
import { actions } from "@/data/demo-data";
import { useReview } from "./review-store";
import { ReviewQueue } from "./review-queue";
import { ActionDetail } from "./action-detail";
import styles from "./review.module.css";

/** Pantalla master-detail de `/review`: cola priorizada + panel de la acción seleccionada. */
export function ReviewScreen() {
  const searchParams = useSearchParams();
  const { getActionState } = useReview();

  // La cola refleja el status del store (no el de demo-data), para que una
  // acción decidida desaparezca al instante sin recargar la página.
  const withStoreStatus = actions.map((action) => ({
    ...action,
    status: getActionState(action.id)?.status ?? action.status,
  }));
  const pending = getPendingActions(withStoreStatus);

  const requestedId = searchParams.get("selected");
  const selectedId = pending.some((a) => a.id === requestedId)
    ? requestedId
    : (pending[0]?.id ?? null);

  if (pending.length === 0) {
    return (
      <EmptyState
        title="No hay acciones pendientes de revisión."
        hint="Cuando un agente proponga una acción que requiera decisión humana, aparecerá aquí."
      />
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.queuePane}>
        <ReviewQueue actions={pending} selectedId={selectedId} />
      </div>
      {selectedId ? (
        <div className={styles.detailPane}>
          <ActionDetail actionId={selectedId} />
        </div>
      ) : null}
    </div>
  );
}
