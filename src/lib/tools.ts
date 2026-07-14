import type { Tool, ToolStatus } from "@/domain";

/**
 * Severidad de cada estado de herramienta para priorizar el listado: las
 * conectadas importan antes que las pausadas, y estas antes que las
 * desconectadas.
 */
const statusRank: Record<ToolStatus, number> = {
  active: 2,
  paused: 1,
  disabled: 0,
};

/** Herramientas para el listado: primero por severidad de estado, luego por nombre. */
export function getTools(tools: Tool[]): Tool[] {
  return [...tools].sort((a, b) => {
    const byStatus = statusRank[b.status] - statusRank[a.status];
    if (byStatus !== 0) return byStatus;
    return a.name.localeCompare(b.name);
  });
}

/** Busca una herramienta por id. */
export function getToolById(tools: Tool[], id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
}
