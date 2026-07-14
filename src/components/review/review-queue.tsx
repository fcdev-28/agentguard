"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import type { AgentAction } from "@/domain";
import { actionStatusLabel } from "@/domain";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { formatRelativeTime, isOverdue } from "@/lib/format";
import { agents } from "@/data/demo-data";
import { actionStatusClass } from "./status-style";
import styles from "./review.module.css";

/** Ancho de pantalla a partir del que la cola convive con el panel lateral. */
const DESKTOP_BREAKPOINT = "(min-width: 900px)";

/** Cola priorizada de acciones pendientes: fila enlazable con selección compartida por URL. */
export function ReviewQueue({
  actions,
  selectedId,
}: {
  actions: AgentAction[];
  selectedId: string | null;
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
        <Link
          key={action.id}
          href={`/review/${action.id}`}
          onClick={(event) => handleClick(event, action.id)}
          className={`${styles.row} ${action.id === selectedId ? styles.rowSelected : ""}`}
        >
          <div className={styles.rowMain}>
            <span className={styles.rowTitle}>{action.title}</span>
            <span className={styles.rowMeta}>
              {agentName(action.agentId)} ·{" "}
              {formatRelativeTime(action.createdAt)}
            </span>
            <span
              className={`${styles.statusBadge} ${actionStatusClass[action.status]}`}
            >
              {actionStatusLabel[action.status]}
            </span>
          </div>
          <div className={styles.rowAside}>
            {isOverdue(action.approvalDueAt) ? (
              <span className={styles.overdue}>Vencida</span>
            ) : null}
            <RiskBadge level={action.riskLevel} />
          </div>
        </Link>
      ))}
    </div>
  );
}
