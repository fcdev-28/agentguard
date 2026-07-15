import type { Agent, AgentAction, Policy } from "@/domain";
import { navItems, type NavIconName } from "@/lib/navigation";

/** Máximo de resultados por entidad, para no saturar la paleta de comandos. */
const MAX_RESULTS_PER_ENTITY = 5;

/** Comando de navegación a una ruta del producto. */
export interface NavigationCommandItem {
  kind: "navigation";
  id: string;
  label: string;
  href: string;
  icon: NavIconName;
}

/** Comando de resultado de búsqueda: agente, acción o política. */
export interface SearchResultCommandItem {
  kind: "agent" | "action" | "policy";
  id: string;
  label: string;
  hint: string;
  href: string;
}

/** Tipos de acción rápida disponibles en la paleta (ver `command-palette.tsx`). */
export type QuickActionType =
  | "engage_emergency_stop"
  | "release_emergency_stop"
  | "approve_open_action"
  | "reject_open_action";

/**
 * Comando de acción rápida: no navega, se ejecuta contra los stores runtime.
 * Se construye en el componente (depende de estado en vivo), no aquí.
 */
export interface QuickActionCommandItem {
  kind: "quick-action";
  id: string;
  label: string;
  quickAction: QuickActionType;
}

/** Ítem que puede mostrar la paleta de comandos. */
export type CommandItem =
  NavigationCommandItem | SearchResultCommandItem | QuickActionCommandItem;

/** Datos de dominio sobre los que la paleta puede buscar. */
export interface CommandPaletteData {
  agents: Agent[];
  actions: AgentAction[];
  policies: Policy[];
}

/** ¿El texto contiene el query, ignorando mayúsculas/minúsculas? */
function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/** Comandos de navegación a partir de `navItems`, base fija de la paleta. */
function navigationItems(): NavigationCommandItem[] {
  return navItems.map((item) => ({
    kind: "navigation",
    id: `nav-${item.href}`,
    label: item.label,
    href: item.href,
    icon: item.icon,
  }));
}

function searchAgents(
  query: string,
  agents: Agent[],
): SearchResultCommandItem[] {
  return agents
    .filter(
      (agent) =>
        matchesQuery(agent.id, query) ||
        matchesQuery(agent.name, query) ||
        matchesQuery(agent.description, query),
    )
    .slice(0, MAX_RESULTS_PER_ENTITY)
    .map((agent) => ({
      kind: "agent",
      id: `agent-${agent.id}`,
      label: agent.name,
      hint: agent.description,
      href: `/agents/${agent.id}`,
    }));
}

function searchActions(
  query: string,
  actions: AgentAction[],
): SearchResultCommandItem[] {
  return actions
    .filter(
      (action) =>
        matchesQuery(action.id, query) ||
        matchesQuery(action.title, query) ||
        matchesQuery(action.summary, query),
    )
    .slice(0, MAX_RESULTS_PER_ENTITY)
    .map((action) => ({
      kind: "action",
      id: `action-${action.id}`,
      label: action.title,
      hint: action.summary,
      href: `/review/${action.id}`,
    }));
}

function searchPolicies(
  query: string,
  policies: Policy[],
): SearchResultCommandItem[] {
  return policies
    .filter(
      (policy) =>
        matchesQuery(policy.id, query) ||
        matchesQuery(policy.name, query) ||
        matchesQuery(policy.description, query),
    )
    .slice(0, MAX_RESULTS_PER_ENTITY)
    .map((policy) => ({
      kind: "policy",
      id: `policy-${policy.id}`,
      label: policy.name,
      hint: policy.description,
      href: `/policies/${policy.id}`,
    }));
}

/**
 * Calcula los comandos a mostrar para un query dado. Con query vacío
 * devuelve solo la navegación base, sin resultados de búsqueda. Con texto,
 * busca por substring case-insensitive en id y los campos de texto propios
 * de cada entidad (más el label de navegación), limitando el número de
 * resultados por entidad para no saturar la paleta.
 */
export function searchCommands(
  query: string,
  data: CommandPaletteData,
): CommandItem[] {
  const trimmed = query.trim();
  if (!trimmed) return navigationItems();

  return [
    ...navigationItems().filter((item) => matchesQuery(item.label, trimmed)),
    ...searchAgents(trimmed, data.agents),
    ...searchActions(trimmed, data.actions),
    ...searchPolicies(trimmed, data.policies),
  ];
}
