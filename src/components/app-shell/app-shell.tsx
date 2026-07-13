import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import styles from "./app-shell.module.css";

/**
 * Shell de aplicación: estructura común a todas las pantallas del producto.
 * Compone la navegación lateral y la región de contenido. La top bar y el
 * comportamiento responsive se añaden en pasos posteriores de la fase.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
