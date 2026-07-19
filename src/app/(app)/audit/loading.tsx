import styles from "@/components/audit/audit.module.css";

/** Esqueleto de la línea de tiempo mientras se resuelven los datos (convención Next). */
export default function Loading() {
  return (
    <div className={styles.layout}>
      <div className={styles.timelinePane}>
        <div className={styles.timeline}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.row} ${styles.skeletonRow}`}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
