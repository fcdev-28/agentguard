import styles from "@/components/review/review.module.css";

/** Esqueleto de la cola de revisión mientras se resuelven los datos (convención Next). */
export default function Loading() {
  return (
    <div className={styles.queue}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`${styles.row} ${styles.skeletonRow}`}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      ))}
    </div>
  );
}
