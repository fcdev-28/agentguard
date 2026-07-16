"use client";

import { useState } from "react";
import {
  actionStatusLabel,
  actionTypeLabel,
  policyEffectLabel,
  userRoleLabel,
  type Agent,
  type AgentAction,
  type Permission,
  type Policy,
  type Tool,
  type User,
} from "@/domain";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { isPendingReview } from "@/lib/dashboard";
import { formatRelativeTime, isOverdue } from "@/lib/format";
import { evaluatePolicy } from "@/lib/policy-eval";
import { currentUser } from "@/lib/session";
import { useRuntime } from "@/components/app-shell/runtime-store";
import { useReview } from "./review-store";
import { useComments } from "./comment-store";
import { actionStatusClass } from "./status-style";
import { eligibleEscalationTargets, type ReviewDecision } from "@/lib/review";
import { isValidCommentBody } from "@/lib/comments";
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
}: {
  actionId: string;
  actions: AgentAction[];
  agents: Agent[];
  tools: Tool[];
  policies: Policy[];
  permissions: Permission[];
  users: User[];
}) {
  const action = actions.find((a) => a.id === actionId);
  const { getActionState, decide, escalate } = useReview();
  const { emergencyStop } = useRuntime();
  const { getComments, addComment } = useComments();
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [escalateTarget, setEscalateTarget] = useState("");
  const [commentBody, setCommentBody] = useState("");

  if (!action) {
    return null;
  }

  const state = getActionState(action.id);
  const status = state?.status ?? action.status;
  const canDecide = isPendingReview(status);

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
  const comments = getComments(action.id);
  const payloadEntries = Object.entries(action.payload);
  const resolvedActionId = action.id;
  const escalationTargets = eligibleEscalationTargets(users, currentUser.id);

  function startDecision(decision: ReviewDecision) {
    if (decision === "approved") {
      decide(resolvedActionId, decision, null);
      return;
    }
    setPendingDecision(decision);
    setReason("");
  }

  function confirmDecision() {
    if (!pendingDecision || !reason.trim()) return;
    decide(resolvedActionId, pendingDecision, reason.trim());
    setPendingDecision(null);
    setReason("");
  }

  function cancelDecision() {
    setPendingDecision(null);
    setReason("");
  }

  function confirmEscalate() {
    if (!escalateTarget) return;
    escalate(resolvedActionId, escalateTarget);
    setEscalateTarget("");
  }

  function submitComment() {
    if (!isValidCommentBody(commentBody)) return;
    addComment(resolvedActionId, commentBody);
    setCommentBody("");
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
        {state?.decision?.escalatedTo ? (
          <span className={styles.metaItem}>
            Escalada a: <strong>{state.decision.escalatedTo.name}</strong>
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
        {comments.length > 0 ? (
          <ul className={styles.commentList}>
            {comments.map((comment) => (
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
      </section>

      {canDecide ? (
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
                  <label
                    className={styles.escalateLabel}
                    htmlFor="escalate-target"
                  >
                    Escalar a
                  </label>
                  <select
                    id="escalate-target"
                    className={styles.escalateSelect}
                    value={escalateTarget}
                    onChange={(event) => setEscalateTarget(event.target.value)}
                  >
                    <option value="">Selecciona un responsable…</option>
                    {escalationTargets.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} · {userRoleLabel[user.role]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.decisionButtonGhost}
                    onClick={confirmEscalate}
                    disabled={!escalateTarget}
                  >
                    Escalar
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
      ) : state?.decision ? (
        <p className={styles.decisionNote}>
          Decidida por {state.decision.byName} ·{" "}
          {formatRelativeTime(state.decision.at)}
          {state.decision.reason ? ` — ${state.decision.reason}` : ""}
        </p>
      ) : null}
    </div>
  );
}
