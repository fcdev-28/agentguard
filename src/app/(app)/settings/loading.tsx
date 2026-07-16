import styles from "@/components/settings/settings.module.css";

/** Esqueleto de Ajustes mientras se resuelven los datos (convención Next). */
export default function Loading() {
  return (
    <div>
      <div className={styles.skeletonTabs}>
        <div className={styles.skeletonTab} />
        <div className={styles.skeletonTab} />
        <div className={styles.skeletonTab} />
      </div>
      <div className={styles.list}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.row} ${styles.skeletonRow}`}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
          </div>
        ))}
      </div>
    </div>
  );
}
