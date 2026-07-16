import type { ReactNode } from "react";
import styles from "./layout.module.css";

/**
 * Layout del grupo de autenticación: sin sidebar ni top bar. Solo centra el
 * contenido (por ahora, únicamente `/login`).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={styles.wrapper}>{children}</div>;
}
