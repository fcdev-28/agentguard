import "server-only";

/**
 * I/O de API keys de agente contra BD. La autenticación identifica al agente
 * por el hash de su key (nunca compara el secreto en claro) y descarta las
 * revocadas. `createAgentKey` devuelve el secreto en claro una única vez.
 */
import { prisma } from "@/lib/prisma";
import {
  generateApiKeyToken,
  hashApiKey,
  parseBearer,
} from "@/lib/auth/agent-keys";

/** Crea y persiste una API key para un agente; devuelve el secreto una sola vez. */
export async function createAgentKey(
  agentId: string,
): Promise<{ token: string; prefix: string }> {
  const { token, prefix, keyHash } = generateApiKeyToken();
  await prisma.agentApiKey.create({ data: { agentId, prefix, keyHash } });
  return { token, prefix };
}

/**
 * Autentica una petición de agente por su header `Authorization`. Devuelve el
 * agente y su organización, o `null` si el token falta, no casa o está revocado.
 */
export async function authenticateAgent(
  header: string | null,
): Promise<{ agentId: string; organizationId: string } | null> {
  const token = parseBearer(header);
  if (!token) return null;

  const key = await prisma.agentApiKey.findUnique({
    where: { keyHash: hashApiKey(token) },
    include: { agent: { select: { id: true, organizationId: true } } },
  });
  if (!key || key.revokedAt) return null;

  await prisma.agentApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    agentId: key.agent.id,
    organizationId: key.agent.organizationId,
  };
}
