import "server-only";

/**
 * Ejecuta una acción `allowed` o `approved` contra la herramienta real y
 * persiste el desenlace: estado (`executed`/`failed`), `IntegrationLog` como
 * evidencia y `AuditEvent`. Nunca deja la acción colgada: cualquier fallo del
 * transporte se registra como `failed` (reintentos = fase 13).
 */
import type { ActionStatus, ToolType } from "@/domain";
import { prisma } from "@/lib/prisma";
import { getActionById } from "@/data/actions";
import { applyExecutionResult, toEmailMessage } from "@/lib/execution";
import { resolveTransport } from "@/lib/execution/transport";

export async function executeAction(
  actionId: string,
): Promise<{ ok: true; status: ActionStatus } | { error: string }> {
  const action = await getActionById(actionId);
  if (!action) return { error: "La acción no existe." };

  // Verifica el estado antes de gastar el envío.
  const guard = applyExecutionResult(action.status, { ok: true });
  if ("error" in guard) return guard;

  const tool = await prisma.tool.findUnique({
    where: { id: action.toolId },
    select: { type: true },
  });

  const transport = resolveTransport();
  const result = await transport.send(toEmailMessage(action));
  const final = applyExecutionResult(action.status, result);
  if ("error" in final) return final;

  const succeeded = final.status === "executed";

  await prisma.$transaction([
    prisma.agentAction.update({
      where: { id: actionId },
      data: {
        status: final.status,
        executedAt: succeeded ? new Date() : null,
      },
    }),
    prisma.integrationLog.create({
      data: {
        actionId,
        toolType: (tool?.type ?? "email") as ToolType,
        transport: transport.name,
        status: succeeded ? "succeeded" : "failed",
        detail: succeeded
          ? (result.providerId ?? null)
          : (result.error ?? null),
      },
    }),
    prisma.auditEvent.create({
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
    }),
  ]);

  return { ok: true, status: final.status };
}
