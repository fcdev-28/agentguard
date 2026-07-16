"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/feedback/empty-state";
import { getPendingActions } from "@/lib/dashboard";
import type {
  Agent,
  AgentAction,
  Permission,
  Policy,
  Tool,
  User,
} from "@/domain";
import { useRuntime } from "@/components/app-shell/runtime-store";
import { useReview } from "./review-store";
import { ReviewQueue } from "./review-queue";
import { ActionDetail } from "./action-detail";
import type { ReviewDecision } from "@/lib/review";
import styles from "./review.module.css";

/** Pantalla master-detail de `/review`: cola priorizada + panel de la acción seleccionada. */
export function ReviewScreen({
  actions,
  agents,
  tools,
  policies,
  permissions,
  users,
}: {
  actions: AgentAction[];
  agents: Agent[];
  tools: Tool[];
  policies: Policy[];
  permissions: Permission[];
  users: User[];
}) {
  const searchParams = useSearchParams();
  const { getActionState, decideMany } = useReview();
  const { emergencyStop } = useRuntime();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [reason, setReason] = useState("");

  // La cola refleja el status del store (no el cargado inicialmente), para
  // que una acción decidida desaparezca al instante sin recargar la página.
  const withStoreStatus = actions.map((action) => ({
    ...action,
    status: getActionState(action.id)?.status ?? action.status,
  }));
  const pending = getPendingActions(withStoreStatus);

  // Solo cuentan las acciones marcadas que siguen pendientes en la cola: una
  // acción ya decidida deja de estar seleccionable.
  const activeSelection = new Set(
    [...selectedIds].filter((id) => pending.some((a) => a.id === id)),
  );

  const requestedId = searchParams.get("selected");
  const selectedId = pending.some((a) => a.id === requestedId)
    ? requestedId
    : (pending[0]?.id ?? null);

  function toggleSelect(actionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  }

  function applyBatch(decision: ReviewDecision) {
    const ids = [...activeSelection];
    if (ids.length === 0) return;
    const trimmed = reason.trim();
    decideMany(ids, decision, trimmed === "" ? null : trimmed);
    setSelectedIds(new Set());
    setReason("");
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        title="No hay acciones pendientes de revisión."
        hint="Cuando un agente proponga una acción que requiera decisión humana, aparecerá aquí."
      />
    );
  }

  const reasonMissing = reason.trim() === "";

  return (
    <div className={styles.layout}>
      <div className={styles.queuePane}>
        {activeSelection.size > 0 ? (
          <div className={styles.selectionBar}>
            <div className={styles.selectionHead}>
              <span className={styles.selectionCount}>
                {activeSelection.size}{" "}
                {activeSelection.size === 1
                  ? "acción seleccionada"
                  : "acciones seleccionadas"}
              </span>
              <button
                type="button"
                className={styles.decisionButtonGhost}
                onClick={() => setSelectedIds(new Set())}
              >
                Limpiar
              </button>
            </div>
            <input
              type="text"
              className={styles.reasonInput}
              placeholder="Motivo (obligatorio para rechazar o pedir cambios)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-label="Motivo de la decisión por lote"
            />
            <div className={styles.selectionActions}>
              <button
                type="button"
                className={`${styles.decisionButton} ${styles.approve}`}
                onClick={() => applyBatch("approved")}
                disabled={emergencyStop.active}
              >
                Aprobar
              </button>
              <button
                type="button"
                className={`${styles.decisionButton} ${styles.reject}`}
                onClick={() => applyBatch("rejected")}
                disabled={reasonMissing}
              >
                Rechazar
              </button>
              <button
                type="button"
                className={styles.decisionButton}
                onClick={() => applyBatch("changes_requested")}
                disabled={reasonMissing}
              >
                Pedir cambios
              </button>
            </div>
            {emergencyStop.active ? (
              <p className={styles.hint}>
                Parada de emergencia activa: aprobaciones bloqueadas.
              </p>
            ) : null}
          </div>
        ) : null}
        <ReviewQueue
          actions={pending}
          agents={agents}
          selectedId={selectedId}
          selectedIds={activeSelection}
          onToggleSelect={toggleSelect}
        />
      </div>
      {selectedId ? (
        <div className={styles.detailPane}>
          <ActionDetail
            actionId={selectedId}
            actions={actions}
            agents={agents}
            tools={tools}
            policies={policies}
            permissions={permissions}
            users={users}
          />
        </div>
      ) : null}
    </div>
  );
}
