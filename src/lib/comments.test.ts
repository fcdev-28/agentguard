import { describe, it, expect } from "vitest";
import { commentsForAction, isValidCommentBody } from "@/lib/comments";
import type { ActionComment } from "@/domain";

/** Construye un comentario de prueba con los campos relevantes. */
function makeComment(overrides: Partial<ActionComment>): ActionComment {
  return {
    id: "cmt_test",
    actionId: "act_test",
    authorId: "usr_test",
    body: "Comentario de prueba",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("commentsForAction", () => {
  it("filtra los comentarios de la acción indicada", () => {
    const comments = [
      makeComment({ id: "cmt_a", actionId: "act_1" }),
      makeComment({ id: "cmt_b", actionId: "act_2" }),
      makeComment({ id: "cmt_c", actionId: "act_1" }),
    ];
    const result = commentsForAction(comments, "act_1");
    expect(result.map((c) => c.id)).toEqual(["cmt_a", "cmt_c"]);
  });

  it("ordena los comentarios ascendentemente por fecha de creación", () => {
    const comments = [
      makeComment({
        id: "cmt_new",
        actionId: "act_1",
        createdAt: "2026-01-03T00:00:00.000Z",
      }),
      makeComment({
        id: "cmt_old",
        actionId: "act_1",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      makeComment({
        id: "cmt_mid",
        actionId: "act_1",
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
    ];
    const result = commentsForAction(comments, "act_1");
    expect(result.map((c) => c.id)).toEqual(["cmt_old", "cmt_mid", "cmt_new"]);
  });

  it("devuelve una lista vacía si la acción no tiene comentarios", () => {
    const comments = [makeComment({ id: "cmt_a", actionId: "act_1" })];
    expect(commentsForAction(comments, "act_sin_comentarios")).toEqual([]);
  });
});

describe("isValidCommentBody", () => {
  it("rechaza una cadena vacía", () => {
    expect(isValidCommentBody("")).toBe(false);
  });

  it("rechaza una cadena con solo espacios", () => {
    expect(isValidCommentBody("   ")).toBe(false);
  });

  it("acepta un texto con contenido", () => {
    expect(isValidCommentBody("Revisado, todo correcto.")).toBe(true);
  });
});
