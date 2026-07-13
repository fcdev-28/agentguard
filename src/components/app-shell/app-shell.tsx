import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import styles from "./app-shell.module.css";

/**
 * Shell de aplicación: estructura común a todas las pantallas del producto.
 * Compone la navegación lateral, la cabecera y la región de contenido. El
 * comportamiento responsive se añade en el paso siguiente de la fase.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <TopBar />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
