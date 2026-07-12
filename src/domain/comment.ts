/**
 * Comentario de un usuario en el hilo de una acción (ver docs/FEATURES.md).
 * No sustituye al `reason` obligatorio de una Approval; solo añade contexto.
 */
export interface ActionComment {
  id: string;
  actionId: string;
  authorId: string;
  body: string;
  createdAt: string;
}
