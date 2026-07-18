/**
 * Barrido de reintentos de ejecución. Un scheduler externo (Vercel Cron, GitHub
 * Actions o curl) lo invoca periódicamente (p. ej. cada minuto) con
 * `Authorization: Bearer $CRON_SECRET`. Reclama por-id las acciones `failed` con
 * `nextRetryAt` vencido y reintenta su ejecución. El claim (updateMany guardado)
 * sube `attempts` y limpia `nextRetryAt` antes de reenviar, así dos barridos
 * concurrentes no reintentan la misma acción (idempotencia del reintento).
 *
 * Single-tenant: no filtra por organización (misma deuda documentada que el cron
 * `escalate`; cerrar con auth multi-org).
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { retryExecution } from "@/lib/execution/runner";
import { MAX_RETRIES } from "@/lib/execution/retry";
import { logger, metric } from "@/lib/observability/logger";

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

  const now = new Date();
  const candidates = await prisma.agentAction.findMany({
    where: {
      status: "failed",
      nextRetryAt: { lte: now },
      attempts: { lt: MAX_RETRIES },
    },
    select: { id: true },
  });
  if (candidates.length === 0) {
    return NextResponse.json({ retried: 0 });
  }

  let retried = 0;
  for (const { id } of candidates) {
    // Claim por-id: solo un barrido reclama cada acción.
    const claim = await prisma.agentAction.updateMany({
      where: {
        id,
        status: "failed",
        nextRetryAt: { lte: now },
        attempts: { lt: MAX_RETRIES },
      },
      data: { attempts: { increment: 1 }, nextRetryAt: null },
    });
    if (claim.count === 0) continue; // otra ejecución la reclamó
    retried += 1;
    try {
      await retryExecution(id);
    } catch (err) {
      logger.error("Fallo al reintentar la ejecución", {
        actionId: id,
        err: String(err),
      });
    }
  }

  metric("action.retry_swept", { count: retried });
  return NextResponse.json({ retried });
}
