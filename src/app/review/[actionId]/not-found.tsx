import Link from "next/link";
import { EmptyState } from "@/components/feedback/empty-state";
import styles from "@/components/review/review.module.css";

/** Página mostrada cuando la acción solicitada no existe (convención Next). */
export default function ActionNotFound() {
  return (
    <div>
      <EmptyState
        title="Acción no encontrada."
        hint="Puede que se haya eliminado o que el enlace sea incorrecto."
      />
      <Link href="/review" className={styles.backLink}>
        ← Volver a la cola
      </Link>
    </div>
  );
}
