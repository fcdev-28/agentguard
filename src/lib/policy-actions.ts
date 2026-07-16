"use server";

/**
 * Server actions de escritura de `/policies`: crear, editar, publicar y
 * archivar. Envuelven la lógica pura de `@/lib/policies` (`validatePolicyInput`,
 * `nextPolicyStatus`) — no la duplican. Sustituyen a la edición efímera que
 * tenía `PolicyDetail`: el servidor pasa a ser la única fuente de verdad.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, getCurrentOrganization } from "@/lib/session-db";
import {
  validatePolicyInput,
  nextPolicyStatus,
  type PolicyInput,
} from "@/lib/policies";

/** Resultado uniforme de una mutación: éxito o motivo por el que no procede. */
type ActionResult = { ok: true } | { error: string };

/** Revalida el listado y el detalle de políticas tras cualquier mutación. */
function revalidatePolicies(): void {
  revalidatePath("/policies");
  revalidatePath("/policies/[policyId]", "page");
}

/** Crea una política nueva en borrador. Devuelve su id para redirigir al detalle. */
export async function createPolicy(
  input: PolicyInput,
): Promise<{ ok: true; id: string } | { error: string }> {
  const validation = validatePolicyInput(input);
  if ("error" in validation) {
    return validation;
  }

  const user = await getCurrentUser();
  const organization = await getCurrentOrganization();
  if (!user || !organization) {
    return { error: "No autenticado." };
  }

  const policy = await prisma.policy.create({
    data: {
      organizationId: organization.id,
      name: input.name.trim(),
      description: input.description.trim(),
      status: "draft",
      version: 1,
      conditions: input.conditions as Prisma.InputJsonValue,
      effect: input.effect,
      approvalSlaMinutes: input.approvalSlaMinutes,
      createdById: user.id,
    },
  });

  revalidatePath("/policies");
  return { ok: true, id: policy.id };
}

/** Actualiza nombre, descripción, condiciones, efecto y SLA de una política existente. */
export async function updatePolicy(
  id: string,
  patch: PolicyInput,
): Promise<ActionResult> {
  const policy = await prisma.policy.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!policy) {
    return { error: "La política no existe." };
  }

  const validation = validatePolicyInput(patch);
  if ("error" in validation) {
    return validation;
  }

  await prisma.policy.update({
    where: { id },
    data: {
      name: patch.name.trim(),
      description: patch.description.trim(),
      effect: patch.effect,
      conditions: patch.conditions as Prisma.InputJsonValue,
      approvalSlaMinutes: patch.approvalSlaMinutes,
    },
  });

  revalidatePolicies();
  return { ok: true };
}

/** Publica una política en borrador: pasa a activa y fija `publishedAt`. */
export async function publishPolicy(id: string): Promise<ActionResult> {
  const policy = await prisma.policy.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!policy) {
    return { error: "La política no existe." };
  }

  const result = nextPolicyStatus(policy.status, "publish");
  if ("error" in result) {
    return result;
  }

  await prisma.policy.update({
    where: { id },
    data: { status: result.status, publishedAt: result.publishedAt },
  });

  revalidatePolicies();
  return { ok: true };
}

/** Archiva una política en borrador o activa. */
export async function archivePolicy(id: string): Promise<ActionResult> {
  const policy = await prisma.policy.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!policy) {
    return { error: "La política no existe." };
  }

  const result = nextPolicyStatus(policy.status, "archive");
  if ("error" in result) {
    return result;
  }

  await prisma.policy.update({
    where: { id },
    data: { status: result.status },
  });

  revalidatePolicies();
  return { ok: true };
}
