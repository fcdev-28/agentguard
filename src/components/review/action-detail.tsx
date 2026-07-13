"use client";

import { useState } from "react";
import { actionStatusLabel, actionTypeLabel, policyEffectLabel } from "@/domain";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { isPendingReview } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
import { evaluatePolicy } from "@/lib/policy-eval";
import {
  actions,
  agents,
  tools,
  policies,
  permissions,
  actionComments,
  users,
} from "@/data/demo-data";
import { useReview } from "./review-store";
import { actionStatusClass } from "./status-style";
import type { ReviewDecision } from "@/lib/review";
import styles from "./review.module.css";

/** Representación legible de un valor del payload (sin volcar JSON crudo). */
function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Contexto, evidencia y controles de decisión de una acción, para el panel o la ruta standalone. */
export function ActionDetail({ actionId }: { actionId: string }) {
  const action = actions.find((a) => a.id === actionId);
  const { getActionState, decide } = useReview();
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(null);
  const [reason, setReason] = useState("");

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
  const policyEvaluation = evaluatePolicy(action, policies, { tools, agents, permissions });
  const policy = policyEvaluation.policyId
    ? policies.find((p) => p.id === policyEvaluation.policyId)
    : null;
  const comments = actionComments.filter((c) => c.actionId === action.id);
  const payloadEntries = Object.entries(action.payload);
  const resolvedActionId = action.id;

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

      {comments.length > 0 ? (
        <section className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>Comentarios</h3>
          <ul className={styles.commentList}>
            {comments.map((comment) => (
              <li key={comment.id} className={styles.comment}>
                <span className={styles.commentAuthor}>
                  {users.find((u) => u.id === comment.authorId)?.name ?? comment.authorId}
                </span>
                <span className={styles.commentBody}>{comment.body}</span>
                <span className={styles.commentTime}>
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canDecide ? (
        <section className={styles.detailSection}>
          {pendingDecision === null ? (
            <div className={styles.decisionBar}>
              <button
                type="button"
                className={`${styles.decisionButton} ${styles.approve}`}
                onClick={() => startDecision("approved")}
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
          ) : (
            <div className={styles.reasonBox}>
              <label className={styles.reasonLabel} htmlFor="decision-reason">
                Motivo {pendingDecision === "rejected" ? "del rechazo" : "de los cambios solicitados"}
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
                <button type="button" className={styles.decisionButtonGhost} onClick={cancelDecision}>
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
          Decidida por {state.decision.byName} · {formatRelativeTime(state.decision.at)}
          {state.decision.reason ? ` — ${state.decision.reason}` : ""}
        </p>
      ) : null}
    </div>
  );
}
