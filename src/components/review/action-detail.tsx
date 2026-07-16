"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  actionStatusLabel,
  actionTypeLabel,
  policyEffectLabel,
  type ActionComment,
  type Agent,
  type AgentAction,
  type Permission,
  type Policy,
  type RecordedApproval,
  type Tool,
  type User,
} from "@/domain";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { isPendingReview } from "@/lib/dashboard";
import { formatRelativeTime, isOverdue } from "@/lib/format";
import { evaluatePolicy } from "@/lib/policy-eval";
import { useRuntime } from "@/components/app-shell/runtime-provider";
import { addComment, decideAction, escalateAction } from "@/lib/review-actions";
import { actionStatusClass } from "./status-style";
import { eligibleEscalationTargets, type ReviewDecision } from "@/lib/review";
import { commentsForAction, isValidCommentBody } from "@/lib/comments";
import styles from "./review.module.css";

/** Representación legible de un valor del payload (sin volcar JSON crudo). */
function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Contexto, evidencia y controles de decisión de una acción, para el panel o la ruta standalone. */
export function ActionDetail({
  actionId,
  actions,
  agents,
  tools,
  policies,
  permissions,
  users,
  comments,
  approval,
  currentUserId,
  canDecide,
  canComment,
}: {
  actionId: string;
  actions: AgentAction[];
  agents: Agent[];
  tools: Tool[];
  policies: Policy[];
  permissions: Permission[];
  users: User[];
  comments: ActionComment[];
  approval: RecordedApproval | null;
  currentUserId: string;
  canDecide: boolean;
  canComment: boolean;
}) {
  const action = actions.find((a) => a.id === actionId);
  const { emergencyStop } = useRuntime();
  const [, startTransition] = useTransition();
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [optimisticComments, addOptimisticComment] = useOptimistic<
    ActionComment[],
    ActionComment
  >(comments, (state, comment) => [...state, comment]);

  if (!action) {
    return null;
  }

  const status = action.status;
  const isDecidable = isPendingReview(status);

  const agent = agents.find((a) => a.id === action.agentId);
  const tool = tools.find((t) => t.id === action.toolId);
  // La sección de política refleja el motor de evaluación (lib/policy-eval),
  // no el policyResult sembrado: así queda vivo si cambian las políticas activas.
  const policyEvaluation = evaluatePolicy(action, policies, {
    tools,
    agents,
    permissions,
  });
  const policy = policyEvaluation.policyId
    ? policies.find((p) => p.id === policyEvaluation.policyId)
    : null;
  const visibleComments = commentsForAction(optimisticComments, action.id);
  const payloadEntries = Object.entries(action.payload);
  const resolvedActionId = action.id;
  const escalationTargets = eligibleEscalationTargets(users, currentUserId);

  function startDecision(decision: ReviewDecision) {
    if (decision === "approved") {
      startTransition(async () => {
        await decideAction(resolvedActionId, "approved", null);
      });
      return;
    }
    setPendingDecision(decision);
    setReason("");
  }

  function confirmDecision() {
    if (!pendingDecision || pendingDecision === "escalated" || !reason.trim())
      return;
    const decision = pendingDecision;
    const trimmedReason = reason.trim();
    setPendingDecision(null);
    setReason("");
    startTransition(async () => {
      await decideAction(resolvedActionId, decision, trimmedReason);
    });
  }

  function cancelDecision() {
    setPendingDecision(null);
    setReason("");
  }

  function confirmEscalate() {
    startTransition(async () => {
      await escalateAction(resolvedActionId);
    });
  }

  function submitComment() {
    if (!isValidCommentBody(commentBody)) return;
    const body = commentBody.trim();
    setCommentBody("");
    startTransition(async () => {
      addOptimisticComment({
        id: `optimistic-${resolvedActionId}-${Date.now()}`,
        actionId: resolvedActionId,
        authorId: currentUserId,
        body,
        createdAt: new Date().toISOString(),
      });
      await addComment(resolvedActionId, body);
    });
  }

  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <span className={`${styles.statusBadge} ${actionStatusClass[status]}`}>
          {actionStatusLabel[status]}
        </span>
        <RiskBadge level={action.riskLevel} />
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          Agente: <strong>{agent?.name ?? action.agentId}</strong>
        </span>
        <span className={styles.metaItem}>
          Herramienta: <strong>{tool?.name ?? action.toolId}</strong>
        </span>
        <span className={styles.metaItem}>
          Tipo: <strong>{actionTypeLabel[action.actionType]}</strong>
        </span>
        <span className={styles.metaItem}>
          Propuesta: <strong>{formatRelativeTime(action.createdAt)}</strong>
        </span>
        {action.approvalDueAt ? (
          <span className={styles.metaItem}>
            Vence: <strong>{formatRelativeTime(action.approvalDueAt)}</strong>
            {isOverdue(action.approvalDueAt) ? (
              <span className={styles.overdueInline}> · Vencida</span>
            ) : null}
          </span>
        ) : null}
      </div>

      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Resumen</h3>
        <p className={styles.summary}>{action.summary}</p>
      </section>

      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Datos de la acción</h3>
        {payloadEntries.length === 0 ? (
          <p className={styles.hint}>Sin datos adicionales.</p>
        ) : (
          <div className={styles.metaRow}>
            {payloadEntries.map(([key, value]) => (
              <span key={key} className={styles.metaItem}>
                {key}: <strong>{formatPayloadValue(value)}</strong>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Política</h3>
        {policyEvaluation.policyId ? (
          <>
            <p className={styles.policyEffect}>
              {policy?.name ?? "Política no encontrada"} ·{" "}
              {policyEffectLabel[policyEvaluation.effect]}
            </p>
            <p className={styles.hint}>{policyEvaluation.reason}</p>
          </>
        ) : (
          <p className={styles.hint}>{policyEvaluation.reason}</p>
        )}
      </section>

      <section className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Comentarios</h3>
        {visibleComments.length > 0 ? (
          <ul className={styles.commentList}>
            {visibleComments.map((comment) => (
              <li key={comment.id} className={styles.comment}>
                <span className={styles.commentAuthor}>
                  {users.find((u) => u.id === comment.authorId)?.name ??
                    comment.authorId}
                </span>
                <span className={styles.commentBody}>{comment.body}</span>
                <span className={styles.commentTime}>
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>Aún no hay comentarios.</p>
        )}
        {canComment ? (
          <div className={styles.reasonBox}>
            <label className={styles.reasonLabel} htmlFor="new-comment">
              Añadir comentario
            </label>
            <textarea
              id="new-comment"
              className={styles.reasonInput}
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              rows={3}
              placeholder="Escribe un comentario…"
            />
            <div className={styles.reasonActions}>
              <button
                type="button"
                className={styles.decisionButton}
                onClick={submitComment}
                disabled={!isValidCommentBody(commentBody)}
              >
                Comentar
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {isDecidable && canDecide ? (
        <section className={styles.detailSection}>
          {pendingDecision === null ? (
            <>
              <div className={styles.decisionBar}>
                <button
                  type="button"
                  className={`${styles.decisionButton} ${styles.approve}`}
                  onClick={() => startDecision("approved")}
                  disabled={emergencyStop.active}
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  className={`${styles.decisionButton} ${styles.reject}`}
                  onClick={() => startDecision("rejected")}
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  className={styles.decisionButton}
                  onClick={() => startDecision("changes_requested")}
                >
                  Pedir cambios
                </button>
              </div>
              {emergencyStop.active ? (
                <p className={styles.hint}>
                  Parada de emergencia activa: aprobaciones bloqueadas.
                </p>
              ) : null}
              {escalationTargets.length > 0 ? (
                <div className={styles.escalateRow}>
                  <button
                    type="button"
                    className={styles.decisionButtonGhost}
                    onClick={confirmEscalate}
                  >
                    Escalar a un responsable
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.reasonBox}>
              <label className={styles.reasonLabel} htmlFor="decision-reason">
                Motivo{" "}
                {pendingDecision === "rejected"
                  ? "del rechazo"
                  : "de los cambios solicitados"}
              </label>
              <textarea
                id="decision-reason"
                className={styles.reasonInput}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Explica brevemente el motivo…"
              />
              <div className={styles.reasonActions}>
                <button
                  type="button"
                  className={styles.decisionButtonGhost}
                  onClick={cancelDecision}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`${styles.decisionButton} ${styles.reject}`}
                  onClick={confirmDecision}
                  disabled={!reason.trim()}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </section>
      ) : approval ? (
        <p className={styles.decisionNote}>
          Decidida por {approval.reviewer.name} ·{" "}
          {formatRelativeTime(approval.createdAt)}
          {approval.reason ? ` — ${approval.reason}` : ""}
        </p>
      ) : null}
    </div>
  );
}
