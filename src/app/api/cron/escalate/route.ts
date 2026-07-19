/**
 * Barrido de auto-escalado por SLA. Un scheduler externo (Vercel Cron, GitHub
 * Actions o curl) lo invoca periódicamente con `Authorization: Bearer
 * $CRON_SECRET`. Escala las acciones `needs_approval` vencidas a `escalated` y
 * registra un `AuditEvent`. Idempotente: solo mira `needs_approval`.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getActions } from "@/data/actions";
import { findOverdue } from "@/lib/sla";
import { metric } from "@/lib/observability/logger";
import { notify } from "@/lib/notify/notify";

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const actions = await getActions();
  const overdue = findOverdue(actions, new Date());
  if (overdue.length === 0) {
    return NextResponse.json({ escalated: 0 });
  }

  const byId = new Map(actions.map((a) => [a.id, a]));
  const escalatedIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const id of overdue) {
      const res = await tx.agentAction.updateMany({
        where: { id, status: "needs_approval" },
        data: { status: "escalated" },
      });
      if (res.count === 0) continue; // salió de needs_approval en la ventana de carrera
      escalatedIds.push(id);
      const a = byId.get(id)!;
      await tx.auditEvent.create({
        data: {
          organizationId: a.organizationId,
          agentId: a.agentId,
          actionId: id,
          eventType: "action_escalated",
          message: "Acción escalada automáticamente por vencimiento de SLA.",
          metadata: { reason: "sla_overdue" },
        },
      });
    }
  });

  metric("action.escalated", { count: escalatedIds.length });

  // Notificar fuera de la transacción (I/O de red no debe alargar el commit).
  for (const id of escalatedIds) {
    const a = byId.get(id)!;
    await notify({
      type: "action_escalated",
      organizationId: a.organizationId,
      actionId: id,
      message: `Acción escalada automáticamente por vencimiento de SLA: ${a.title}.`,
    });
  }

  return NextResponse.json({ escalated: escalatedIds.length });
}
