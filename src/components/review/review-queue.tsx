"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import type { MouseEvent } from "react";
import type { Agent, AgentAction } from "@/domain";
import { actionStatusLabel } from "@/domain";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { isPendingReview } from "@/lib/dashboard";
import { formatRelativeTime, isOverdue } from "@/lib/format";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { actionStatusClass } from "./status-style";
import styles from "./review.module.css";

/** Ancho de pantalla a partir del que la cola convive con el panel lateral. */
const DESKTOP_BREAKPOINT = "(min-width: 900px)";

/** Entrada escalonada de las filas de la cola. */
const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

/** Cada fila aparece con un pequeño desplazamiento vertical y sale hacia la izquierda al decidirse. */
const item = {
  hidden: { opacity: 0, y: motionTokens.distance.md },
  visible: { opacity: 1, y: 0, transition: springs.gentle },
  exit: { opacity: 0, x: -motionTokens.distance.md },
};

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
    if (actionId === selectedId) {
      router.replace("/review", { scroll: false });
      return;
    }
    router.replace(`/review?selected=${actionId}`, { scroll: false });
  }

  return (
    <motion.ul
      className={styles.queue}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {actions.map((action) => (
          <motion.li
            key={action.id}
            variants={item}
            exit="exit"
            layout
            className={`${styles.row} ${action.id === selectedId ? styles.rowSelected : ""} ${selectedIds.has(action.id) ? styles.rowChecked : ""}`}
          >
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
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
