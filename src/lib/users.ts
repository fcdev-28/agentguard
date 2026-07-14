import type { User, UserRole, UserStatus } from "@/domain";

/**
 * Severidad de cada estado de usuario para priorizar el listado: los
 * activos importan antes que los invitados, y estos antes que los
 * deshabilitados.
 */
const statusRank: Record<UserStatus, number> = {
  active: 2,
  invited: 1,
  disabled: 0,
};

/** Usuarios para el listado: primero por severidad de estado, luego por nombre. */
export function getUsers(users: User[]): User[] {
  return [...users].sort((a, b) => {
    const byStatus = statusRank[b.status] - statusRank[a.status];
    if (byStatus !== 0) return byStatus;
    return a.name.localeCompare(b.name);
  });
}

/** Busca un usuario por id. */
export function getUserById(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id);
}

/**
 * Descripción de lo que puede hacer cada rol en AgentGuard. Es solo texto
 * informativo (para la pantalla de Ajustes), no define permisos reales.
 */
export const roleCapabilities: Record<UserRole, string[]> = {
  admin: [
    "Configura la organización y sus datos generales.",
    "Conecta y da de baja agentes y herramientas.",
    "Define permisos y políticas que rigen las acciones de los agentes.",
  ],
  reviewer: [
    "Revisa la cola de acciones pendientes de aprobación.",
    "Aprueba, rechaza o escala acciones según su riesgo y contexto.",
    "Necesita ver el riesgo y la justificación de cada acción en segundos.",
  ],
  auditor: [
    "Consulta el histórico completo de actividad de la organización.",
    "Revisa evidencias y el detalle de cada evento de auditoría.",
    "Sigue los cambios de configuración relevantes a lo largo del tiempo.",
  ],
  developer: [
    "Integra agentes y herramientas con el resto de sistemas.",
    "Consulta payloads y errores de integración para depurar acciones.",
  ],
};
