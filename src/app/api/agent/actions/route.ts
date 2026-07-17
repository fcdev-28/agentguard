/**
 * Ingesta de acciones de agente. Autentica por API key, valida el contrato,
 * evalúa las políticas activas de la org y persiste la acción con el estado
 * resultante. Si la política la permite (`allowed`), se ejecuta de inmediato.
 * Idempotente por `(agentId, externalId)`.
 */
import { NextResponse } from "next/server";
import type { AgentAction } from "@/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { authenticateAgent } from "@/lib/auth/agent-keys-db";
import { validateIngestInput } from "@/lib/ingest/contract";
import { effectToStatus } from "@/lib/ingest/status";
import { evaluatePolicy } from "@/lib/policy-eval";
import { computeApprovalDueAt } from "@/lib/sla";
import { executeAction } from "@/lib/execution/runner";
import { getPolicies } from "@/data/policies";
import { getTools } from "@/data/tools";
import { getAgents } from "@/data/agents";
import { getPermissions } from "@/data/permissions";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateAgent(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 422 });
  }

  const parsed = validateIngestInput(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }
  const input = parsed.value;

  const [tools, agents, permissions, policies] = await Promise.all([
    getTools(),
    getAgents(),
    getPermissions(),
    getPolicies(),
  ]);

  const tool = tools.find(
    (t) => t.id === input.toolId && t.organizationId === auth.organizationId,
  );
  if (!tool) {
    return NextResponse.json(
      { error: "toolId no pertenece a la organización." },
      { status: 422 },
    );
  }

  // Acción candidata (sin persistir) para evaluar políticas.
  const now = new Date().toISOString();
  const candidate: AgentAction = {
    id: "pending",
    organizationId: auth.organizationId,
    agentId: auth.agentId,
    toolId: input.toolId,
    policyId: null,
    title: input.title,
    summary: input.summary,
    actionType: input.actionType,
    status: "proposed",
    riskLevel: input.riskLevel ?? tool.riskLevel,
    payload: input.payload,
    policyResult: null,
    approvalDueAt: null,
    createdAt: now,
    updatedAt: now,
    executedAt: null,
  };

  const evaluation = evaluatePolicy(candidate, policies, {
    tools,
    agents,
    permissions,
  });
  const status = effectToStatus(evaluation.effect);

  const slaMinutes =
    evaluation.policyId != null
      ? (policies.find((p) => p.id === evaluation.policyId)
          ?.approvalSlaMinutes ?? null)
      : null;
  const approvalDueAt =
    status === "needs_approval" ? computeApprovalDueAt(now, slaMinutes) : null;

  let created;
  try {
    created = await prisma.agentAction.create({
      data: {
        organizationId: auth.organizationId,
        agentId: auth.agentId,
        toolId: input.toolId,
        policyId: evaluation.policyId,
        title: input.title,
        summary: input.summary,
        actionType: input.actionType,
        status,
        riskLevel: candidate.riskLevel,
        payload: input.payload as Prisma.InputJsonValue,
        policyResult: { effect: evaluation.effect, reason: evaluation.reason },
        approvalDueAt: approvalDueAt ? new Date(approvalDueAt) : null,
        externalId: input.externalId ?? null,
      },
    });
  } catch {
    // Colisión del unique (agentId, externalId): reintento idempotente.
    return NextResponse.json(
      { error: "Acción duplicada (externalId ya registrado)." },
      { status: 409 },
    );
  }

  await prisma.auditEvent.create({
    data: {
      organizationId: auth.organizationId,
      agentId: auth.agentId,
      actionId: created.id,
      eventType: status === "blocked" ? "action_blocked" : "action_proposed",
      message: `Acción ingerida: ${evaluation.reason}`,
      metadata: { effect: evaluation.effect },
    },
  });

  if (status === "allowed") {
    await executeAction(created.id);
  }

  const fresh = await prisma.agentAction.findUnique({
    where: { id: created.id },
    select: { status: true },
  });
  return NextResponse.json(
    { actionId: created.id, status: fresh?.status ?? status },
    { status: 201 },
  );
}
