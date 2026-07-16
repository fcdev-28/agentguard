"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Permission, PolicyEffect, Tool } from "@/domain";
import { policyEffectLabel } from "@/domain";
import { createPolicy } from "@/lib/policy-actions";
import { EFFECT_OPTIONS, scopeLabel, toolTypeLabel } from "./policy-detail";
import styles from "./policies.module.css";

/**
 * Formulario de creación de una política nueva (siempre nace en borrador).
 * Editor mínimo de condiciones: casillas para añadir herramienta, alcance e
 * importe máximo, los mismos campos que `PolicyDetail` sabe editar.
 */
export function PolicyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [effect, setEffect] = useState<PolicyEffect>("require_approval");
  const [approvalSlaMinutes, setApprovalSlaMinutes] = useState<number | null>(
    null,
  );
  const [includeTool, setIncludeTool] = useState(false);
  const [tool, setTool] = useState<Tool["type"]>("email");
  const [includeScope, setIncludeScope] = useState(false);
  const [scope, setScope] = useState<Permission["scope"]>("write");
  const [includeMaxAmount, setIncludeMaxAmount] = useState(false);
  const [maxAmount, setMaxAmount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const conditions = useMemo(() => {
    const result: Record<string, unknown> = {};
    if (includeTool) result.tool = tool;
    if (includeScope) result.scope = scope;
    if (includeMaxAmount) result.maxAmount = maxAmount;
    return result;
  }, [includeTool, tool, includeScope, scope, includeMaxAmount, maxAmount]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPolicy({
        name,
        description,
        effect,
        conditions,
        approvalSlaMinutes,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/policies/${result.id}`);
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="policy-name">
          Nombre
        </label>
        <input
          id="policy-name"
          type="text"
          className={styles.fieldInput}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="P. ej. Reembolsos por encima de 200 EUR"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="policy-description">
          Descripción
        </label>
        <textarea
          id="policy-description"
          className={styles.fieldInput}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Explica qué controla esta política y por qué."
        />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="policy-effect">
            Efecto
          </label>
          <select
            id="policy-effect"
            className={styles.fieldSelect}
            value={effect}
            onChange={(event) => setEffect(event.target.value as PolicyEffect)}
          >
            {EFFECT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {policyEffectLabel[value]}
              </option>
            ))}
          </select>
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
            value={approvalSlaMinutes ?? ""}
            placeholder="Sin SLA"
            onChange={(event) =>
              setApprovalSlaMinutes(
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
          <span className={styles.fieldHint}>
            Vacío = sin límite de tiempo para decidir.
          </span>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>
          <input
            type="checkbox"
            checked={includeTool}
            onChange={(event) => setIncludeTool(event.target.checked)}
          />{" "}
          Condición por herramienta
        </label>
        {includeTool ? (
          <select
            className={styles.fieldSelect}
            value={tool}
            onChange={(event) => setTool(event.target.value as Tool["type"])}
          >
            {Object.entries(toolTypeLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>
          <input
            type="checkbox"
            checked={includeScope}
            onChange={(event) => setIncludeScope(event.target.checked)}
          />{" "}
          Condición por alcance
        </label>
        {includeScope ? (
          <select
            className={styles.fieldSelect}
            value={scope}
            onChange={(event) =>
              setScope(event.target.value as Permission["scope"])
            }
          >
            {Object.entries(scopeLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>
          <input
            type="checkbox"
            checked={includeMaxAmount}
            onChange={(event) => setIncludeMaxAmount(event.target.checked)}
          />{" "}
          Condición por importe máximo
        </label>
        {includeMaxAmount ? (
          <input
            type="number"
            min={0}
            className={styles.fieldInput}
            value={maxAmount}
            onChange={(event) => setMaxAmount(Number(event.target.value))}
          />
        ) : null}
      </div>

      {error ? (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.formActions}>
        <Link href="/policies" className={styles.ghostButton}>
          Cancelar
        </Link>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={isPending}
        >
          {isPending ? "Creando…" : "Crear política"}
        </button>
      </div>
    </form>
  );
}
