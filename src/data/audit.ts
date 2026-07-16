/**
 * Repositorio de auditoría: traduce filas de Prisma a la `AuditEvent` de
 * dominio. No confundir con `src/lib/audit.ts` (orden/filtro puro sobre
 * `AuditEvent[]`, usado dentro de `AuditTimeline`).
 */
import { prisma } from "@/lib/prisma";
import type { AuditEvent as PrismaAuditEvent } from "@/generated/prisma/client";
import type { AuditEvent } from "@/domain";

/** Traduce una fila `AuditEvent` de Prisma a la `AuditEvent` de dominio. */
export function mapAuditEvent(row: PrismaAuditEvent): AuditEvent {
  return {
    id: row.id,
    organizationId: row.organizationId,
    actorUserId: row.actorUserId,
    agentId: row.agentId,
    actionId: row.actionId,
    eventType: row.eventType,
    message: row.message,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Todos los eventos de auditoría de la organización. */
export async function getAuditEvents(): Promise<AuditEvent[]> {
  const rows = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapAuditEvent);
}

/** Busca un evento de auditoría por id directamente en BD; `undefined` si no existe. */
export async function getAuditEventById(
  id: string,
): Promise<AuditEvent | undefined> {
  const row = await prisma.auditEvent.findUnique({ where: { id } });
  return row ? mapAuditEvent(row) : undefined;
}
