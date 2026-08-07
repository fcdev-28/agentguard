"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type { Agent, AgentAction } from "@/domain";
import { actionStatusLabel } from "@/domain";
import { isPendingReview } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
import { readMotionToken } from "@/lib/motion";
import { StopBar } from "@/components/data-display/stop-bar";
import { RiskWord } from "@/components/data-display/risk-word";
import { StatusTag } from "@/components/data-display/status-tag";
import {
  actionStatusVariant,
  showsStatusTag,
} from "@/components/data-display/action-status";
import styles from "./review.module.css";

/** Ancho de pantalla a partir del que la cola convive con el panel lateral. */
const DESKTOP_BREAKPOINT = "(min-width: 900px)";

/** Duración de la descarga si no se puede leer el token (SSR o token
 * ausente). El valor real manda desde --duration-settle en tokens.css. */
const DRAIN_MS_FALLBACK = 320;

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

  // Retención de filas que se resuelven (IDENTITY §6): "actions" es la única
  // fuente de verdad (llega vía useOptimistic desde el lote o vía
  // revalidación desde la decisión suelta), pero cuando un id desaparece de
  // ella lo seguimos renderizando en su índice original mientras drena.
  //
  // `renderList` es lo que de verdad se pinta. El diff vive en un
  // useLayoutEffect con dependencia solo en `actions` (no en renderList ni
  // drainingIds: si el efecto dependiera de lo que él mismo actualiza, el
  // linter lo marca como set-state-in-effect en bucle). Para leer el
  // renderList/drainingIds "de antes" sin declararlos como dependencia,
  // `committedRef` los espeja vía un efecto aparte — leer/escribir un ref
  // fuera del cuerpo del render está permitido (regla react-hooks/refs).
  // useLayoutEffect corre síncrono antes de pintar, así que no hay commit
  // intermedio sin la fila que provoque parpadeo.
  const [renderList, setRenderList] = useState<AgentAction[]>(actions);
  const [drainingIds, setDrainingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const committedRef = useRef({ renderList, drainingIds });
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    committedRef.current = { renderList, drainingIds };
  }, [renderList, drainingIds]);

  useLayoutEffect(() => {
    if (isFirstRunRef.current) {
      // Primer render: no hay nada que drenar todavía.
      isFirstRunRef.current = false;
      return;
    }

    const { renderList: prevRenderList, drainingIds: prevDrainingIds } =
      committedRef.current;
    const byId = new Map(actions.map((a) => [a.id, a]));
    const newlyDrained: string[] = [];

    // Filas que ya no están en `actions`: se retienen con sus datos de antes
    // mientras drenan, cada una en el índice que ocupaba. En orden ascendente
    // de índice, que es como hay que reinsertarlas después.
    const draining = prevRenderList
      .map((action, index) => ({ action, index }))
      .filter(({ action }) => !byId.has(action.id));

    for (const { action } of draining) {
      if (!prevDrainingIds.has(action.id)) newlyDrained.push(action.id);
    }

    // La base es `actions`, no la lista anterior: así se conserva el orden de
    // getPendingActions (riesgo desc, luego antigüedad asc). Reconstruir desde
    // el render previo dejaría las acciones nuevas al final, y una crítica
    // recién llegada tiene que entrar arriba.
    const next = [...actions];
    for (const { action, index } of draining) {
      next.splice(Math.min(index, next.length), 0, action);
    }

    setRenderList(next);
    if (newlyDrained.length > 0) {
      setDrainingIds(new Set([...prevDrainingIds, ...newlyDrained]));
    }
  }, [actions]);

  // Colapso de alto de la fila que drena, en dos fases (max-height no tiene
  // un "auto" interpolable, así que hace falta fijar un valor numérico de
  // partida antes de poder transicionar a 0 — ver .rowDraining en
  // review.module.css):
  //
  // Fase 1 (useLayoutEffect, antes de pintar): se mide el alto real de la
  // fila y se fija como max-height explícito — igual a su alto natural, así
  // que no cambia nada visible todavía.
  //
  // Fase 2 (useEffect normal, después de pintar la fase 1): se cambia ese
  // max-height explícito a 0. Tiene que ser un efecto normal, no de layout:
  // uno de layout encadenaría la fase 2 antes de que el navegador llegue a
  // pintar el alto "de partida" de la fase 1, y la transición no tendría de
  // dónde arrancar (saltaría directa a 0, sin animar).
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const [drainHeights, setDrainHeights] = useState<ReadonlyMap<string, number>>(
    new Map(),
  );
  const [collapsingIds, setCollapsingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const collapseStartedRef = useRef(new Set<string>());

  useLayoutEffect(() => {
    setDrainHeights((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const id of drainingIds) {
        if (next.has(id)) continue;
        const el = rowRefs.current.get(id);
        if (el) {
          next.set(id, el.getBoundingClientRect().height);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [drainingIds]);

  useEffect(() => {
    const pending = [...drainingIds].filter(
      (id) => !collapseStartedRef.current.has(id),
    );
    if (pending.length === 0) return;
    for (const id of pending) collapseStartedRef.current.add(id);
    setCollapsingIds((prev) => new Set([...prev, ...pending]));
  }, [drainingIds]);

  // Timers de retirada: cada fila que drena tiene el suyo (soporta varias
  // salidas solapadas, p. ej. un lote de N filas resuelto de golpe).
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    // La fila se retiene exactamente lo que dura la descarga en CSS. Se lee
    // el token en vez de repetir el número aquí: si --duration-settle cambia,
    // el temporizador cambia con él y la animación no se corta a medias.
    const drainMs = readMotionToken("--duration-settle", DRAIN_MS_FALLBACK);
    for (const id of drainingIds) {
      if (timersRef.current.has(id)) continue;
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        rowRefs.current.delete(id);
        collapseStartedRef.current.delete(id);
        setDrainingIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setDrainHeights((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        setCollapsingIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setRenderList((prev) => prev.filter((a) => a.id !== id));
      }, drainMs);
      timersRef.current.set(id, timer);
    }
  }, [drainingIds]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

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
      {renderList.map((action) => {
        const isDraining = drainingIds.has(action.id);
        const drainHeight = drainHeights.get(action.id);
        const rowStyle: CSSProperties | undefined =
          drainHeight !== undefined
            ? {
                maxHeight: collapsingIds.has(action.id)
                  ? "0px"
                  : `${drainHeight}px`,
              }
            : undefined;

        return (
          <div
            key={action.id}
            ref={(el) => {
              if (el) rowRefs.current.set(action.id, el);
              else rowRefs.current.delete(action.id);
            }}
            className={`${styles.row} ${action.id === selectedId ? styles.rowSelected : ""} ${selectedIds.has(action.id) ? styles.rowChecked : ""} ${isDraining ? styles.rowDraining : ""}`}
            style={rowStyle}
          >
            <StopBar
              status={action.status}
              createdAt={action.createdAt}
              approvalDueAt={action.approvalDueAt}
              draining={isDraining}
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
                    {showsStatusTag(action.status) ? (
                      <StatusTag variant={actionStatusVariant[action.status]}>
                        {actionStatusLabel[action.status]}
                      </StatusTag>
                    ) : null}
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
        );
      })}
    </div>
  );
}
