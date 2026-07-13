"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveRoute, navItems } from "@/lib/navigation";
import { NavIcon } from "./nav-icons";
import styles from "./sidebar.module.css";

/**
 * Navegación lateral del shell (desktop). En móvil se oculta por CSS y su
 * contenido se ofrece a través del drawer de la top bar.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <svg
          className={styles.brandMark}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 2 4 5v6c0 4.5 3.2 8.3 8 9.5 4.8-1.2 8-5 8-9.5V5l-8-3Z"
            fill="currentColor"
            fillOpacity="0.12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="m9 12 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.brandName}>AgentGuard</span>
      </div>

      <nav className={styles.nav} aria-label="Navegación principal">
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active ? `${styles.link} ${styles.linkActive}` : styles.link
              }
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.icon}>
                <NavIcon name={item.icon} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
