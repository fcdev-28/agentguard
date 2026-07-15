/** Aviso in-app dirigido a un usuario (ver docs/FEATURES.md). */
export type NotificationType =
  "approval_requested" | "action_escalated" | "agent_error" | "emergency_stop";

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  actionId: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
}

/** Etiqueta visible en castellano para cada tipo de notificación. */
export const notificationTypeLabel: Record<NotificationType, string> = {
  approval_requested: "Aprobación solicitada",
  action_escalated: "Acción escalada",
  agent_error: "Error de agente",
  emergency_stop: "Parada de emergencia",
};
