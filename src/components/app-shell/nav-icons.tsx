import type { NavIconName } from "@/lib/navigation";

/**
 * Iconos de navegación (SVG inline, sin dependencias externas).
 * Trazo de 1.5, heredan `currentColor` para seguir el estado del ítem.
 */
const paths: Record<NavIconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  review: (
    <>
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v9a1.5 1.5 0 0 1-1.5 1.5H16l-4 4-4-4H4.5A1.5 1.5 0 0 1 3 14.5v-9Z" />
      <path d="m8.5 9.5 2.2 2.2 4.3-4.3" />
    </>
  ),
  agents: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M12 3v5M8 13h.01M16 13h.01M9 8h6" />
    </>
  ),
  policies: (
    <>
      <path d="M12 3 5 5.5v5c0 4 2.8 7.3 7 8.5 4.2-1.2 7-4.5 7-8.5v-5L12 3Z" />
      <path d="m9.3 11.5 1.8 1.8 3.6-3.6" />
    </>
  ),
  audit: (
    <>
      <path d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M14 4v5h5M8 13h8M8 16.5h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
};

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
