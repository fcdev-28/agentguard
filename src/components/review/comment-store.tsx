"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ActionComment } from "@/domain";
import { currentUser } from "@/lib/session";
import { commentsForAction, isValidCommentBody } from "@/lib/comments";

interface CommentContextValue {
  getComments: (actionId: string) => ActionComment[];
  addComment: (actionId: string, body: string) => void;
}

const CommentContext = createContext<CommentContextValue | null>(null);

/**
 * Store efímero (no persistido) del hilo de comentarios de las acciones. Los
 * comentarios iniciales llegan del layout raíz (Prisma) y son inmutables; el
 * store mantiene en memoria los añadidos en la sesión y los combina con los
 * iniciales al listar; al llegar la persistencia real (fase 10) se sustituye
 * por lecturas y mutaciones contra la base de datos.
 */
export function CommentProvider({
  children,
  initialComments,
}: {
  children: ReactNode;
  initialComments: ActionComment[];
}) {
  const [added, setAdded] = useState<ActionComment[]>([]);

  const value = useMemo<CommentContextValue>(() => {
    function getComments(actionId: string): ActionComment[] {
      return commentsForAction([...initialComments, ...added], actionId);
    }

    function addComment(actionId: string, body: string) {
      if (!isValidCommentBody(body)) return;
      // El id se deriva de `current` (no del closure) para que dos envíos
      // seguidos no generen la misma key antes de re-renderizar.
      setAdded((current) => [
        ...current,
        {
          id: `cmt_local_${current.length + 1}`,
          actionId,
          authorId: currentUser.id,
          body: body.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    return { getComments, addComment };
  }, [added, initialComments]);

  return (
    <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
  );
}

/** Acceso al store de comentarios; debe usarse bajo `<CommentProvider>` (montado en el layout raíz). */
export function useComments(): CommentContextValue {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error("useComments debe usarse dentro de <CommentProvider>.");
  }
  return context;
}
