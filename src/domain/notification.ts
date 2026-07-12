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
