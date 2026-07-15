"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ActionComment } from "@/domain";
import { actionComments as seedComments } from "@/data/demo-data";
import { currentUser } from "@/lib/session";
import { commentsForAction, isValidCommentBody } from "@/lib/comments";

interface CommentContextValue {
  getComments: (actionId: string) => ActionComment[];
  addComment: (actionId: string, body: string) => void;
}

const CommentContext = createContext<CommentContextValue | null>(null);

/**
 * Store efímero (no persistido) del hilo de comentarios de las acciones. El
 * seed es inmutable, así que el store mantiene en memoria los comentarios
 * añadidos en la sesión y los combina con el seed al listar; al llegar la
 * persistencia real (fase 10) se sustituye por lecturas y mutaciones contra
 * la base de datos.
 */
export function CommentProvider({ children }: { children: ReactNode }) {
  const [added, setAdded] = useState<ActionComment[]>([]);

  const value = useMemo<CommentContextValue>(() => {
    function getComments(actionId: string): ActionComment[] {
      return commentsForAction([...seedComments, ...added], actionId);
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
  }, [added]);

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
