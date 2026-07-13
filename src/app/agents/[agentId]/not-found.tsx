import Link from "next/link";
import { EmptyState } from "@/components/feedback/empty-state";
import styles from "@/components/agents/agents.module.css";

/** Página mostrada cuando el agente solicitado no existe (convención Next). */
export default function AgentNotFound() {
  return (
    <div>
      <EmptyState
        title="Agente no encontrado."
        hint="Puede que se haya eliminado o que el enlace sea incorrecto."
      />
      <Link href="/agents" className={styles.backLink}>
        ← Volver a agentes
      </Link>
    </div>
  );
}
