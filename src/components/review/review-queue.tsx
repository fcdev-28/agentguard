"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import type { Agent, AgentAction } from "@/domain";
import { actionStatusLabel } from "@/domain";
import { isPendingReview } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
import { StopBar } from "./stop-bar";
import { RiskWord } from "./risk-word";
import { queueStatusClass } from "./queue-status";
import styles from "./review.module.css";

/** Ancho de pantalla a partir del que la cola convive con el panel lateral. */
const DESKTOP_BREAKPOINT = "(min-width: 900px)";

/** Cola priorizada de acciones pendientes: fila enlazable con selección compartida por URL. */
export function ReviewQueue({
  actions,
  agents,
  selectedId,
  selectedIds,
  onToggleSelect,
  canDecide,
}: {
  actions: AgentAction[];
  agents: Agent[];
  selectedId: string | null;
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (actionId: string) => void;
  canDecide: boolean;
}) {
  const router = useRouter();
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  function handleClick(event: MouseEvent<HTMLAnchorElement>, actionId: string) {
    // Clics para abrir en pestaña nueva o pantallas sin panel: navegación normal a /review/[actionId].
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;
    if (!window.matchMedia(DESKTOP_BREAKPOINT).matches) return;

    event.preventDefault();
    router.replace(`/review?selected=${actionId}`, { scroll: false });
  }

  return (
    <div className={styles.queue}>
      {actions.map((action) => (
        <div
          key={action.id}
          className={`${styles.row} ${action.id === selectedId ? styles.rowSelected : ""} ${selectedIds.has(action.id) ? styles.rowChecked : ""}`}
        >
          <StopBar
            status={action.status}
            createdAt={action.createdAt}
            approvalDueAt={action.approvalDueAt}
          />
          <div className={styles.rowBody}>
            <span className={styles.rowCheckboxCell}>
              {canDecide && isPendingReview(action.status) ? (
                <input
                  type="checkbox"
                  className={styles.rowCheckbox}
                  checked={selectedIds.has(action.id)}
                  onChange={() => onToggleSelect(action.id)}
                  aria-label={`Seleccionar acción ${action.title}`}
                />
              ) : null}
            </span>
            <Link
              href={`/review/${action.id}`}
              onClick={(event) => handleClick(event, action.id)}
              className={styles.rowLink}
            >
              <div className={styles.rowMain}>
                <span className={styles.rowTitleLine}>
                  <span className={styles.rowTitle}>{action.title}</span>
                  <span
                    className={`${styles.rowTag} ${queueStatusClass[action.status]}`}
                  >
                    {actionStatusLabel[action.status]}
                  </span>
                </span>
                <span className={styles.rowMeta}>
                  {agentName(action.agentId)} ·{" "}
                  {formatRelativeTime(action.createdAt)}
                </span>
              </div>
              <span className={styles.rowRisk}>
                <RiskWord level={action.riskLevel} />
              </span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
