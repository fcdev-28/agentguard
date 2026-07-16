"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { Notification } from "@/domain";
import { notificationTypeLabel } from "@/domain";
import { formatRelativeTime } from "@/lib/format";
import { unreadCount } from "@/lib/notifications";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-actions";
import { EmptyState } from "@/components/feedback/empty-state";
import styles from "./notification-bell.module.css";

/** Actualización optimista aplicada mientras la mutación real viaja al servidor. */
type ReadUpdate = { kind: "one"; id: string } | { kind: "all" };

/** Marca `readAt` en la notificación indicada, o en todas las que sigan sin leer. */
function applyReadUpdate(
  state: Notification[],
  update: ReadUpdate,
): Notification[] {
  const at = new Date().toISOString();
  if (update.kind === "one") {
    return state.map((notification) =>
      notification.id === update.id && notification.readAt === null
        ? { ...notification, readAt: at }
        : notification,
    );
  }
  return state.map((notification) =>
    notification.readAt === null
      ? { ...notification, readAt: at }
      : notification,
  );
}

/**
 * Campana de notificaciones de la top bar: badge con el contador de no
 * leídas y un popover anclado con el listado. El cierre usa un backdrop
 * transparente a pantalla completa (mismo patrón que `<MobileNav>` y
 * `<CommandPalette>`) para capturar el clic fuera del panel sin depender de
 * un listener manual de click-outside. Las notificaciones llegan como prop
 * desde el layout raíz (server); marcar como leída es optimista mientras la
 * server action persiste el cambio real.
 */
export function NotificationBell({
  notifications,
}: {
  notifications: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, applyOptimisticRead] = useOptimistic(
    notifications,
    applyReadUpdate,
  );
  const unread = unreadCount(items);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Mueve el foco al panel al abrirlo, para que Escape y la navegación por
  // teclado funcionen sin depender de dónde estuviera el foco antes.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  function selectNotification(id: string, actionId: string | null) {
    startTransition(async () => {
      applyOptimisticRead({ kind: "one", id });
      await markNotificationRead(id);
    });
    if (actionId) {
      setOpen(false);
      router.push(`/review/${actionId}`);
    }
  }

  function markAllAsRead() {
    startTransition(async () => {
      applyOptimisticRead({ kind: "all" });
      await markAllNotificationsRead();
    });
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.bell}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"
        }
        onClick={() => setOpen((value) => !value)}
      >
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
          <path d="M6 9a6 6 0 0 1 12 0c0 4 1.4 5.6 2 6.5a1 1 0 0 1-.9 1.5H4.9A1 1 0 0 1 4 15.5c.6-.9 2-2.5 2-6.5Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 ? (
          <span className={styles.badge} aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Cerrar notificaciones"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Notificaciones"
            tabIndex={-1}
          >
            <div className={styles.head}>
              <span className={styles.title}>Notificaciones</span>
              <button
                type="button"
                className={styles.markAll}
                disabled={unread === 0}
                onClick={markAllAsRead}
              >
                Marcar todas como leídas
              </button>
            </div>

            {items.length === 0 ? (
              <EmptyState title="No tienes notificaciones." />
            ) : (
              <ul className={styles.list}>
                {items.map((notification) => {
                  const isUnread = notification.readAt === null;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        className={
                          isUnread
                            ? `${styles.item} ${styles.itemUnread}`
                            : styles.item
                        }
                        onClick={() =>
                          selectNotification(
                            notification.id,
                            notification.actionId,
                          )
                        }
                      >
                        <span className={styles.itemDot} aria-hidden="true" />
                        <span className={styles.itemBody}>
                          <span className={styles.itemMessage}>
                            {notification.message}
                          </span>
                          <span className={styles.itemMeta}>
                            {notificationTypeLabel[notification.type]} ·{" "}
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
