"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import styles from "./select.module.css";

/** Opción del combobox: valor enviado y etiqueta visible. */
type Option = { value: string; label: string };

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  id?: string;
  name?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Combobox accesible que sustituye al `<select>` nativo: sus opciones no se
 * pueden estilar de forma consistente entre navegadores. Sigue el patrón
 * listbox con botón disparador de las WAI-ARIA Authoring Practices: el foco
 * de teclado se queda siempre en el botón (`role="combobox"`) y la opción
 * resaltada se comunica vía `aria-activedescendant`, sin montar el listbox
 * hasta que está abierto.
 */
export function Select({
  value,
  onChange,
  options,
  id,
  name,
  ariaLabel,
  ariaLabelledby,
  placeholder = "Selecciona una opción",
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeaheadRef = useRef<{
    buffer: string;
    timeout: ReturnType<typeof setTimeout> | null;
  }>({ buffer: "", timeout: null });

  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Cierra al hacer click fuera del control; el foco vuelve al disparador.
  useEffect(() => {
    if (!open) return;
    function onDocumentMouseDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [open]);

  // Mantiene visible la opción activa al navegar con teclado.
  useEffect(() => {
    if (!open) return;
    const activeEl = listRef.current?.querySelector(
      `#${CSS.escape(`${listId}-option-${activeIndex}`)}`,
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listId]);

  function openList(initialIndex: number) {
    setActiveIndex(initialIndex);
    setOpen(true);
    // En Safari un click de ratón no da foco al botón por defecto; lo forzamos
    // para que el resaltado por teclado y el cierre funcionen igual siempre.
    triggerRef.current?.focus();
  }

  function commitSelection(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTypeahead(char: string) {
    const state = typeaheadRef.current;
    state.buffer += char.toLowerCase();
    if (state.timeout) clearTimeout(state.timeout);
    state.timeout = setTimeout(() => {
      state.buffer = "";
    }, 500);
    const match = options.findIndex((option) =>
      option.label.toLowerCase().startsWith(state.buffer),
    );
    if (match >= 0) setActiveIndex(match);
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openList(selectedIndex >= 0 ? selectedIndex : 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        openList(selectedIndex >= 0 ? selectedIndex : options.length - 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openList(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commitSelection(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        // Deja que el foco siga su curso natural hacia el siguiente control.
        setOpen(false);
        break;
      default:
        if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
          handleTypeahead(event.key);
        }
        break;
    }
  }

  return (
    <div className={styles.wrap} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={
          open ? `${styles.trigger} ${styles.triggerOpen}` : styles.trigger
        }
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
          } else {
            openList(selectedIndex >= 0 ? selectedIndex : 0);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          className={
            selectedOption ? styles.triggerLabel : styles.triggerPlaceholder
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={styles.chevron}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-activedescendant={optionId(activeIndex)}
          className={styles.list}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            const className = [
              styles.option,
              isActive ? styles.optionActive : "",
              isSelected ? styles.optionSelected : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                className={className}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commitSelection(index)}
              >
                <span>{option.label}</span>
                {isSelected ? (
                  <span className={styles.optionCheck} aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
