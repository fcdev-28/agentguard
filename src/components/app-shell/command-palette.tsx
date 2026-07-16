"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { agents, actions, policies } from "@/data/demo-data";
import { isPendingReview } from "@/lib/dashboard";
import { searchCommands, type CommandItem } from "@/lib/command-palette";
import { useRuntime } from "./runtime-provider";
import { decideAction } from "@/lib/review-actions";
import {
  engageEmergencyStop,
  releaseEmergencyStop,
} from "@/lib/runtime-actions";
import { useCommandPalette } from "./command-palette-store";
import { EmptyState } from "@/components/feedback/empty-state";
import { NavIcon } from "./nav-icons";
import styles from "./command-palette.module.css";

/** Título visible de cada sección de resultados, en el orden en que se muestran. */
const SECTION_TITLE: Record<CommandItem["kind"], string> = {
  navigation: "Navegación",
  agent: "Agentes",
  action: "Acciones",
  policy: "Políticas",
  "quick-action": "Acciones rápidas",
};

const SECTION_ORDER: CommandItem["kind"][] = [
  "navigation",
  "agent",
  "action",
  "policy",
  "quick-action",
];

/**
 * Identifica la acción abierta (si la hay) a partir de la ruta actual: el
 * detalle dedicado `/review/[id]` o el panel lateral de `/review?selected=id`.
 * Se lee `window.location.search` directamente en lugar de `useSearchParams`
 * para no forzar el renderizado dinámico de todo el árbol bajo el layout
 * raíz, donde vive esta paleta.
 */
function getOpenActionId(pathname: string): string | null {
  const detailMatch = /^\/review\/([^/]+)$/.exec(pathname);
  if (detailMatch) return detailMatch[1];
  if (pathname === "/review" && typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("selected");
  }
  return null;
}

/**
 * Paleta de comandos global (Cmd-K / Ctrl-K): navegación rápida, búsqueda de
 * agentes/acciones/políticas y acciones rápidas sobre el estado runtime. Se
 * monta una única vez en el shell para que el atajo funcione en cualquier
 * pantalla. Solo gestiona el atajo de teclado y la apertura; el contenido
 * interactivo vive en `<CommandPaletteDialog>`, que se monta de cero cada
 * vez que se abre para que su estado (buscador, índice activo) arranque
 * limpio sin necesidad de efectos que lo reinicien.
 */
export function CommandPalette() {
  const { open, closePalette, togglePalette } = useCommandPalette();

  // Atajo global: Cmd/Ctrl+K abre o cierra la paleta desde cualquier punto.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
      } else if (event.key === "Escape" && open) {
        closePalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, togglePalette, closePalette]);

  if (!open) return null;

  return <CommandPaletteDialog onClose={closePalette} />;
}

/** Contenido interactivo de la paleta: buscador, resultados y ejecución. */
function CommandPaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { emergencyStop } = useRuntime();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // El buscador arranca vacío en cada apertura (el componente se monta de
  // cero); solo falta poner el foco en el input.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reinicia el índice activo cuando cambia el query, ajustando el estado
  // durante el render en vez de con un efecto (ver docs de React sobre
  // cómo adaptar estado a partir de otro estado).
  const [queryForActiveIndex, setQueryForActiveIndex] = useState(query);
  if (query !== queryForActiveIndex) {
    setQueryForActiveIndex(query);
    setActiveIndex(0);
  }

  // La paleta busca sobre el seed local (`@/data/demo-data`), no sobre las
  // acciones persistidas: mismo alcance que `searchCommands` más abajo. La
  // decisión en sí (`decideAction`) sí llega a BD por el actionId real de
  // la URL.
  const openActionId = useMemo(() => getOpenActionId(pathname), [pathname]);
  const openAction = openActionId
    ? actions.find((action) => action.id === openActionId)
    : undefined;
  const openActionPending = !!openAction && isPendingReview(openAction.status);

  const trimmedQuery = query.trim();

  const searchResults = useMemo(
    () => searchCommands(query, { agents, actions, policies }),
    [query],
  );

  const quickActionItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    items.push(
      emergencyStop.active
        ? {
            kind: "quick-action",
            id: "qa-release-emergency-stop",
            label: "Liberar parada de emergencia",
            quickAction: "release_emergency_stop",
          }
        : {
            kind: "quick-action",
            id: "qa-engage-emergency-stop",
            label: "Activar parada de emergencia",
            quickAction: "engage_emergency_stop",
          },
    );
    if (openActionId && openActionPending) {
      // Aprobar queda bloqueado con la parada de emergencia activa, igual que
      // en el detalle de la acción; rechazar sí se permite.
      if (!emergencyStop.active) {
        items.push({
          kind: "quick-action",
          id: "qa-approve-open-action",
          label: "Aprobar acción abierta",
          quickAction: "approve_open_action",
        });
      }
      items.push({
        kind: "quick-action",
        id: "qa-reject-open-action",
        label: "Rechazar acción abierta",
        quickAction: "reject_open_action",
      });
    }
    if (!trimmedQuery) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(trimmedQuery.toLowerCase()),
    );
  }, [emergencyStop.active, openActionId, openActionPending, trimmedQuery]);

  const sections = useMemo(() => {
    const all = [...searchResults, ...quickActionItems];
    return SECTION_ORDER.map((kind) => ({
      kind,
      title: SECTION_TITLE[kind],
      items: all.filter((item) => item.kind === kind),
    })).filter((section) => section.items.length > 0);
  }, [searchResults, quickActionItems]);

  const flatItems = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );

  /**
   * Ejecuta una acción rápida contra las server actions de runtime/revisión.
   * Rechazar exige un motivo no vacío (ver `applyDecision` en
   * `src/lib/review.ts`) y la paleta no ofrece un paso para escribirlo; en
   * vez de añadir un segundo diálogo, usamos un motivo por defecto explícito
   * que deja constancia del origen de la decisión.
   */
  function runQuickAction(
    quickAction: Extract<CommandItem, { kind: "quick-action" }>["quickAction"],
  ) {
    switch (quickAction) {
      case "engage_emergency_stop":
        void engageEmergencyStop();
        break;
      case "release_emergency_stop":
        void releaseEmergencyStop();
        break;
      case "approve_open_action":
        if (openActionId) void decideAction(openActionId, "approved", null);
        break;
      case "reject_open_action":
        if (openActionId) {
          void decideAction(
            openActionId,
            "rejected",
            "Rechazada desde la paleta de comandos",
          );
        }
        break;
    }
  }

  function executeItem(item: CommandItem) {
    if (item.kind === "quick-action") {
      runQuickAction(item.quickAction);
    } else {
      router.push(item.href);
    }
    onClose();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) =>
        flatItems.length === 0 ? 0 : (i + 1) % flatItems.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) =>
        flatItems.length === 0
          ? 0
          : (i - 1 + flatItems.length) % flatItems.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flatItems[activeIndex];
      if (item) executeItem(item);
    }
  }

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Cerrar paleta de comandos"
        onClick={onClose}
      />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
      >
        <div className={styles.inputRow}>
          <label
            htmlFor="command-palette-input"
            className={styles.visuallyHidden}
          >
            Buscar comandos, agentes, acciones o políticas
          </label>
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            className={styles.input}
            placeholder="Buscar o saltar a…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={flatItems[activeIndex]?.id}
            autoComplete="off"
          />
        </div>

        <div
          id="command-palette-listbox"
          role="listbox"
          aria-label="Resultados"
          className={styles.results}
        >
          {flatItems.length === 0 ? (
            <EmptyState
              title={
                trimmedQuery
                  ? `Sin resultados para "${trimmedQuery}".`
                  : "Escribe para buscar."
              }
            />
          ) : (
            sections.map((section) => (
              <div key={section.kind} className={styles.section}>
                <div className={styles.sectionTitle}>{section.title}</div>
                {section.items.map((item) => {
                  const index = flatItems.indexOf(item);
                  const active = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      id={item.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={
                        active
                          ? `${styles.item} ${styles.itemActive}`
                          : styles.item
                      }
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => executeItem(item)}
                    >
                      {item.kind === "navigation" ? (
                        <span className={styles.itemIcon}>
                          <NavIcon name={item.icon} />
                        </span>
                      ) : null}
                      <span className={styles.itemLabel}>{item.label}</span>
                      {item.kind === "agent" ||
                      item.kind === "action" ||
                      item.kind === "policy" ? (
                        <span className={styles.itemHint}>{item.hint}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
