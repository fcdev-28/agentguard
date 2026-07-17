import "server-only";

/**
 * Ejecuta una acción `allowed` o `approved` contra la herramienta real y
 * persiste el desenlace: estado (`executed`/`failed`), `IntegrationLog` como
 * evidencia y `AuditEvent`. Nunca deja la acción colgada: cualquier fallo del
 * transporte se registra como `failed` (reintentos = fase 13).
 *
 * Gates antes de ejecutar:
 * - Parada de emergencia de la organización (`canExecute`): si está activa,
 *   se bloquea sin tocar la herramienta ni la BD.
 * - Fase 12 solo soporta email: si la tool no es de tipo `email` no se
 *   reclama ejecución (evitaría dejar evidencia de auditoría falsa para
 *   refunds/updates/etc. que aún no se ejecutan de verdad).
 *
 * Idempotencia: el `update` de estado usa una guarda (`status IN
 * (allowed, approved)`) dentro de una transacción interactiva, así que si dos
 * ejecuciones compiten, solo una transiciona el estado y escribe
 * IntegrationLog/AuditEvent. Nota: esto no evita el reenvío del email si dos
 * llamadas concurrentes llegan a `transport.send` antes de que la BD arbitre
 * quién gana; la idempotencia del envío en sí (dedupe antes de enviar,
 * outbox/claim) queda para fase 13.
 */
import type { ActionStatus } from "@/domain";
import { prisma } from "@/lib/prisma";
import { getActionById } from "@/data/actions";
import { applyExecutionResult, toEmailMessage } from "@/lib/execution";
import { resolveTransport } from "@/lib/execution/transport";
import { canExecute } from "@/lib/emergency";

export async function executeAction(
  actionId: string,
): Promise<{ ok: true; status: ActionStatus } | { error: string }> {
  const action = await getActionById(actionId);
  if (!action) return { error: "La acción no existe." };

  // Verifica el estado antes de gastar el envío.
  const guard = applyExecutionResult(action.status, { ok: true });
  if ("error" in guard) return guard;

  const org = await prisma.organization.findUnique({
    where: { id: action.organizationId },
    select: { emergencyStop: true },
  });
  if (org && !canExecute(org.emergencyStop)) {
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
  const result = message.to
    ? await transport.send(message)
    : { ok: false, error: "El email no tiene destinatario (payload.to)." };
  const final = applyExecutionResult(action.status, result);
  if ("error" in final) return final;

  const succeeded = final.status === "executed";

  const persisted = await prisma.$transaction(async (tx) => {
    const res = await tx.agentAction.updateMany({
      where: { id: actionId, status: { in: ["allowed", "approved"] } },
      data: {
        status: final.status,
        executedAt: succeeded ? new Date() : null,
      },
    });
    if (res.count === 0) return false;

    await tx.integrationLog.create({
      data: {
        actionId,
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
        actionId,
        eventType: succeeded ? "action_executed" : "action_failed",
        message: succeeded
          ? "Acción ejecutada contra la herramienta."
          : "La ejecución de la acción falló.",
        metadata: { transport: transport.name },
      },
    });
    return true;
  });
  if (!persisted) {
    return { error: "La acción ya fue procesada por otra ejecución." };
  }

  return { ok: true, status: final.status };
}
