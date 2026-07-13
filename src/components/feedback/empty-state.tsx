import styles from "./empty-state.module.css";

/** Estado vacío breve: un título y una pista opcional. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
