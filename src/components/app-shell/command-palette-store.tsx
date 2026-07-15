"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface CommandPaletteContextValue {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

/**
 * Store de apertura de la paleta de comandos (Cmd-K). Solo gestiona el
 * estado abierto/cerrado; la búsqueda y ejecución viven en el componente
 * `<CommandPalette>`, que se monta una única vez en el shell.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((current) => !current), []);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({ open, openPalette, closePalette, togglePalette }),
    [open, openPalette, closePalette, togglePalette],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

/** Acceso al store de la paleta de comandos; debe usarse bajo `<CommandPaletteProvider>`. */
export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useCommandPalette debe usarse dentro de <CommandPaletteProvider>.",
    );
  }
  return context;
}
