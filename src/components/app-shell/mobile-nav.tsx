"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isActiveRoute, navItems } from "@/lib/navigation";
import { NavIcon } from "./nav-icons";
import styles from "./mobile-nav.module.css";

/**
 * Navegación en drawer para pantallas pequeñas, donde el sidebar se oculta.
 * Se abre desde la top bar y se cierra al pulsar el fondo, la X, la tecla
 * Escape o al navegar a una ruta.
 */
export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={open ? `${styles.root} ${styles.rootOpen}` : styles.root}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Cerrar navegación"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Navegación"
      >
        <div className={styles.head}>
          <span className={styles.brandName}>AgentGuard</span>
          <button
            type="button"
            className={styles.close}
            aria-label="Cerrar navegación"
            onClick={onClose}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
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
                tabIndex={open ? 0 : -1}
                onClick={onClose}
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
    </div>
  );
}
