/**
 * Lógica pura de ejecución de acciones: qué mensaje de email produce una acción
 * y a qué estado transiciona según el resultado del envío. Sin I/O (el envío
 * real y la persistencia viven en `execution/runner.ts`). Solo se ejecutan
 * acciones que ya pasaron el control: `allowed` (política permitió) o
 * `approved` (revisor aprobó).
 */
import type { ActionStatus, AgentAction } from "@/domain";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

const EXECUTABLE: ReadonlySet<ActionStatus> = new Set<ActionStatus>([
  "allowed",
  "approved",
]);

/** Construye el email a partir de la acción, con fallbacks al título/summary. */
export function toEmailMessage(action: AgentAction): EmailMessage {
  const p = action.payload;
  const str = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.trim().length > 0 ? v : fallback;
  return {
    to: str(p.to, ""),
    subject: str(p.subject, action.title),
    body: str(p.body, action.summary),
  };
}

/** Estado resultante de ejecutar, o motivo por el que no procede. */
export function applyExecutionResult(
  currentStatus: ActionStatus,
  result: SendResult,
): { status: ActionStatus } | { error: string } {
  if (!EXECUTABLE.has(currentStatus)) {
    return { error: "La acción no está en un estado ejecutable." };
  }
  return { status: result.ok ? "executed" : "failed" };
}
