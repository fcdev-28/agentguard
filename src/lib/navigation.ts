/**
 * Definición única de la navegación del producto.
 * El shell (sidebar y drawer móvil) se construye a partir de esta lista, así
 * que añadir o reordenar rutas se hace en un solo sitio.
 */
export type NavIconName =
  "dashboard" | "review" | "agents" | "policies" | "audit" | "settings";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Panel", icon: "dashboard" },
  { href: "/review", label: "Revisión", icon: "review" },
  { href: "/agents", label: "Agentes", icon: "agents" },
  { href: "/policies", label: "Políticas", icon: "policies" },
  { href: "/audit", label: "Auditoría", icon: "audit" },
  { href: "/settings", label: "Ajustes", icon: "settings" },
];

/**
 * Marca activo el ítem cuya ruta coincide con la actual. Para las rutas con
 * subrutas (p. ej. `/review/[actionId]`) el ítem padre sigue activo; `/` solo
 * está activo en la raíz exacta.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
