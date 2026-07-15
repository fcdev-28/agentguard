"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Notification } from "@/domain";
import { notifications as seedNotifications } from "@/data/demo-data";
import { currentUser } from "@/lib/session";
import { notificationsForUser, unreadCount } from "@/lib/notifications";

/** Notificaciones semilla del usuario en sesión, ya ordenadas por fecha. */
const seedItems = notificationsForUser(seedNotifications, currentUser.id);

interface NotificationContextValue {
  items: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

/**
 * Store efímero (no persistido) de las notificaciones in-app del usuario en
 * sesión. El `readAt` del seed es inmutable, así que el store mantiene en
 * memoria un override de ids marcados como leídos y lo aplica al listar; al
 * llegar la persistencia real (fase 10) se sustituye por lecturas y
 * mutaciones contra la base de datos.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [readOverrides, setReadOverrides] = useState<Record<string, string>>(
    {},
  );

  const value = useMemo<NotificationContextValue>(() => {
    const items = seedItems.map((notification) =>
      notification.readAt === null && readOverrides[notification.id]
        ? { ...notification, readAt: readOverrides[notification.id] }
        : notification,
    );

    function markAsRead(id: string) {
      setReadOverrides((overrides) =>
        overrides[id]
          ? overrides
          : { ...overrides, [id]: new Date().toISOString() },
      );
    }

    function markAllAsRead() {
      const at = new Date().toISOString();
      setReadOverrides((overrides) => {
        const next = { ...overrides };
        for (const notification of seedItems) {
          if (notification.readAt === null && !next[notification.id]) {
            next[notification.id] = at;
          }
        }
        return next;
      });
    }

    return {
      items,
      unreadCount: unreadCount(items),
      markAsRead,
      markAllAsRead,
    };
  }, [readOverrides]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/** Acceso al store de notificaciones; debe usarse bajo `<NotificationProvider>` (montado en el layout raíz). */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications debe usarse dentro de <NotificationProvider>.",
    );
  }
  return context;
}
