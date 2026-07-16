"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/feedback/empty-state";
import { getPendingActions } from "@/lib/dashboard";
import type {
  ActionComment,
  Agent,
  AgentAction,
  Permission,
  Policy,
  RecordedApproval,
  Tool,
  User,
} from "@/domain";
import { useRuntime } from "@/components/app-shell/runtime-provider";
import { decideManyActions } from "@/lib/review-actions";
import { ReviewQueue } from "./review-queue";
import { ActionDetail } from "./action-detail";
import type { ReviewDecision } from "@/lib/review";
import styles from "./review.module.css";

/** Decisiones aplicables en lote (el escalado no admite lote). */
type BatchDecision = Exclude<ReviewDecision, "escalated">;

/** Pantalla master-detail de `/review`: cola priorizada + panel de la acción seleccionada. */
export function ReviewScreen({
  actions,
  agents,
  tools,
  policies,
  permissions,
  users,
  comments,
  approvals,
  currentUserId,
  canDecide,
  canComment,
}: {
  actions: AgentAction[];
  agents: Agent[];
  tools: Tool[];
  policies: Policy[];
  permissions: Permission[];
  users: User[];
  comments: ActionComment[];
  approvals: RecordedApproval[];
  currentUserId: string;
  canDecide: boolean;
  canComment: boolean;
}) {
  const searchParams = useSearchParams();
  const { emergencyStop } = useRuntime();
  const [, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [reason, setReason] = useState("");

  // Ids decididos de forma optimista: la fila sale de la cola al instante,
  // antes de que la revalidación traiga el status real desde el servidor.
  const [optimisticallyDecidedIds, addOptimisticallyDecided] = useOptimistic<
    ReadonlySet<string>,
    string[]
  >(new Set(), (state, ids) => new Set([...state, ...ids]));

  const pending = getPendingActions(actions).filter(
    (action) => !optimisticallyDecidedIds.has(action.id),
  );

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

  function applyBatch(decision: BatchDecision) {
    if (!canDecide) return;
    const ids = [...activeSelection];
    if (ids.length === 0) return;
    const trimmed = reason.trim();
    const reasonValue = trimmed === "" ? null : trimmed;
    setSelectedIds(new Set());
    setReason("");
    startTransition(async () => {
      addOptimisticallyDecided(ids);
      await decideManyActions(ids, decision, reasonValue);
    });
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
        {canDecide && activeSelection.size > 0 ? (
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
          canDecide={canDecide}
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
            comments={comments}
            approval={
              approvals.find((approval) => approval.actionId === selectedId) ??
              null
            }
            currentUserId={currentUserId}
            canDecide={canDecide}
            canComment={canComment}
          />
        </div>
      ) : null}
    </div>
  );
}
