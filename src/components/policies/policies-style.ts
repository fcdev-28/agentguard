import type { Policy } from "@/domain";
import styles from "./policies.module.css";

/** Etiqueta visible en castellano para cada estado de política. */
export const policyStatusLabel: Record<Policy["status"], string> = {
  active: "Activa",
  draft: "Borrador",
  archived: "Archivada",
};

/** Clase de color por estado de política, coherente entre el listado y el detalle. */
export const policyStatusClass: Record<Policy["status"], string> = {
  active: styles.statusActive,
  draft: styles.statusDraft,
  archived: styles.statusArchived,
};

/** Clase de color por efecto de política, de menos a más severo. */
export const policyEffectClass: Record<Policy["effect"], string> = {
  allow: styles.effectAllow,
  require_approval: styles.effectRequireApproval,
  escalate: styles.effectEscalate,
  block: styles.effectBlock,
};
