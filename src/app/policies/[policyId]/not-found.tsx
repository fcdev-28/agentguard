import Link from "next/link";
import { EmptyState } from "@/components/feedback/empty-state";
import styles from "@/components/policies/policies.module.css";

/** Página mostrada cuando la política solicitada no existe (convención Next). */
export default function PolicyNotFound() {
  return (
    <div>
      <EmptyState
        title="Política no encontrada."
        hint="Puede que se haya eliminado o que el enlace sea incorrecto."
      />
      <Link href="/policies" className={styles.backLink}>
        ← Volver a políticas
      </Link>
    </div>
  );
}
