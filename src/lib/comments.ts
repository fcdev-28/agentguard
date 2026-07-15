import type { ActionComment } from "@/domain";

/**
 * Comentarios de una acción concreta, ordenados cronológicamente (más antiguo
 * primero) para reflejar el orden natural de un hilo de conversación.
 */
export function commentsForAction(
  list: ActionComment[],
  actionId: string,
): ActionComment[] {
  return list
    .filter((comment) => comment.actionId === actionId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

/** Un comentario es válido si tiene contenido más allá de espacios en blanco. */
export function isValidCommentBody(body: string): boolean {
  return body.trim().length > 0;
}
