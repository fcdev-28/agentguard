"use server";

/**
 * Server actions de runtime: parada de emergencia global y pausar/reanudar
 * agente. Sustituyen al store efímero `runtime-store.tsx`: cada mutación
 * persiste en `Organization`/`Agent` y deja constancia real en `AuditEvent`.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session-db";

/** Resultado uniforme de una mutación: éxito o motivo por el que no procede. */
type ActionResult = { ok: true } | { error: string };

/** Revalida el layout raíz: el banner de parada y la paleta de comandos leen el estado desde ahí. */
function revalidateEmergencyStop(): void {
  revalidatePath("/", "layout");
}

/** Revalida las pantallas de agentes tras un cambio de estado. */
function revalidateAgents(): void {
  revalidatePath("/agents");
  revalidatePath("/agents/[agentId]", "page");
}

/** Activa la parada de emergencia de la organización. */
export async function engageEmergencyStop(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "No autenticado." };
  }

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        emergencyStop: true,
        emergencyStopById: user.id,
        emergencyStopAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        eventType: "emergency_stop_engaged",
        message: "Parada de emergencia activada.",
        metadata: {},
      },
    }),
  ]);

  revalidateEmergencyStop();
  return { ok: true };
}

/** Libera la parada de emergencia de la organización. */
export async function releaseEmergencyStop(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "No autenticado." };
  }

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        emergencyStop: false,
        emergencyStopById: null,
        emergencyStopAt: null,
      },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        eventType: "emergency_stop_released",
        message: "Parada de emergencia desactivada.",
        metadata: {},
      },
    }),
  ]);

  revalidateEmergencyStop();
  return { ok: true };
}

/** Pausa un agente: bloquea nuevas ejecuciones hasta que se reanude explícitamente. */
export async function pauseAgent(agentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "No autenticado." };
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { name: true },
  });
  if (!agent) {
    return { error: "El agente no existe." };
  }

  await prisma.$transaction([
    prisma.agent.update({
      where: { id: agentId },
      data: { status: "paused" },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        agentId,
        eventType: "agent_paused",
        message: `${agent.name} pausado.`,
        metadata: {},
      },
    }),
  ]);

  revalidateAgents();
  return { ok: true };
}

/** Reanuda un agente pausado. */
export async function resumeAgent(agentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "No autenticado." };
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { name: true },
  });
  if (!agent) {
    return { error: "El agente no existe." };
  }

  await prisma.$transaction([
    prisma.agent.update({
      where: { id: agentId },
      data: { status: "active" },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        agentId,
        eventType: "agent_resumed",
        message: `${agent.name} reanudado.`,
        metadata: {},
      },
    }),
  ]);

  revalidateAgents();
  return { ok: true };
}
