import type { UserStatus } from "@/domain";
import type { StatusTagVariant } from "@/components/data-display/status-tag";

/**
 * Variante del tag por estado de usuario. `invited` es hold: la invitación
 * está parada esperando a que una persona la acepte, igual que un agente
 * pausado espera a que alguien lo reanude.
 */
export const userStatusVariant: Record<UserStatus, StatusTagVariant> = {
  active: "neutral",
  invited: "hold",
  disabled: "neutral",
};
