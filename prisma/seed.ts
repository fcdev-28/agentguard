/**
 * Seed de AgentGuard: carga los datos de demo (src/data/demo-data.ts) en la
 * base de datos real. Idempotente: borra todo en orden inverso de FK antes
 * de insertar, para poder re-ejecutarse sin colisiones de PK/unique.
 *
 * Uso: npm run db:seed (invoca `prisma db seed`, configurado en prisma.config.ts).
 */
import "dotenv/config";
import { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import {
  organization,
  users,
  tools,
  agents,
  permissions,
  policies,
  actions,
  approvals,
  auditEvents,
  notifications,
  actionComments,
} from "../src/data/demo-data";

/** Convierte un ISO string (o null) a Date (o null) para los campos de Prisma. */
function toDate(iso: string | null): Date | null {
  return iso === null ? null : new Date(iso);
}

/** Convierte un objeto plano a un valor Json aceptado por Prisma (campo no nulo). */
function toJson(value: object): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Convierte un objeto plano (o null) a un valor Json aceptado por Prisma en
 * campos nulables: Prisma no admite el `null` de JS para SQL NULL en Json?,
 * hay que usar `Prisma.DbNull` explícitamente.
 */
function toNullableJson(
  value: object | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

async function main() {
  // Borrado en orden inverso de dependencias (hijos antes que padres).
  await prisma.actionComment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.agentAction.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Inserción en orden de dependencias (padres antes que hijos).
  // `organization.emergencyStopById` es null en la demo, así que no hace
  // falta un update posterior para resolver la referencia circular con User.
  await prisma.organization.create({
    data: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      emergencyStop: organization.emergencyStop,
      emergencyStopById: organization.emergencyStopById,
      emergencyStopAt: toDate(organization.emergencyStopAt),
      createdAt: toDate(organization.createdAt)!,
      updatedAt: toDate(organization.updatedAt)!,
    },
  });

  for (const user of users) {
    await prisma.user.create({
      data: {
        id: user.id,
        organizationId: user.organizationId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: toDate(user.createdAt)!,
        updatedAt: toDate(user.updatedAt)!,
      },
    });
  }

  for (const tool of tools) {
    await prisma.tool.create({
      data: {
        id: tool.id,
        organizationId: tool.organizationId,
        name: tool.name,
        type: tool.type,
        status: tool.status,
        riskLevel: tool.riskLevel,
        createdAt: toDate(tool.createdAt)!,
        updatedAt: toDate(tool.updatedAt)!,
      },
    });
  }

  for (const agent of agents) {
    await prisma.agent.create({
      data: {
        id: agent.id,
        organizationId: agent.organizationId,
        ownerId: agent.ownerId,
        name: agent.name,
        description: agent.description,
        environment: agent.environment,
        status: agent.status,
        mode: agent.mode,
        createdAt: toDate(agent.createdAt)!,
        updatedAt: toDate(agent.updatedAt)!,
      },
    });
  }

  for (const policy of policies) {
    await prisma.policy.create({
      data: {
        id: policy.id,
        organizationId: policy.organizationId,
        name: policy.name,
        description: policy.description,
        status: policy.status,
        version: policy.version,
        conditions: toJson(policy.conditions),
        effect: policy.effect,
        approvalSlaMinutes: policy.approvalSlaMinutes,
        createdById: policy.createdById,
        createdAt: toDate(policy.createdAt)!,
        updatedAt: toDate(policy.updatedAt)!,
        publishedAt: toDate(policy.publishedAt),
      },
    });
  }

  for (const permission of permissions) {
    await prisma.permission.create({
      data: {
        id: permission.id,
        agentId: permission.agentId,
        toolId: permission.toolId,
        scope: permission.scope,
        status: permission.status,
        createdAt: toDate(permission.createdAt)!,
        updatedAt: toDate(permission.updatedAt)!,
      },
    });
  }

  for (const action of actions) {
    await prisma.agentAction.create({
      data: {
        id: action.id,
        organizationId: action.organizationId,
        agentId: action.agentId,
        toolId: action.toolId,
        policyId: action.policyId,
        title: action.title,
        summary: action.summary,
        actionType: action.actionType,
        status: action.status,
        riskLevel: action.riskLevel,
        payload: toJson(action.payload),
        policyResult: toNullableJson(action.policyResult),
        approvalDueAt: toDate(action.approvalDueAt),
        createdAt: toDate(action.createdAt)!,
        updatedAt: toDate(action.updatedAt)!,
        executedAt: toDate(action.executedAt),
      },
    });
  }

  for (const approval of approvals) {
    await prisma.approval.create({
      data: {
        id: approval.id,
        actionId: approval.actionId,
        reviewerId: approval.reviewerId,
        decision: approval.decision,
        reason: approval.reason,
        createdAt: toDate(approval.createdAt)!,
      },
    });
  }

  for (const auditEvent of auditEvents) {
    await prisma.auditEvent.create({
      data: {
        id: auditEvent.id,
        organizationId: auditEvent.organizationId,
        actorUserId: auditEvent.actorUserId,
        agentId: auditEvent.agentId,
        actionId: auditEvent.actionId,
        eventType: auditEvent.eventType,
        message: auditEvent.message,
        metadata: toJson(auditEvent.metadata),
        createdAt: toDate(auditEvent.createdAt)!,
      },
    });
  }

  for (const notification of notifications) {
    await prisma.notification.create({
      data: {
        id: notification.id,
        organizationId: notification.organizationId,
        userId: notification.userId,
        type: notification.type,
        actionId: notification.actionId,
        message: notification.message,
        readAt: toDate(notification.readAt),
        createdAt: toDate(notification.createdAt)!,
      },
    });
  }

  for (const comment of actionComments) {
    await prisma.actionComment.create({
      data: {
        id: comment.id,
        actionId: comment.actionId,
        authorId: comment.authorId,
        body: comment.body,
        createdAt: toDate(comment.createdAt)!,
      },
    });
  }

  console.log("Seed completado.");
}

main()
  .catch((error) => {
    console.error("Error en el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
