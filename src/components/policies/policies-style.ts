import type { Policy } from "@/domain";
import type { StatusTagVariant } from "@/components/data-display/status-tag";

/** Etiqueta visible en castellano para cada estado de política. */
export const policyStatusLabel: Record<Policy["status"], string> = {
  active: "Activa",
  draft: "Borrador",
  archived: "Archivada",
};

/**
 * El estado de una política no interrumpe a nadie: activa, borrador y
 * archivada son condiciones de fondo, no avisos. Todas neutras.
 */
export const policyStatusVariant: Record<Policy["status"], StatusTagVariant> = {
  active: "neutral",
  draft: "neutral",
  archived: "neutral",
};

/**
 * Solo llevan color los efectos que acaban parando a una persona:
 * require_approval y escalate son los que producen los estados
 * needs_approval y escalated, que es lo que hold señala en el resto del
 * producto. `block` se queda neutro — la política corta la acción sola, sin
 * pedirle nada a nadie.
 */
export const policyEffectVariant: Record<Policy["effect"], StatusTagVariant> = {
  allow: "neutral",
  require_approval: "hold",
  escalate: "hold",
  block: "neutral",
};
