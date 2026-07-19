import type { NotificationType, UserRole } from "@/domain";

/** Evento de dominio que dispara una notificación multicanal. */
export interface NotificationEvent {
  type: NotificationType;
  organizationId: string;
  /** Acción implicada, o `null` si el evento no tiene una (p. ej. parada de emergencia). */
  actionId: string | null;
  /** Texto ya redactado en castellano, listo para mostrar/enviar. */
  message: string;
}

/**
 * Roles que reciben cada tipo de evento por in-app y email. Slack no usa esto:
 * publica un único mensaje por evento en el canal de operaciones.
 */
export const RECIPIENT_ROLES: Record<NotificationType, readonly UserRole[]> = {
  approval_requested: ["reviewer", "admin"],
  action_escalated: ["admin"],
  agent_error: ["developer", "admin"],
  emergency_stop: ["admin"],
};
