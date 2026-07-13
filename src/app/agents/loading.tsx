import styles from "@/components/agents/agents.module.css";

/** Esqueleto de la lista de agentes mientras se resuelven los datos (convención Next). */
export default function Loading() {
  return (
    <div className={styles.list}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`${styles.row} ${styles.skeletonRow}`}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      ))}
    </div>
  );
}
