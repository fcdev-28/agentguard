import Link from "next/link";
import { EmptyState } from "@/components/feedback/empty-state";
import styles from "@/components/audit/audit.module.css";

/** Página mostrada cuando el evento solicitado no existe (convención Next). */
export default function AuditEventNotFound() {
  return (
    <div>
      <EmptyState
        title="Evento no encontrado."
        hint="Puede que se haya eliminado o que el enlace sea incorrecto."
      />
      <Link href="/audit" className={styles.backLink}>
        ← Volver al registro de auditoría
      </Link>
    </div>
  );
}
