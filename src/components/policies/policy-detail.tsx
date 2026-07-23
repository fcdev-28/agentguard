"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type {
  Agent,
  AgentAction,
  Permission,
  Policy,
  PolicyEffect,
  Tool,
} from "@/domain";
import { policyEffectLabel } from "@/domain";
import { EmptyState } from "@/components/feedback/empty-state";
import { RiskBadge } from "@/components/data-display/risk-badge";
import { Select } from "@/components/forms/select";
import { getAffectedActions } from "@/lib/policies";
import { formatRelativeTime } from "@/lib/format";
import {
  archivePolicy,
  publishPolicy,
  updatePolicy,
} from "@/lib/policy-actions";
import {
  policyStatusClass,
  policyStatusLabel,
  policyEffectClass,
} from "./policies-style";
import styles from "./policies.module.css";

/** Etiqueta visible en castellano para cada tipo de herramienta (editor de condición `tool`). */
export const toolTypeLabel: Record<Tool["type"], string> = {
  email: "Email",
  crm: "CRM",
  billing: "Facturación",
  tasks: "Tareas",
};

/** Etiqueta visible en castellano para cada alcance de permiso (editor de condición `scope`). */
export const scopeLabel: Record<Permission["scope"], string> = {
  read: "Lectura",
  draft: "Borrador",
  write: "Escritura",
  execute: "Ejecución",
};

/** Orden fijo de efectos para el selector, de menos a más severo. */
export const EFFECT_OPTIONS: PolicyEffect[] = [
  "allow",
  "require_approval",
  "escalate",
  "block",
];

/** Copia editable de los campos de una política que admite la "edición simple". */
interface EditableFields {
  conditions: Record<string, unknown>;
  effect: PolicyEffect;
  approvalSlaMinutes: number | null;
}

/** Representación legible de un valor de condición, para el resumen de solo lectura. */
function formatConditionValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "sí" : "no";
  return String(value);
}

/**
 * Detalle y edición simple de una política: cabecera con su estado y
 * versión, editor de las condiciones que ya tiene definidas (permisos por
 * herramienta, umbral de importe, efecto y SLA de aprobación) y una
 * previsualización en vivo de las acciones recientes a las que afectaría.
 * "Guardar cambios" persiste la edición; "Publicar"/"Archivar" cambian el
 * estado. El servidor es la única fuente de verdad: el éxito se refleja al
 * revalidar, no se revierte el formulario ante un error.
 */
export function PolicyDetail({
  policy,
  actions,
  tools,
  agents,
  permissions,
  canWrite,
  canPublish,
}: {
  policy: Policy;
  actions: AgentAction[];
  tools: Tool[];
  agents: Agent[];
  permissions: Permission[];
  canWrite: boolean;
  canPublish: boolean;
}) {
  const [edited, setEdited] = useState<EditableFields>({
    conditions: policy.conditions,
    effect: policy.effect,
    approvalSlaMinutes: policy.approvalSlaMinutes,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    edited.effect !== policy.effect ||
    edited.approvalSlaMinutes !== policy.approvalSlaMinutes ||
    JSON.stringify(edited.conditions) !== JSON.stringify(policy.conditions);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updatePolicy(policy.id, {
        name: policy.name,
        description: policy.description,
        effect: edited.effect,
        conditions: edited.conditions,
        approvalSlaMinutes: edited.approvalSlaMinutes,
      });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishPolicy(policy.id);
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archivePolicy(policy.id);
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  const hasToolCondition = "tool" in policy.conditions;
  const hasScopeCondition = "scope" in policy.conditions;
  const hasMaxAmountCondition = "maxAmount" in policy.conditions;
  const hasToolEditor = hasToolCondition || hasScopeCondition;

  function setCondition(key: string, value: unknown) {
    setEdited((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, [key]: value },
    }));
  }

  const previewPolicy = useMemo<Policy>(
    () => ({
      ...policy,
      conditions: edited.conditions,
      effect: edited.effect,
      approvalSlaMinutes: edited.approvalSlaMinutes,
    }),
    [policy, edited],
  );

  const affected = useMemo(
    () =>
      getAffectedActions(
        previewPolicy,
        actions,
        { tools, agents, permissions },
        8,
      ),
    [previewPolicy, actions, tools, agents, permissions],
  );

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  return (
    <div>
      <div className={styles.detailHead}>
        <span
          className={`${styles.statusBadge} ${policyStatusClass[policy.status]}`}
        >
          {policyStatusLabel[policy.status]}
        </span>
        <span
          className={`${styles.effectBadge} ${policyEffectClass[policy.effect]}`}
        >
          {policyEffectLabel[policy.effect]}
        </span>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          Versión: <strong>v{policy.version}</strong>
        </span>
        <span className={styles.metaItem}>
          Creada: <strong>{formatRelativeTime(policy.createdAt)}</strong>
        </span>
        <span className={styles.metaItem}>
          Actualizada: <strong>{formatRelativeTime(policy.updatedAt)}</strong>
        </span>
        <span className={styles.metaItem}>
          Publicada:{" "}
          <strong>
            {policy.publishedAt
              ? formatRelativeTime(policy.publishedAt)
              : "Sin publicar"}
          </strong>
        </span>
      </div>

      <div className={styles.actionsBar}>
        {canWrite ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={isPending || !hasChanges}
          >
            Guardar cambios
          </button>
        ) : null}
        {canPublish && policy.status === "draft" ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handlePublish}
            disabled={isPending}
          >
            Publicar
          </button>
        ) : null}
        {canWrite &&
        (policy.status === "draft" || policy.status === "active") ? (
          <button
            type="button"
            className={styles.ghostButton}
            onClick={handleArchive}
            disabled={isPending}
          >
            Archivar
          </button>
        ) : null}
      </div>
      {error ? (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Condiciones</h2>
        <div className={styles.editorPanel}>
          {hasToolEditor ? (
            <div className={styles.fieldRow}>
              {hasToolCondition ? (
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="condition-tool">
                    Herramienta
                  </label>
                  <Select
                    id="condition-tool"
                    value={String(edited.conditions.tool ?? "")}
                    onChange={(value) => setCondition("tool", value)}
                    options={Object.entries(toolTypeLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </div>
              ) : null}
              {hasScopeCondition ? (
                <div className={styles.field}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor="condition-scope"
                  >
                    Alcance
                  </label>
                  <Select
                    id="condition-scope"
                    value={String(edited.conditions.scope ?? "")}
                    onChange={(value) => setCondition("scope", value)}
                    options={Object.entries(scopeLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {hasMaxAmountCondition ? (
            <div className={styles.field}>
              <label
                className={styles.fieldLabel}
                htmlFor="condition-max-amount"
              >
                Importe máximo sin aprobación (EUR)
              </label>
              <input
                id="condition-max-amount"
                type="number"
                min={0}
                className={styles.fieldInput}
                value={Number(edited.conditions.maxAmount ?? 0)}
                onChange={(event) =>
                  setCondition("maxAmount", Number(event.target.value))
                }
              />
              <span className={styles.fieldHint}>
                Se aplica a acciones con importe superior a este umbral.
              </span>
            </div>
          ) : null}

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="policy-effect">
                Efecto
              </label>
              <Select
                id="policy-effect"
                value={edited.effect}
                onChange={(value) =>
                  setEdited((prev) => ({
                    ...prev,
                    effect: value as PolicyEffect,
                  }))
                }
                options={EFFECT_OPTIONS.map((value) => ({
                  value,
                  label: policyEffectLabel[value],
                }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="policy-sla">
                SLA de aprobación (minutos)
              </label>
              <input
                id="policy-sla"
                type="number"
                min={0}
                className={styles.fieldInput}
                value={edited.approvalSlaMinutes ?? ""}
                placeholder="Sin SLA"
                onChange={(event) =>
                  setEdited((prev) => ({
                    ...prev,
                    approvalSlaMinutes:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  }))
                }
              />
              <span className={styles.fieldHint}>
                Vacío = sin límite de tiempo para decidir.
              </span>
            </div>
          </div>

          {Object.keys(policy.conditions).length > 0 ? (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                Resto de condiciones (no editables aquí)
              </span>
              <span className={styles.fieldHint}>
                {Object.entries(policy.conditions)
                  .filter(
                    ([key]) => !["tool", "scope", "maxAmount"].includes(key),
                  )
                  .map(
                    ([key, value]) => `${key}: ${formatConditionValue(value)}`,
                  )
                  .join(" · ") || "—"}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Acciones afectadas</h2>
        {affected.length === 0 ? (
          <EmptyState
            title="Ninguna acción reciente casa con esta política."
            hint="Ajusta las condiciones para ver qué acciones se verían afectadas."
          />
        ) : (
          <div className={styles.panel}>
            {affected.map((action) => (
              <Link
                key={action.id}
                href={`/review/${action.id}`}
                className={styles.panelRow}
              >
                <div className={styles.panelRowMain}>
                  <span className={styles.panelRowTitle}>{action.title}</span>
                  <span className={styles.panelRowMeta}>
                    {agentName(action.agentId)} ·{" "}
                    {formatRelativeTime(action.createdAt)}
                  </span>
                </div>
                <div className={styles.panelRowAside}>
                  <RiskBadge level={action.riskLevel} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
