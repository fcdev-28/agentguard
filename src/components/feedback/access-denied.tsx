import Link from "next/link";
import styles from "./access-denied.module.css";

/**
 * Estado 403 reutilizable: se renderiza en vez de romper cuando el rol del
 * usuario en sesión no alcanza para ver una pantalla (p. ej. `/settings`
 * sin `settings:manage`). Solo UX: la frontera real de autorización ya
 * rechazó la mutación o el guard de página que renderiza este componente.
 */
export function AccessDenied({
  title = "No tienes acceso a esta sección.",
  description,
  href = "/",
  hrefLabel = "Volver al panel de control",
}: {
  title?: string;
  description: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className={styles.denied} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      <Link href={href} className={styles.link}>
        {hrefLabel}
      </Link>
    </div>
  );
}
