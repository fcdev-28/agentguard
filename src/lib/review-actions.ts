"use server";

/**
 * Server actions de escritura de `/review`: persisten en BD las decisiones
 * humanas (decidir, decidir en lote, escalar) y los comentarios. Envuelven la
 * lógica pura de `@/lib/review` (`applyDecision`) — no la duplican — y son la
 * única vía de mutación: los stores efímeros que había antes se eliminan.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session-db";
import { applyDecision, type ReviewDecision } from "@/lib/review";
import { isValidCommentBody } from "@/lib/comments";

/** Decisiones que se toman explícitamente (el escalado tiene su propia action). */
type DirectDecision = Exclude<ReviewDecision, "escalated">;

/** Resultado uniforme de una mutación: éxito o motivo por el que no procede. */
type ActionResult = { ok: true } | { error: string };

/** Revalida la cola y el detalle tras cualquier mutación de revisión. */
function revalidateReview(): void {
  revalidatePath("/review");
  revalidatePath("/review/[actionId]", "page");
}

/** Decide sobre una acción pendiente: persiste la `Approval` y actualiza su status. */
export async function decideAction(
  actionId: string,
  decision: DirectDecision,
  reason: string | null,
): Promise<ActionResult> {
  const user = await getCurrentUser();

  const action = await prisma.agentAction.findUnique({
    where: { id: actionId },
    select: { status: true },
  });
  if (!action) {
    return { error: "La acción no existe." };
  }

  const result = applyDecision(action.status, decision, reason);
  if ("error" in result) {
    return result;
  }

  await prisma.$transaction([
    prisma.approval.upsert({
      where: { actionId },
      create: { actionId, reviewerId: user.id, decision, reason },
      update: { reviewerId: user.id, decision, reason },
    }),
    prisma.agentAction.update({
      where: { id: actionId },
      data: { status: result.status },
    }),
  ]);

  revalidateReview();
  return { ok: true };
}

/**
 * Decide en lote sobre varias acciones. Las que ya no estén pendientes (o no
 * cumplan la validación) se omiten sin romper el resto del lote; si ninguna
 * es válida, es un no-op que igualmente devuelve éxito.
 */
export async function decideManyActions(
  actionIds: string[],
  decision: DirectDecision,
  reason: string | null,
): Promise<ActionResult> {
  const user = await getCurrentUser();

  const actions = await prisma.agentAction.findMany({
    where: { id: { in: actionIds } },
    select: { id: true, status: true },
  });

  const operations = actions.flatMap((action) => {
    const result = applyDecision(action.status, decision, reason);
    if ("error" in result) return [];
    return [
      prisma.approval.upsert({
        where: { actionId: action.id },
        create: { actionId: action.id, reviewerId: user.id, decision, reason },
        update: { reviewerId: user.id, decision, reason },
      }),
      prisma.agentAction.update({
        where: { id: action.id },
        data: { status: result.status },
      }),
    ];
  });

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  revalidateReview();
  return { ok: true };
}

/**
 * Escala una acción pendiente. El destinatario del escalado no se persiste:
 * ni `AgentAction` ni `Approval` tienen un campo para ello (fuera de alcance,
 * ver spec de escrituras de /review).
 */
export async function escalateAction(actionId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  const action = await prisma.agentAction.findUnique({
    where: { id: actionId },
    select: { status: true },
  });
  if (!action) {
    return { error: "La acción no existe." };
  }

  const result = applyDecision(action.status, "escalated", null);
  if ("error" in result) {
    return result;
  }

  await prisma.$transaction([
    prisma.approval.upsert({
      where: { actionId },
      create: {
        actionId,
        reviewerId: user.id,
        decision: "escalated",
        reason: null,
      },
      update: { reviewerId: user.id, decision: "escalated", reason: null },
    }),
    prisma.agentAction.update({
      where: { id: actionId },
      data: { status: result.status },
    }),
  ]);

  revalidateReview();
  return { ok: true };
}

/** Añade un comentario al hilo de una acción. */
export async function addComment(
  actionId: string,
  body: string,
): Promise<ActionResult> {
  if (!isValidCommentBody(body)) {
    return { error: "El comentario no puede estar vacío." };
  }

  const user = await getCurrentUser();
  await prisma.actionComment.create({
    data: { actionId, authorId: user.id, body: body.trim() },
  });

  revalidateReview();
  return { ok: true };
}
