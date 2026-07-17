/**
 * Contrato de ingesta de acciones de agente: valida el body de
 * `POST /api/agent/actions` antes de tocar BD. Fail-closed — cualquier campo
 * ausente o con valor no reconocido rechaza la acción entera. Validación manual
 * (sin dependencia nueva), mismo estilo que `auth/credentials.ts`.
 */
import type { ActionType, RiskLevel } from "@/domain";

const ACTION_TYPES: ReadonlySet<string> = new Set<ActionType>([
  "send_email",
  "update_record",
  "issue_refund",
  "create_task",
  "change_permission",
]);

const RISK_LEVELS: ReadonlySet<string> = new Set<RiskLevel>([
  "low",
  "medium",
  "high",
  "critical",
]);

export interface IngestActionInput {
  actionType: ActionType;
  toolId: string;
  title: string;
  summary: string;
  riskLevel?: RiskLevel;
  payload: Record<string, unknown>;
  externalId?: string;
}

export type IngestValidation =
  | { ok: true; value: IngestActionInput }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Valida y normaliza el body de ingesta. */
export function validateIngestInput(raw: unknown): IngestValidation {
  if (!isRecord(raw)) {
    return { ok: false, error: "El cuerpo debe ser un objeto JSON." };
  }
  if (!nonEmptyString(raw.actionType) || !ACTION_TYPES.has(raw.actionType)) {
    return { ok: false, error: "actionType no reconocido." };
  }
  if (!nonEmptyString(raw.toolId)) {
    return { ok: false, error: "toolId es obligatorio." };
  }
  if (!nonEmptyString(raw.title)) {
    return { ok: false, error: "title es obligatorio." };
  }
  if (!nonEmptyString(raw.summary)) {
    return { ok: false, error: "summary es obligatorio." };
  }
  if (!isRecord(raw.payload)) {
    return { ok: false, error: "payload debe ser un objeto." };
  }
  if (raw.riskLevel !== undefined && !RISK_LEVELS.has(raw.riskLevel as string)) {
    return { ok: false, error: "riskLevel no válido." };
  }
  if (raw.externalId !== undefined && !nonEmptyString(raw.externalId)) {
    return {
      ok: false,
      error: "externalId, si se envía, no puede estar vacío.",
    };
  }

  return {
    ok: true,
    value: {
      actionType: raw.actionType as ActionType,
      toolId: raw.toolId,
      title: raw.title,
      summary: raw.summary,
      riskLevel: raw.riskLevel as RiskLevel | undefined,
      payload: raw.payload,
      externalId: raw.externalId as string | undefined,
    },
  };
}
