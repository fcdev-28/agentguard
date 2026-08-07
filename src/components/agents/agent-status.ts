import type { Agent } from "@/domain";
import type { StatusTagVariant } from "@/components/data-display/status-tag";

/**
 * Variante del tag por estado de agente. `paused` es hold, no neutral: un
 * agente pausado está parado esperando que alguien lo reanude, que es lo
 * mismo que la barra de parada señala en una acción. `disabled` sí es
 * neutral — está apagado por decisión ya tomada, no espera nada.
 */
export const agentStatusVariant: Record<Agent["status"], StatusTagVariant> = {
  active: "neutral",
  paused: "hold",
  disabled: "neutral",
  error: "fault",
};
