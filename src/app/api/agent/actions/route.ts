/**
 * Ingesta de acciones de agente. Autentica por API key, valida el contrato,
 * evalúa las políticas activas de la org y persiste la acción con el estado
 * resultante. Si la política la permite (`allowed`), se ejecuta de inmediato.
 * Idempotente por `(agentId, externalId)`.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { AgentAction } from "@/domain";
import { prisma } from "@/lib/prisma";
import { logger, metric } from "@/lib/observability/logger";
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
  const requestId = randomUUID();
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

  // Acotamos todo a la org del token: los repositorios de src/data hacen
  // findMany sin filtrar por organización (deuda single-tenant), así que
  // filtramos aquí antes de evaluar políticas para evitar contaminación
  // cross-org.
  const orgTools = tools.filter(
    (t) => t.organizationId === auth.organizationId,
  );
  const orgAgents = agents.filter(
    (a) => a.organizationId === auth.organizationId,
  );
  const orgAgentIds = new Set(orgAgents.map((a) => a.id));
  const orgPermissions = permissions.filter((p) => orgAgentIds.has(p.agentId));
  const orgPolicies = policies.filter(
    (p) => p.organizationId === auth.organizationId,
  );

  const tool = orgTools.find((t) => t.id === input.toolId);
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

  const evaluation = evaluatePolicy(candidate, orgPolicies, {
    tools: orgTools,
    agents: orgAgents,
    permissions: orgPermissions,
  });
  const status = effectToStatus(evaluation.effect);

  const slaMinutes =
    evaluation.policyId != null
      ? (orgPolicies.find((p) => p.id === evaluation.policyId)
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
  } catch (err) {
    // Colisión del unique (agentId, externalId): reintento idempotente.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Acción duplicada (externalId ya registrado)." },
        { status: 409 },
      );
    }
    throw err;
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

  metric("action.ingested", {
    organizationId: auth.organizationId,
    agentId: auth.agentId,
    status,
    effect: evaluation.effect,
  });

  if (status === "allowed") {
    try {
      await executeAction(created.id);
    } catch (err) {
      logger.error("Fallo al ejecutar la acción tras la ingesta", {
        requestId,
        actionId: created.id,
        err: String(err),
      });
    }
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
