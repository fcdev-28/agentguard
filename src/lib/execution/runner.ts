import "server-only";

/**
 * Ejecuta acciones `allowed`/`approved` contra la herramienta real y persiste el
 * desenlace (estado, `IntegrationLog`, `AuditEvent`), aplicando la política de
 * reintentos (`retry.ts`). Núcleo compartido `runAttempt` usado por:
 *   - `executeAction`: intento inicial (guard status IN allowed/approved).
 *   - `retryExecution`: reintento de una acción ya reclamada por el cron
 *     `retry-executions` (guard status = failed).
 *
 * Fallo reintentable con reintentos disponibles → `failed` + `nextRetryAt` (el
 * cron lo recogerá). Fallo permanente o agotado → `failed` terminal
 * (`nextRetryAt` nulo). `attempts` solo lo incrementa el claim del cron.
 *
 * Gates: parada de emergencia (`canExecute`) y solo herramientas `email`.
 * Idempotencia del persist: `updateMany` guardado por estado dentro de una
 * transacción interactiva; solo una ejecución concurrente transiciona.
 */
import type { ActionStatus, AgentAction } from "@/domain";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getActionById } from "@/data/actions";
import { applyExecutionResult, toEmailMessage } from "@/lib/execution";
import type { SendResult } from "@/lib/execution";
import { resolveTransport } from "@/lib/execution/transport";
import { canExecute } from "@/lib/emergency";
import { planNextAttempt } from "@/lib/execution/retry";
import { metric } from "@/lib/observability/logger";

type RunResult = { ok: true; status: ActionStatus } | { error: string };

/**
 * Envía la acción y persiste el desenlace. `whereGuard` acota el updateMany
 * terminal (allowed/approved en el inicial, failed en el reintento) para que dos
 * ejecuciones concurrentes no persistan ambas. `currentAttempts` = reintentos ya
 * hechos (0 en el inicial; el valor post-claim en el reintento).
 *
 * Nota: `whereGuard` evita la doble *persistencia*, no el doble *envío*
 * concurrente del camino inline (dos llamadas a `executeAction` pueden mandar
 * el email dos veces antes de que una gane el updateMany); el reintento sí
 * queda cerrado porque el cron `retry-executions` reclama la fila de forma
 * atómica antes de invocar `retryExecution`.
 */
async function runAttempt(
  action: AgentAction,
  currentAttempts: number,
  whereGuard: Prisma.AgentActionWhereInput,
): Promise<RunResult> {
  const org = await prisma.organization.findUnique({
    where: { id: action.organizationId },
    select: { emergencyStop: true },
  });
  if (org && !canExecute(org.emergencyStop)) {
    metric("execution.blocked_emergency", {
      organizationId: action.organizationId,
    });
    return { error: "Parada de emergencia activa: ejecución bloqueada." };
  }

  const tool = await prisma.tool.findUnique({
    where: { id: action.toolId },
    select: { type: true },
  });
  if (tool?.type !== "email") {
    return {
      error: "La herramienta no soporta ejecución real todavía (solo email).",
    };
  }

  const transport = resolveTransport();
  const message = toEmailMessage(action);
  const result: SendResult = message.to
    ? await transport.send(message)
    : {
        ok: false,
        error: "El email no tiene destinatario (payload.to).",
        retryable: false,
      };

  const succeeded = result.ok;
  const plan = succeeded
    ? null
    : planNextAttempt(currentAttempts, result.retryable ?? false, new Date());
  const nextRetryAt = plan && plan.kind === "retry" ? plan.nextRetryAt : null;

  const persisted = await prisma.$transaction(async (tx) => {
    const res = await tx.agentAction.updateMany({
      where: { id: action.id, ...whereGuard },
      data: {
        status: succeeded ? "executed" : "failed",
        executedAt: succeeded ? new Date() : null,
        nextRetryAt,
        lastError: succeeded ? null : (result.error ?? "unknown"),
      },
    });
    if (res.count === 0) return false;

    await tx.integrationLog.create({
      data: {
        actionId: action.id,
        toolType: "email",
        transport: transport.name,
        status: succeeded ? "succeeded" : "failed",
        detail: succeeded
          ? (result.providerId ?? null)
          : (result.error ?? null),
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: action.organizationId,
        agentId: action.agentId,
        actionId: action.id,
        eventType: succeeded ? "action_executed" : "action_failed",
        message: succeeded
          ? "Acción ejecutada contra la herramienta."
          : nextRetryAt
            ? "La ejecución falló; reintento programado."
            : "La ejecución de la acción falló definitivamente.",
        metadata: {
          transport: transport.name,
          ...(nextRetryAt
            ? { retryScheduledFor: nextRetryAt.toISOString() }
            : {}),
        },
      },
    });
    return true;
  });

  if (!persisted) {
    return { error: "La acción ya fue procesada por otra ejecución." };
  }

  if (succeeded) {
    metric("action.executed", { toolType: "email", transport: transport.name });
  } else if (nextRetryAt) {
    metric("action.retry_scheduled", {
      toolType: "email",
      transport: transport.name,
      attempt: currentAttempts + 1,
    });
  } else {
    metric("action.failed", {
      toolType: "email",
      transport: transport.name,
      reason: result.error ?? "unknown",
    });
  }

  return { ok: true, status: succeeded ? "executed" : "failed" };
}

/** Intento inicial de ejecución de una acción `allowed`/`approved`. */
export async function executeAction(actionId: string): Promise<RunResult> {
  const action = await getActionById(actionId);
  if (!action) return { error: "La acción no existe." };

  // Verifica el estado antes de gastar el envío.
  const guard = applyExecutionResult(action.status, { ok: true });
  if ("error" in guard) return guard;

  return runAttempt(action, 0, { status: { in: ["allowed", "approved"] } });
}

/**
 * Reintenta una acción ya reclamada por el cron `retry-executions` (status=failed,
 * attempts ya incrementado, nextRetryAt limpiado). No aplica el guard
 * allowed/approved; el guard del persist es status=failed.
 */
export async function retryExecution(actionId: string): Promise<RunResult> {
  const action = await getActionById(actionId);
  if (!action) return { error: "La acción no existe." };

  const row = await prisma.agentAction.findUnique({
    where: { id: actionId },
    select: { attempts: true },
  });
  if (!row) return { error: "La acción no existe." };

  return runAttempt(action, row.attempts, { status: "failed" });
}
