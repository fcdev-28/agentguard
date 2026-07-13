import styles from "@/components/dashboard/dashboard.module.css";

/** Esqueleto del dashboard mientras se resuelven los datos (convención Next). */
export default function Loading() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`${styles.block} ${styles.skeletonBlock}`}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      ))}
    </div>
  );
}
